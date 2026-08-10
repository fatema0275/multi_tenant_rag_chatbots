"""
run.py — Development entrypoint for the SiteMind crawl service.

Usage:
    python run.py

This starts the Flask development server only.  In production / staging,
use a proper WSGI server (gunicorn) and start the Celery worker separately.

Start the Celery worker (in a separate terminal):
    celery -A crawl_service.celery_app worker --loglevel=info --concurrency=4

Redis must be running before either process starts:
    # With Docker:  docker run -p 6379:6379 redis:7-alpine
    # Or locally:   redis-server
"""

import sys, os
sys.path.insert(0, r"C:\Python312\lib\site-packages")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from crawl_service.app import create_app
from crawl_service.config import cfg

if __name__ == "__main__":
    app = create_app()
    app.run(
        host="0.0.0.0",
        port=cfg.FLASK_PORT,
        debug=cfg.DEBUG,
    )
