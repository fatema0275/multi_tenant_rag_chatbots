"""
crawl_service — Flask + Celery website crawling service for SiteMind.

Package layout:
  crawl_service/
    config.py       — env-driven settings (single source of truth)
    celery_app.py   — Celery instance wired to Redis
    app.py          — Flask application factory
    routes/         — HTTP endpoints
    tasks/          — Celery task definitions
    crawler/        — Page discovery, fetching, rendering, extraction
    db/             — Postgres helpers (psycopg2, no ORM)
"""
