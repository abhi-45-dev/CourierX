import os
import sys
import unittest
from werkzeug.security import check_password_hash

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
from db import get_db_connection

class CourierXAuthTestSuite(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        app.config["WTF_CSRF_ENABLED"] = False
        self.client = app.test_client()

    def test_01_admin_login_success(self):
        """Verify default admin can log in with provisioned credentials."""
        res = self.client.post("/api/auth/login", json={
            "email": "admin@courierx.com",
            "password": "Admin@CourierX2026!"
        })
        self.assertEqual(res.status_code, 200, res.get_data(as_text=True))
        data = res.get_json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["role"], "Administrator")
        self.assertEqual(data["user"]["status"], "Active")

    def test_02_customer_registration_and_login(self):
        """Verify customer registration creates Customer record, hashes password, and auto-logs in."""
        test_email = "test.customer.auth@example.com"
        # Clean up any leftover test account
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM UserAccount WHERE email = %s", (test_email,))
        cur.execute("DELETE FROM Customer WHERE email = %s", (test_email,))
        conn.commit()
        cur.close()
        conn.close()

        # 1. Register customer
        res = self.client.post("/api/auth/register/customer", json={
            "name": "Jane Doe Tester",
            "email": test_email,
            "phone": "9876543211",
            "address": "42 Galaxy Way, Chennai, Tamil Nadu",
            "password": "CustomerSecure123!",
            "confirm_password": "CustomerSecure123!"
        })
        self.assertEqual(res.status_code, 201, res.get_data(as_text=True))
        data = res.get_json()
        self.assertEqual(data["user"]["role"], "Customer")
        self.assertEqual(data["user"]["status"], "Active")
        self.assertIsNotNone(data["user"]["customer_id"])

        # 2. Verify password hash in DB (not plaintext)
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT password_hash FROM UserAccount WHERE email = %s", (test_email,))
        row = cur.fetchone()
        self.assertIsNotNone(row)
        self.assertNotEqual(row["password_hash"], "CustomerSecure123!")
        self.assertTrue(check_password_hash(row["password_hash"], "CustomerSecure123!"))
        cur.close()
        conn.close()

        # 3. Duplicate registration must fail with 409
        dup_res = self.client.post("/api/auth/register/customer", json={
            "name": "Duplicate Tester",
            "email": test_email,
            "phone": "9876543211",
            "address": "42 Galaxy Way",
            "password": "CustomerSecure123!",
            "confirm_password": "CustomerSecure123!"
        })
        self.assertEqual(dup_res.status_code, 409)

        # 4. Login with correct password succeeds
        login_res = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "CustomerSecure123!"
        })
        self.assertEqual(login_res.status_code, 200)

        # 5. Login with invalid password fails
        bad_login = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword!"
        })
        self.assertEqual(bad_login.status_code, 401)

    def test_03_courier_registration_pending_approval(self):
        """Verify courier registration is Pending and blocked from logging in until approved."""
        test_email = "test.courier.driver@example.com"
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM UserAccount WHERE email = %s", (test_email,))
        conn.commit()
        cur.close()
        conn.close()

        # Find an active branch
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT branch_id FROM Branch WHERE status = 'Active' LIMIT 1")
        active_b = cur.fetchone()
        cur.close()
        conn.close()
        active_branch_id = active_b["branch_id"]

        res = self.client.post("/api/auth/register/courier", json={
            "name": "Speedy Courier Tester",
            "email": test_email,
            "phone": "9876543222",
            "branch_id": active_branch_id,
            "password": "CourierSecure123!",
            "confirm_password": "CourierSecure123!"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["status"], "Pending")

        # Attempt to login while pending -> must be 403 Forbidden
        login_pending = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "CourierSecure123!"
        })
        self.assertEqual(login_pending.status_code, 403)
        self.assertIn("pending", login_pending.get_json()["error"].lower())

    def test_04_authorization_boundaries(self):
        """Verify customer cannot access employee/vehicle routes or view other customers' private data."""
        # Log in as test customer
        test_email = "test.customer.auth@example.com"
        self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "CustomerSecure123!"
        })

        # 1. Access vehicles route -> 403 Forbidden
        veh_res = self.client.get("/api/vehicles")
        self.assertEqual(veh_res.status_code, 403)

        # 2. Access employees route -> 403 Forbidden
        emp_res = self.client.get("/api/employees")
        self.assertEqual(emp_res.status_code, 403)

        # 3. Access global customers directory -> 403 Forbidden
        cust_res = self.client.get("/api/customers")
        self.assertEqual(cust_res.status_code, 403)

        # 4. Access admin user management -> 403 Forbidden
        admin_res = self.client.get("/api/admin/users")
        self.assertEqual(admin_res.status_code, 403)

    def test_05_admin_approves_courier(self):
        """Verify admin can list users and approve pending courier."""
        # 1. Log in as admin
        self.client.post("/api/auth/login", json={
            "email": "admin@courierx.com",
            "password": "Admin@CourierX2026!"
        })

        # 2. List pending users
        users_res = self.client.get("/api/admin/users?status=Pending")
        self.assertEqual(users_res.status_code, 200)
        pending_users = users_res.get_json()
        courier_user = next((u for u in pending_users if u["email"] == "test.courier.driver@example.com"), None)
        self.assertIsNotNone(courier_user)

        # 3. Approve courier
        patch_res = self.client.patch(f"/api/admin/users/{courier_user['user_id']}/status", json={
            "status": "Active"
        })
        self.assertEqual(patch_res.status_code, 200)

        # 4. Now courier can log in successfully
        c_client = app.test_client()
        login_res = c_client.post("/api/auth/login", json={
            "email": "test.courier.driver@example.com",
            "password": "CourierSecure123!"
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.get_json()["user"]["role"], "Courier Partner")

if __name__ == "__main__":
    unittest.main()
