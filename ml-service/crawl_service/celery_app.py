"""
celery_app.py — Celery application instance for the crawl service.

Import this module wherever you need the Celery instance:
    from crawl_service.celery_app import celery

Workers are started with:
    celery -A crawl_service.celery_app worker --loglevel=info --concurrency=4

Concurrency here refers to the number of *processes* (or threads) Celery
spawns across all jobs — not the intra-job worker pool, which is managed
separately inside crawl_task.py.
"""

from celery import Celery
from crawl_service.config import cfg


def make_celery() -> Celery:
    app = Celery(
        "crawl_service",
        broker=cfg.CELERY_BROKER_URL,
        backend=cfg.CELERY_RESULT_BACKEND,
        include=["crawl_service.tasks.crawl_task"],
    )

    app.conf.update(
        # Serialisation
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        # Timezone
        timezone="UTC",
        enable_utc=True,
        # Task behaviour
        task_acks_late=True,          # ack only after task completes
        worker_prefetch_multiplier=1, # one task at a time per worker process
        task_track_started=True,      # expose STARTED state in result backend
        # Result TTL — keep task results for 24 hours
        result_expires=86400,
        # Retry policy for broker connection issues
        broker_connection_retry_on_startup=True,
    )

    return app


celery = make_celery()
