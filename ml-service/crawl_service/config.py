"""
config.py — Centralised, env-driven configuration for the crawl service.

All tuneable values live here so they can be overridden via environment
variables or the .env file without touching code.  Import this module
everywhere you need a setting; never call os.getenv() in business logic.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the ml-service root (one level up from this file)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)


class Config:
    # ------------------------------------------------------------------ #
    # Database                                                             #
    # ------------------------------------------------------------------ #
    DATABASE_URL: str = os.environ["DATABASE_URL"]
    # DIRECT_URL is used if you want to bypass PgBouncer for long txns.
    DIRECT_URL: str = os.getenv("DIRECT_URL", os.environ["DATABASE_URL"])

    # ------------------------------------------------------------------ #
    # Redis / Celery                                                       #
    # ------------------------------------------------------------------ #
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Celery broker + result backend both use Redis
    CELERY_BROKER_URL: str = REDIS_URL
    CELERY_RESULT_BACKEND: str = REDIS_URL

    # ------------------------------------------------------------------ #
    # Flask                                                                #
    # ------------------------------------------------------------------ #
    FLASK_SECRET_KEY: str = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    FLASK_PORT: int = int(os.getenv("FLASK_PORT", "8001"))
    DEBUG: bool = os.getenv("FLASK_ENV", "production") == "development"

    # ------------------------------------------------------------------ #
    # Crawl behaviour                                                      #
    # ------------------------------------------------------------------ #
    # Seconds to wait between requests to the same domain.
    REQUEST_DELAY: float = float(os.getenv("CRAWL_REQUEST_DELAY", "1.5"))

    # Hard ceiling on parallel threads inside one crawl job.
    MAX_WORKERS: int = int(os.getenv("CRAWL_MAX_WORKERS", "3"))

    # BFS traversal depth (applies only when sitemap is absent/empty).
    MAX_DEPTH: int = int(os.getenv("CRAWL_MAX_DEPTH", "2"))

    # Maximum URLs to process in a single crawl job (default 200, configurable).
    MAX_PAGES: int = int(os.getenv("CRAWL_MAX_PAGES", "200"))

    # Stall timeout: auto-terminate if no progress for 5 minutes (300 seconds).
    STALL_TIMEOUT: int = int(os.getenv("CRAWL_STALL_TIMEOUT", "300"))

    # Per-page HTTP request timeout in seconds.
    PAGE_TIMEOUT: int = int(os.getenv("CRAWL_PAGE_TIMEOUT", "15"))

    # Extracted-text character count below which Playwright is used.
    MIN_TEXT_LENGTH: int = int(os.getenv("CRAWL_MIN_TEXT_LENGTH", "200"))

    # Exponential backoff: base delay and number of retries for 403/429.
    RETRY_BACKOFF_BASE: float = 1.0   # seconds; doubled on each retry
    RETRY_MAX_ATTEMPTS: int = 3

    # ------------------------------------------------------------------ #
    # Identity                                                             #
    # ------------------------------------------------------------------ #
    USER_AGENT: str = os.getenv(
        "CRAWL_USER_AGENT",
        "SiteMind-Crawler/1.0 (+https://sitemind.ai/bot)"
    )

    # ------------------------------------------------------------------ #
    # Sitemap paths tried in order before falling back to BFS             #
    # ------------------------------------------------------------------ #
    SITEMAP_PATHS: list[str] = [
        "/sitemap_index.xml",
        "/sitemap.xml",
    ]


# Module-level singleton so callers can do `from crawl_service.config import cfg`
cfg = Config()
