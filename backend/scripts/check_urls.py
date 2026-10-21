import os, psycopg2
from dotenv import dotenv_values

env = dotenv_values('backend/.env')
conn = psycopg2.connect(env['DATABASE_URL'])
cur = conn.cursor()
cur.execute("""
    SELECT DISTINCT page_url, page_title, count(*) 
    FROM document_chunks 
    WHERE site_id = '1ff03664-112f-4686-a40a-ce608fe9336b' 
    GROUP BY page_url, page_title;
""")
for r in cur.fetchall():
    print(r)
cur.close()
conn.close()
