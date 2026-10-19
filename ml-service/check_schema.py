from crawl_service.db.connection import get_db

with get_db() as conn:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_schema, table_name, column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_name IN ('messages', 'feedback', 'chat_sessions')
            ORDER BY table_schema, table_name, ordinal_position
        """)
        for r in cur.fetchall():
            print(dict(r))
