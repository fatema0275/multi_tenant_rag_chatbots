"""
db/connection.py — Postgres connection module for SiteMind crawl service.

Supports both psycopg2 and pg8000 (pure-Python, zero C-compiler dependency).
Outputs dict-like cursor results (row["column_name"]).
"""

import logging
import ssl
from contextlib import contextmanager
from urllib.parse import urlparse
from typing import Optional, Any

from crawl_service.config import cfg

logger = logging.getLogger(__name__)

# Try psycopg2 first; fall back to pure-Python pg8000
USE_PSYCOPG2 = False
try:
    import psycopg2
    from psycopg2 import pool as pg_pool
    from psycopg2.extras import RealDictCursor
    USE_PSYCOPG2 = True
except ImportError:
    import pg8000.dbapi
    logger.info("psycopg2 not found — using pure-Python pg8000 driver")


class DictCursorWrapper:
    """
    Wrapper around pg8000 cursor to return RealDict-like rows (dict access).
    """
    def __init__(self, cursor):
        self._cur = cursor

    def execute(self, query: str, params: Optional[tuple | list] = None):
        if params is None:
            self._cur.execute(query)
        else:
            self._cur.execute(query, params)
        return self

    def _row_to_dict(self, row: Optional[tuple]) -> Optional[dict[str, Any]]:
        if row is None or not self._cur.description:
            return None
        colnames = [desc[0] for desc in self._cur.description]
        return dict(zip(colnames, row))

    def fetchone(self) -> Optional[dict[str, Any]]:
        row = self._cur.fetchone()
        return self._row_to_dict(row)

    def fetchall(self) -> list[dict[str, Any]]:
        rows = self._cur.fetchall()
        if not rows or not self._cur.description:
            return []
        colnames = [desc[0] for desc in self._cur.description]
        return [dict(zip(colnames, r)) for r in rows]

    def __getattr__(self, name):
        return getattr(self._cur, name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._cur.close()


class Pg8000ConnectionWrapper:
    """Wrapper to yield DictCursorWrapper for pg8000."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return DictCursorWrapper(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


_psycopg2_pool: Any = None

def _get_psycopg2_pool():
    global _psycopg2_pool
    if _psycopg2_pool is None or _psycopg2_pool.closed:
        _psycopg2_pool = pg_pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=cfg.DATABASE_URL,
            cursor_factory=RealDictCursor,
            sslmode="require",
        )
    return _psycopg2_pool


def _connect_pg8000():
    parsed = urlparse(cfg.DATABASE_URL)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    raw_conn = pg8000.dbapi.connect(
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip("/"),
        ssl_context=ctx,
    )
    return Pg8000ConnectionWrapper(raw_conn)


@contextmanager
def get_db():
    """
    Context manager yielding a Postgres connection (psycopg2 or pg8000).
    Automatically commits on clean exit, rolls back on exception, and closes/returns connection.
    """
    if USE_PSYCOPG2:
        pool = _get_psycopg2_pool()
        conn = pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            pool.putconn(conn)
    else:
        conn = _connect_pg8000()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
