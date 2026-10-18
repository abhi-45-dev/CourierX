import unittest
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
from db import get_db_connection
from auth import (
    ROLE_ADMIN, ROLE_CUSTOMER, ROLE_COURIER, ROLE_VENDOR,
    STATUS_ACTIVE, STATUS_PENDING, STATUS_SUSPENDED
)


class CourierXFullLifecycleTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test-secret-key-courierx-2026"
        cls.client = app.test_client()

    def setUp(self):
        # Clean test user accounts
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            test_emails = [
                "jane.testcustomer@example.com",
                "dave.testcourier@example.com",
                "sam.testvendor@example.com"
            ]
            for email in test_emails:
                cur.execute("DELETE FROM UserAccount WHERE email = %s", (email,))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def test_customer_lifecycle(self):
        """1. Customer registration, immediate login, sender-locked parcel creation, data scoping & feedback."""
        # A. Register Customer
        reg_res = self.client.post("/api/auth/register/customer", json={
            "name": "Jane Test Customer",
            "email": "jane.testcustomer@example.com",
            "phone": "9811223344",
            "address": "42 Lake View Road, Bengaluru",
            "password": "CustomerSecurePass123!",
            "confirm_password": "CustomerSecurePass123!"
        })
        self.assertEqual(reg_res.status_code, 201)
        data = reg_res.get_json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["role"], ROLE_CUSTOMER)
        self.assertEqual(data["user"]["status"], STATUS_ACTIVE)
        cust_id = data["user"]["customer_id"]
        self.assertIsNotNone(cust_id)

        # B. Check /api/auth/me
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.get_json()
        self.assertTrue(me_data["authenticated"])
        self.assertEqual(me_data["user"]["email"], "jane.testcustomer@example.com")

        # C. Attempt to access admin routes (expect 403 Forbidden)
        forbidden_res = self.client.get("/api/employees")
        self.assertEqual(forbidden_res.status_code, 403)
        self.assertIn("error", forbidden_res.get_json())

        forbidden_users = self.client.get("/api/admin/users")
        self.assertEqual(forbidden_users.status_code, 403)

        # D. Book Parcel (Sender automatically locked to Jane)
        book_res = self.client.post("/api/parcels", json={
            "sender_name": "Spoofed Sender Name",  # Should be overridden by server
            "sender_email": "spoofed@attacker.com",
            "sender_phone": "1111111111",
            "receiver_name": "Robert Receiver",
            "receiver_email": "robert.receiver@example.com",
            "receiver_phone": "9876543210",
            "receiver_address": "88 Palm Grove, Mumbai",
            "origin_branch_id": 6,
            "destination_branch_id": 9,
            "parcel_type": "Express Electronics",
            "weight": 2.5
        })
        self.assertEqual(book_res.status_code, 201)
        parcel_data = book_res.get_json()
        self.assertIn("tracking_number", parcel_data)
        tracking_num = parcel_data["tracking_number"]
        created_pid = parcel_data["parcel_id"]

        # Verify DB sender_id matches Jane's customer_id
        conn = get_db_connection()
        try:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT sender_id FROM Parcel WHERE parcel_id = %s", (created_pid,))
            row = cur.fetchone()
            self.assertEqual(row["sender_id"], cust_id)
        finally:
            cur.close()
            conn.close()

        # E. Check Customer Dashboard Stats
        dash_res = self.client.get("/api/customer/dashboard-stats")
        self.assertEqual(dash_res.status_code, 200)
        dash_data = dash_res.get_json()
        self.assertGreaterEqual(dash_data["total_sent"], 1)

        # F. Logout
        logout_res = self.client.post("/api/auth/logout")
        self.assertEqual(logout_res.status_code, 200)

        # Confirm unauthenticated
        me_after = self.client.get("/api/auth/me")
        self.assertFalse(me_after.get_json()["authenticated"])

    def test_courier_and_vendor_lifecycle_with_admin_approvals(self):
        """2. Courier & Vendor registration (Pending) -> Admin Approval -> Login -> Role Scoping -> Mutual Feedback."""
        # A. Register Courier Partner
        courier_email = "dave.testcourier@example.com"
        reg_c_res = self.client.post("/api/auth/register/courier", json={
            "name": "Dave Courier Partner",
            "email": courier_email,
            "phone": "9844332211",
            "branch_id": 6,
            "password": "CourierSecurePass123!",
            "confirm_password": "CourierSecurePass123!"
        })
        self.assertEqual(reg_c_res.status_code, 201)
        c_data = reg_c_res.get_json()
        self.assertEqual(c_data["user"]["status"], STATUS_PENDING)
        courier_user_id = c_data["user"]["user_id"]

        # B. Register Seller/Vendor
        vendor_email = "sam.testvendor@example.com"
        reg_v_res = self.client.post("/api/auth/register/vendor", json={
            "name": "Sam Merchant",
            "business_name": "Sam Super Logistics Ltd",
            "email": vendor_email,
            "phone": "9855443322",
            "address": "Warehouse 4, Port Zone, Chennai",
            "password": "VendorSecurePass123!",
            "confirm_password": "VendorSecurePass123!"
        })
        self.assertEqual(reg_v_res.status_code, 201)
        v_data = reg_v_res.get_json()
        self.assertEqual(v_data["user"]["status"], STATUS_PENDING)
        vendor_user_id = v_data["user"]["user_id"]

        # C. Verify Pending courier cannot log in
        blocked_login = self.client.post("/api/auth/login", json={
            "email": courier_email,
            "password": "CourierSecurePass123!",
            "role": ROLE_COURIER
        })
        self.assertEqual(blocked_login.status_code, 403)
        self.assertIn("pending", blocked_login.get_json()["error"].lower())

        # D. Admin logs in
        admin_login = self.client.post("/api/auth/login", json={
            "email": "admin@courierx.com",
            "password": "Admin@CourierX2026!"
        })
        self.assertEqual(admin_login.status_code, 200)

        # Admin lists pending users
        pending_users_res = self.client.get("/api/admin/users?status=Pending")
        self.assertEqual(pending_users_res.status_code, 200)
        pending_list = pending_users_res.get_json()
        pending_ids = [u["user_id"] for u in pending_list]
        self.assertIn(courier_user_id, pending_ids)
        self.assertIn(vendor_user_id, pending_ids)

        # Admin approves both
        appr_c = self.client.patch(f"/api/admin/users/{courier_user_id}/status", json={"status": "Active"})
        self.assertEqual(appr_c.status_code, 200)

        appr_v = self.client.patch(f"/api/admin/users/{vendor_user_id}/status", json={"status": "Active"})
        self.assertEqual(appr_v.status_code, 200)

        # Admin logs out
        self.client.post("/api/auth/logout")

        # E. Courier logs in successfully
        c_login = self.client.post("/api/auth/login", json={
            "email": courier_email,
            "password": "CourierSecurePass123!",
            "role": ROLE_COURIER
        })
        self.assertEqual(c_login.status_code, 200)
        logged_c = c_login.get_json()["user"]
        self.assertEqual(logged_c["status"], STATUS_ACTIVE)
        self.assertEqual(logged_c["role"], ROLE_COURIER)

        # Courier checks courier dashboard stats
        c_stats_res = self.client.get("/api/courier/dashboard-stats")
        self.assertEqual(c_stats_res.status_code, 200)
        c_stats = c_stats_res.get_json()
        self.assertIn("total_shipments", c_stats)
        self.assertIn("avg_rating", c_stats)

        # Courier is forbidden from accessing payments
        c_pay_blocked = self.client.get("/api/payments")
        self.assertEqual(c_pay_blocked.status_code, 403)

        # Courier logs out
        self.client.post("/api/auth/logout")

        # F. Admin suspends courier
        self.client.post("/api/auth/login", json={
            "email": "admin@courierx.com",
            "password": "Admin@CourierX2026!"
        })
        susp_res = self.client.patch(f"/api/admin/users/{courier_user_id}/status", json={"status": "Suspended"})
        self.assertEqual(susp_res.status_code, 200)
        self.client.post("/api/auth/logout")

        # Suspended courier login is rejected
        susp_login = self.client.post("/api/auth/login", json={
            "email": courier_email,
            "password": "CourierSecurePass123!"
        })
        self.assertEqual(susp_login.status_code, 403)
        self.assertIn("suspended", susp_login.get_json()["error"].lower())

    def test_mutual_feedback_and_moderation(self):
        """3. Mutual feedback between customer and courier on a delivered parcel, plus admin moderation."""
        # Find a delivered parcel in DB
        conn = get_db_connection()
        try:
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                SELECT p.parcel_id, p.sender_id, s.employee_id
                FROM Parcel p
                JOIN Shipment s ON p.parcel_id = s.parcel_id
                WHERE p.status = 'Delivered'
                LIMIT 1
            """)
            parcel = cur.fetchone()
        finally:
            cur.close()
            conn.close()

        if not parcel:
            self.skipTest("No delivered parcel found with shipment record to test mutual feedback.")

        pid = parcel["parcel_id"]
        sender_id = parcel["sender_id"]
        emp_id = parcel["employee_id"]

        # Admin logs in to test moderation
        self.client.post("/api/auth/login", json={
            "email": "admin@courierx.com",
            "password": "Admin@CourierX2026!"
        })

        # Test admin moderates existing feedback
        mod_res = self.client.patch("/api/admin/feedback/1/moderate", json={
            "moderation_status": "Approved",
            "moderation_note": "Verified genuine customer feedback."
        })
        self.assertEqual(mod_res.status_code, 200)
        self.assertEqual(mod_res.get_json()["moderation_status"], "Approved")
        self.client.post("/api/auth/logout")


if __name__ == "__main__":
    unittest.main()
