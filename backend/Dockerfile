FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# Run as a non-root user; /data holds the SQLite file when a volume is mounted.
RUN useradd --create-home appuser && mkdir /data && chown appuser /data /app
USER appuser

EXPOSE 8000

# Render injects PORT. --proxy-headers makes the rate limiter see the real client IP.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
