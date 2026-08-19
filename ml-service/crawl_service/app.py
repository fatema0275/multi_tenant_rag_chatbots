"""
app.py — Flask application factory for the SiteMind crawl & chatbot service.

Usage:
    from crawl_service.app import create_app
    app = create_app()
    app.run(port=cfg.FLASK_PORT, debug=cfg.DEBUG)
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from crawl_service.config import cfg

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)


def create_app() -> Flask:
    """Create and configure the Flask application."""
    static_folder = os.path.join(os.path.dirname(__file__), "static")
    app = Flask(__name__, static_folder=static_folder)
    app.secret_key = cfg.FLASK_SECRET_KEY

    # Initialize Flask-Limiter
    limiter.init_app(app)

    # ------------------------------------------------------------------ #
    # Rate Limiting Policies for Public Widget Endpoints (Module 4)       #
    # ------------------------------------------------------------------ #
    from crawl_service.routes.widget import get_public_widget_config, public_widget_query

    limiter.limit("120 per minute")(get_public_widget_config)
    limiter.limit("30 per minute")(public_widget_query)

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"error": "Too many requests, please wait"}), 429

    @app.errorhandler(404)
    def not_found_handler(e):
        return jsonify({"error": "Endpoint or resource not found"}), 404

    @app.errorhandler(500)
    def internal_error_handler(e):
        return jsonify({"error": "Internal server error in Python service"}), 500

    @app.errorhandler(Exception)
    def unhandled_exception_handler(e):
        return jsonify({"error": f"Python bridge error: {str(e)}"}), 500


    # ------------------------------------------------------------------ #
    # Register blueprints                                                  #
    # ------------------------------------------------------------------ #
    from crawl_service.routes.crawl import crawl_bp
    from crawl_service.routes.chatbot import chatbot_bp
    from crawl_service.routes.widget import widget_bp

    app.register_blueprint(crawl_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(widget_bp)

    # Static asset serving for widget-v1.js with long cache headers
    @app.get("/static/<path:filename>")
    def serve_static(filename):
        response = send_from_directory(app.static_folder, filename)
        if filename.endswith(".js"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    # ------------------------------------------------------------------ #
    # Health check                                                         #
    # ------------------------------------------------------------------ #
    @app.get("/health")
    def health():
        return {"status": "ok", "service": "sitemind-crawl-service"}

    return app
