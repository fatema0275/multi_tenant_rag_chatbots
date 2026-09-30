import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import jwt
from crawl_service.app import create_app
from crawl_service.db.connection import get_db

app = create_app()
client = app.test_client()

JWT_SECRET = os.getenv("JWT_SECRET", "sitemind-dev-secret-2026")

def run_tests():
    # 1. Find an admin user and a non-admin user
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1")
            admin_user = cur.fetchone()
            cur.execute("SELECT id, email, role FROM users WHERE role != 'admin' OR role IS NULL LIMIT 1")
            normal_user = cur.fetchone()

    print(f"Admin User: {admin_user}")
    print(f"Normal User: {normal_user}")

    if not admin_user:
        print("Creating or promoting admin user for test...")
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users LIMIT 1) RETURNING id, email, role")
                admin_user = cur.fetchone()
                conn.commit()

    admin_token = jwt.encode({"userId": admin_user["id"]}, JWT_SECRET, algorithm="HS256")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Test 1: Unauthenticated request should return 401
    res_401 = client.get("/api/admin/analytics/overview")
    print(f"Test 1 Unauth -> status: {res_401.status_code} (expect 401)")
    assert res_401.status_code == 401, f"Expected 401 got {res_401.status_code}"

    # Test 2: Non-admin request should return 403
    if normal_user:
        user_token = jwt.encode({"userId": normal_user["id"]}, JWT_SECRET, algorithm="HS256")
        res_403 = client.get("/api/admin/analytics/overview", headers={"Authorization": f"Bearer {user_token}"})
        print(f"Test 2 Non-admin -> status: {res_403.status_code} (expect 403)")
        assert res_403.status_code == 403, f"Expected 403 got {res_403.status_code}"

    # Test 3: /overview endpoint with admin token
    res_overview = client.get("/api/admin/analytics/overview?range=30d", headers=admin_headers)
    print(f"Test 3 /overview -> status: {res_overview.status_code}")
    assert res_overview.status_code == 200, f"Error: {res_overview.data}"
    overview_data = res_overview.get_json()
    print("Overview metrics sample:", overview_data["metrics"])
    print("Overview charts keys:", overview_data["charts"].keys())
    print("Overview feed count:", len(overview_data["activity_feed"]))

    # Test 4: /websites endpoint
    res_websites = client.get("/api/admin/analytics/websites?range=30d", headers=admin_headers)
    print(f"Test 4 /websites -> status: {res_websites.status_code}")
    assert res_websites.status_code == 200
    websites_data = res_websites.get_json()
    print(f"Websites count: {len(websites_data['websites'])}")

    # Test 5: /queries endpoint
    res_queries = client.get("/api/admin/analytics/queries?range=30d", headers=admin_headers)
    print(f"Test 5 /queries -> status: {res_queries.status_code}")
    assert res_queries.status_code == 200
    queries_data = res_queries.get_json()
    print(f"Top questions count: {len(queries_data['top_questions'])}")
    print(f"Verdict distribution: {queries_data['verdict_distribution']}")

    # Test 6: /users endpoint
    res_users = client.get("/api/admin/analytics/users?range=30d", headers=admin_headers)
    print(f"Test 6 /users -> status: {res_users.status_code}")
    assert res_users.status_code == 200
    users_data = res_users.get_json()
    print(f"Users metrics: {users_data['metrics']}")

    # Test 7: /performance endpoint
    res_perf = client.get("/api/admin/analytics/performance?range=30d", headers=admin_headers)
    print(f"Test 7 /performance -> status: {res_perf.status_code}")
    assert res_perf.status_code == 200
    perf_data = res_perf.get_json()
    print(f"Performance summary: {perf_data['status_summary']}")

    # Test 8: /content-quality endpoint
    res_cq = client.get("/api/admin/analytics/content-quality?range=30d", headers=admin_headers)
    print(f"Test 8 /content-quality -> status: {res_cq.status_code}")
    assert res_cq.status_code == 200
    cq_data = res_cq.get_json()
    print(f"Content gaps count: {len(cq_data['content_gaps'])}")
    print(f"Source breakdown: {cq_data['source_type_breakdown']}")

    print("\n✅ ALL 8 FLASK ADMIN ANALYTICS TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
