import psycopg2, sys
from dotenv import dotenv_values
sys.stdout.reconfigure(encoding='utf-8')
env = dotenv_values('backend/.env')
conn = psycopg2.connect(env['DATABASE_URL'])
cur = conn.cursor()
cur.execute("""
    SELECT id, page_url, page_title, chunk_text 
    FROM document_chunks 
    WHERE site_id = '1ff03664-112f-4686-a40a-ce608fe9336b' 
    AND (chunk_text ILIKE '%pillar%' OR chunk_text ILIKE '%Full-Stack%' OR chunk_text ILIKE '%service%')
    LIMIT 20;
""")
rows = cur.fetchall()
print(f'Matches: {len(rows)}')
for r in rows:
    print(r[0], r[1], '|', r[2], '|', r[3][:120].replace('\n', ' '))
cur.close()
conn.close()
