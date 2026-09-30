import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from crawl_service.db.connection import get_db

def test_queries():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as u_count FROM users")
            print("Users count:", cur.fetchone())

            cur.execute("SELECT COUNT(*) as q_count FROM query_logs")
            print("Query logs count:", cur.fetchone())

            cur.execute("SELECT COUNT(*) as c_count FROM document_chunks")
            print("Chunks count:", cur.fetchone())

            cur.execute("SELECT COUNT(*) as p_count FROM pages")
            print("Pages count:", cur.fetchone())

            cur.execute("SELECT COUNT(*) as cj_count FROM crawl_jobs")
            print("Crawl jobs count:", cur.fetchone())

            # Test percentiles query
            cur.execute("""
                SELECT 
                    COALESCE(percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms), 0) as p50,
                    COALESCE(percentile_cont(0.90) WITHIN GROUP (ORDER BY latency_ms), 0) as p90,
                    COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms), 0) as p99
                FROM query_logs
            """)
            print("Percentiles:", cur.fetchone())

            # Test chunk token size approximation
            cur.execute("""
                SELECT 
                    CASE 
                        WHEN LENGTH(chunk_text)/4 < 100 THEN '< 100 tokens'
                        WHEN LENGTH(chunk_text)/4 BETWEEN 100 AND 149 THEN '100 - 150 tokens'
                        WHEN LENGTH(chunk_text)/4 BETWEEN 150 AND 199 THEN '150 - 200 tokens'
                        WHEN LENGTH(chunk_text)/4 BETWEEN 200 AND 249 THEN '200 - 250 tokens'
                        WHEN LENGTH(chunk_text)/4 BETWEEN 250 AND 299 THEN '250 - 300 tokens'
                        WHEN LENGTH(chunk_text)/4 BETWEEN 300 AND 349 THEN '300 - 350 tokens'
                        WHEN LENGTH(chunk_text)/4 BETWEEN 350 AND 399 THEN '350 - 400 tokens'
                        ELSE '> 400 tokens'
                    END as token_range,
                    COUNT(*) as count
                FROM document_chunks
                GROUP BY token_range
                ORDER BY count DESC
            """)
            print("Chunk size histogram:", cur.fetchall())

            # Test source types
            cur.execute("""
                SELECT COALESCE(source_type, 'html') as source_type, COUNT(*) as count
                FROM pages
                GROUP BY source_type
            """)
            print("Source types:", cur.fetchall())

test_queries()
print("All SQL queries executed successfully!")
