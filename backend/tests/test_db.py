"""Schema upgrade: a database created by the first release must keep working."""

from pathlib import Path

from sqlalchemy import create_engine, inspect, text

from app.db import Base, normalize_database_url, upgrade_saved_ideas


def test_upgrade_adds_owner_column_to_a_first_release_table(tmp_path: Path):
    engine = create_engine(f"sqlite:///{tmp_path}/old.db")
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE saved_ideas (id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "idea_id VARCHAR(64) NOT NULL, payload JSON NOT NULL, created_at DATETIME NOT NULL)"
            )
        )
        connection.execute(
            text("CREATE UNIQUE INDEX ix_saved_ideas_idea_id ON saved_ideas (idea_id)")
        )
        connection.execute(
            text("INSERT INTO saved_ideas (idea_id, payload, created_at) VALUES ('old', '{}', '2026-11-11')")
        )

    upgrade_saved_ideas(engine)
    upgrade_saved_ideas(engine)  # running it again must be harmless
    Base.metadata.create_all(engine)

    columns = {column["name"] for column in inspect(engine).get_columns("saved_ideas")}
    indexes = {index["name"] for index in inspect(engine).get_indexes("saved_ideas")}
    assert "owner_id" in columns
    assert indexes == {"uq_saved_ideas_owner_idea"}
    with engine.begin() as connection:
        # The old row survives, ownerless. Two browsers can now hold the same idea id.
        assert connection.execute(text("SELECT owner_id FROM saved_ideas")).scalar() is None
        for owner in ("browser-a", "browser-b"):
            connection.execute(
                text(
                    "INSERT INTO saved_ideas (owner_id, idea_id, payload, created_at) "
                    "VALUES (:owner, 'same', '{}', '2026-11-12')"
                ),
                {"owner": owner},
            )


def test_upgrade_does_nothing_on_an_empty_database(tmp_path: Path):
    engine = create_engine(f"sqlite:///{tmp_path}/new.db")
    upgrade_saved_ideas(engine)
    assert inspect(engine).get_table_names() == []


def test_postgres_urls_use_the_psycopg_driver():
    assert normalize_database_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_database_url("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_database_url("sqlite:///./x.db") == "sqlite:///./x.db"
