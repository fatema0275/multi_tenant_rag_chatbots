# SiteMind Crawl Service — Makefile
# ============================================================
# Convenience targets for local development.
# Run `make help` to list all available commands.
# ============================================================

.PHONY: help install install-playwright redis worker flask dev lint test clean

# --- Python binary (override with: make flask PYTHON=python3.11) ----------- #
PYTHON ?= python
PIP    ?= pip

help:
	@echo ""
	@echo "SiteMind Crawl Service — dev commands"
	@echo "======================================"
	@echo "  make install            Install Python dependencies"
	@echo "  make install-playwright Install Playwright + Chromium browser"
	@echo "  make redis              Start Redis via Docker (port 6379)"
	@echo "  make worker             Start Celery worker (requires Redis)"
	@echo "  make flask              Start Flask dev server (requires Redis)"
	@echo "  make dev                Start both Flask + Celery worker in bg"
	@echo "  make test               Run unit tests"
	@echo "  make lint               Run ruff linter"
	@echo "  make clean              Remove __pycache__ dirs"
	@echo ""

install:
	$(PIP) install -r requirements-crawl.txt

install-playwright:
	$(PYTHON) -m playwright install chromium

redis:
	docker run --rm -p 6379:6379 redis:7-alpine

worker:
	celery -A crawl_service.celery_app worker --loglevel=info --concurrency=4

flask:
	$(PYTHON) run.py

dev:
	@echo "Starting Celery worker in background..."
	celery -A crawl_service.celery_app worker --loglevel=info --concurrency=4 --detach \
	    --logfile=celery.log --pidfile=celery.pid
	@echo "Starting Flask server..."
	$(PYTHON) run.py

lint:
	ruff check crawl_service/ run.py

test:
	$(PYTHON) -m pytest tests/ -v

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
