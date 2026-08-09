"""
app.py — Flask application factory for the SiteMind crawl service.

Usage:
    from crawl_service.app import create_app
    app = create_app()
    app.run(port=cfg.FLASK_PORT, debug=cfg.DEBUG)
"""

from flask import Flask
from crawl_service.config import cfg


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.secret_key = cfg.FLASK_SECRET_KEY

    # ------------------------------------------------------------------ #
    # Register blueprints                                                  #
    # ------------------------------------------------------------------ #
    from crawl_service.routes.crawl import crawl_bp  # noqa: E402

    app.register_blueprint(crawl_bp)

    # ------------------------------------------------------------------ #
    # Health check                                                         #
    # ------------------------------------------------------------------ #
    @app.get("/health")
    def health():
        return {"status": "ok", "service": "sitemind-crawl-service"}

    return app
