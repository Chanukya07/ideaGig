"""SQLAlchemy engine, session, and the saved-ideas table."""

from collections.abc import Iterator
from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import JSON, DateTime, Engine, Index, String, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


class SavedIdeaRow(Base):
    __tablename__ = "saved_ideas"
    # One copy of an idea per browser. The index also serves lookups by owner.
    __table_args__ = (Index("uq_saved_ideas_owner_idea", "owner_id", "idea_id", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Anonymous per-browser id from the X-Client-Id header. Null only on rows
    # written before owners existed; those rows are not visible to anyone.
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    idea_id: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


def normalize_database_url(url: str) -> str:
    """Point Postgres URLs (as Render and Heroku issue them) at the psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


@lru_cache
def get_engine() -> Engine:
    url = normalize_database_url(get_settings().database_url)
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def upgrade_saved_ideas(engine: Engine) -> None:
    """Bring a pre-owner `saved_ideas` table up to date. Safe to run every start.

    create_all() only creates missing tables, so the column and index added
    after the first release are applied here.
    """
    if "saved_ideas" not in inspect(engine).get_table_names():
        return
    columns = {column["name"] for column in inspect(engine).get_columns("saved_ideas")}
    if "owner_id" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE saved_ideas ADD COLUMN owner_id VARCHAR(64)"))
        # The old index made idea_id unique across all browsers.
        connection.execute(text("DROP INDEX IF EXISTS ix_saved_ideas_idea_id"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_ideas_owner_idea "
                "ON saved_ideas (owner_id, idea_id)"
            )
        )


def init_db() -> None:
    engine = get_engine()
    upgrade_saved_ideas(engine)
    Base.metadata.create_all(engine)


def get_db() -> Iterator[Session]:
    with _session_factory()() as session:
        yield session
