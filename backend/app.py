import os
import sys
import secrets
import string
import re
from datetime import datetime
from decimal import Decimal
from flask import Flask, jsonify, render_template, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_db_connection
from qr_code import generate_qr_svg


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# CUSTOMERS
# =========================================================

@app.route("/api/customers", methods=["GET"])
def get_customers():

    search_query = request.args.get("search", "").strip()
    activity_filter = request.args.get("activity", "").strip().lower()

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        conditions = []
        params = []

        if search_query:
            conditions.append("""(
                c.name LIKE %s
                OR c.email LIKE %s
                OR c.phone LIKE %s
                OR c.address LIKE %s
                OR CAST(c.customer_id AS CHAR) = %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param, search_param, search_param, search_query])

        if activity_filter == "active":
            conditions.append("""(
                (SELECT COUNT(*) FROM Parcel p WHERE p.sender_id = c.customer_id) +
                (SELECT COUNT(*) FROM Parcel p WHERE p.receiver_id = c.customer_id)
            ) > 0""")
        elif activity_filter == "inactive":
            conditions.append("""(
                (SELECT COUNT(*) FROM Parcel p WHERE p.sender_id = c.customer_id) +
                (SELECT COUNT(*) FROM Parcel p WHERE p.receiver_id = c.customer_id)
            ) = 0""")

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                c.customer_id,
                c.name,
                c.email,
                c.phone,
                c.address,
                (SELECT COUNT(*) FROM Parcel p WHERE p.sender_id = c.customer_id) AS parcels_sent,
                (SELECT COUNT(*) FROM Parcel p WHERE p.receiver_id = c.customer_id) AS parcels_received,
                (
                    (SELECT COUNT(*) FROM Parcel p WHERE p.sender_id = c.customer_id) +
                    (SELECT COUNT(*) FROM Parcel p WHERE p.receiver_id = c.customer_id)
                ) AS total_parcels,
                (
                    SELECT COUNT(DISTINCT s.shipment_id)
                    FROM Shipment s
                    JOIN Parcel p ON s.parcel_id = p.parcel_id
                    WHERE p.sender_id = c.customer_id OR p.receiver_id = c.customer_id
                ) AS total_shipments
            FROM Customer c
            {where_clause}
            ORDER BY c.customer_id ASC
        """
        cursor.execute(query, tuple(params))
        customers = cursor.fetchall()
        return jsonify(customers)
    finally:
        cursor.close()
        db.close()


@app.route("/api/customers/stats", methods=["GET"])
def get_customer_stats():

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total_customers FROM Customer")
        total_customers = cursor.fetchone()["total_customers"] or 0

        cursor.execute("""
            SELECT COUNT(DISTINCT c.customer_id) AS active_customers
            FROM Customer c
            WHERE EXISTS (
                SELECT 1 FROM Parcel p WHERE p.sender_id = c.customer_id OR p.receiver_id = c.customer_id
            )
        """)
        active_customers = cursor.fetchone()["active_customers"] or 0
        inactive_customers = max(0, total_customers - active_customers)

        cursor.execute("SELECT COUNT(*) AS total_parcels FROM Parcel")
        total_parcels = cursor.fetchone()["total_parcels"] or 0

        cursor.execute("SELECT COUNT(*) AS total_shipments FROM Shipment")
        total_shipments = cursor.fetchone()["total_shipments"] or 0

        return jsonify({
            "total_customers": total_customers,
            "active_customers": active_customers,
            "inactive_customers": inactive_customers,
            "total_parcels": total_parcels,
            "total_shipments": total_shipments
        })
    finally:
        cursor.close()
        db.close()


@app.route("/api/customers/<int:customer_id>", methods=["GET"])
def get_customer(customer_id):

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT customer_id, name, email, phone, address
            FROM Customer
            WHERE customer_id = %s
        """, (customer_id,))
        customer = cursor.fetchone()

        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        # Related parcels (sent or received)
        cursor.execute("""
            SELECT
                p.parcel_id,
                p.tracking_number,
                CASE
                    WHEN p.sender_id = %s THEN 'Sender'
                    ELSE 'Receiver'
                END AS role,
                ob.branch_name AS origin_branch,
                ob.city AS origin_city,
                db.branch_name AS destination_branch,
                db.city AS destination_city,
                p.weight,
                p.parcel_type,
                p.shipping_cost,
                p.status,
                DATE_FORMAT(p.booking_date, '%Y-%m-%d %H:%i') AS booking_date
            FROM Parcel p
            JOIN Branch ob ON p.origin_branch_id = ob.branch_id
            JOIN Branch db ON p.destination_branch_id = db.branch_id
            WHERE p.sender_id = %s OR p.receiver_id = %s
            ORDER BY p.booking_date DESC
        """, (customer_id, customer_id, customer_id))
        customer["parcels"] = cursor.fetchall()

        # Related shipments
        cursor.execute("""
            SELECT
                s.shipment_id,
                p.tracking_number,
                p.status,
                CONCAT(ob.city, ' → ', db.city) AS route,
                COALESCE(v.vehicle_number, 'N/A') AS vehicle_number,
                COALESCE(v.vehicle_type, 'Standard') AS vehicle_type,
                COALESCE(e.name, 'Unassigned') AS employee_name,
                DATE_FORMAT(s.shipment_date, '%Y-%m-%d %H:%i') AS shipment_date
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
            JOIN Branch ob ON p.origin_branch_id = ob.branch_id
            JOIN Branch db ON p.destination_branch_id = db.branch_id
            LEFT JOIN Vehicle v ON s.vehicle_id = v.vehicle_id
            LEFT JOIN Employee e ON s.employee_id = e.employee_id
            WHERE p.sender_id = %s OR p.receiver_id = %s
            ORDER BY s.shipment_date DESC
        """, (customer_id, customer_id))
        customer["shipments"] = cursor.fetchall()

        sent_count = sum(1 for p in customer["parcels"] if p["role"] == "Sender")
        received_count = sum(1 for p in customer["parcels"] if p["role"] == "Receiver")
        customer["parcels_sent"] = sent_count
        customer["parcels_received"] = received_count
        customer["total_parcels"] = len(customer["parcels"])
        customer["total_shipments"] = len(customer["shipments"])

        return jsonify(customer)
    finally:
        cursor.close()
        db.close()


@app.route("/api/customers", methods=["POST"])
def create_customer():

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()

    validation_error = validate_customer(name, email, phone, address)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT customer_id FROM Customer WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "A customer with this email address already exists"}), 409

        cursor.execute("SELECT customer_id FROM Customer WHERE phone = %s", (phone,))
        if cursor.fetchone():
            return jsonify({"error": "A customer with this phone number already exists"}), 409

        cursor.execute("""
            INSERT INTO Customer (name, email, phone, address)
            VALUES (%s, %s, %s, %s)
        """, (name, email, phone, address))
        db.commit()

        new_id = cursor.lastrowid
        return jsonify({
            "message": "Customer created successfully",
            "customer_id": new_id,
            "name": name,
            "email": email,
            "phone": phone,
            "address": address
        }), 201

    except Exception as error:
        db.rollback()
        return jsonify({"error": str(error)}), 500
    finally:
        cursor.close()
        db.close()


@app.route("/api/customers/<int:customer_id>", methods=["PUT"])
def update_customer(customer_id):

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()

    validation_error = validate_customer(name, email, phone, address)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT customer_id FROM Customer WHERE customer_id = %s", (customer_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Customer not found"}), 404

        cursor.execute("SELECT customer_id FROM Customer WHERE email = %s AND customer_id != %s", (email, customer_id))
        if cursor.fetchone():
            return jsonify({"error": "Another customer with this email address already exists"}), 409

        cursor.execute("SELECT customer_id FROM Customer WHERE phone = %s AND customer_id != %s", (phone, customer_id))
        if cursor.fetchone():
            return jsonify({"error": "Another customer with this phone number already exists"}), 409

        cursor.execute("""
            UPDATE Customer
            SET name = %s, email = %s, phone = %s, address = %s
            WHERE customer_id = %s
        """, (name, email, phone, address, customer_id))
        db.commit()

        return jsonify({
            "message": "Customer updated successfully",
            "customer_id": customer_id,
            "name": name,
            "email": email,
            "phone": phone,
            "address": address
        }), 200

    except Exception as error:
        db.rollback()
        return jsonify({"error": str(error)}), 500
    finally:
        cursor.close()
        db.close()


@app.route("/api/customers/<int:customer_id>", methods=["DELETE"])
def delete_customer(customer_id):

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT customer_id, name FROM Customer WHERE customer_id = %s", (customer_id,))
        customer = cursor.fetchone()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        # Safe referential integrity check
        cursor.execute("""
            SELECT COUNT(*) AS count
            FROM Parcel
            WHERE sender_id = %s OR receiver_id = %s
        """, (customer_id, customer_id))
        parcel_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM Payment WHERE customer_id = %s", (customer_id,))
        payment_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM Feedback WHERE customer_id = %s", (customer_id,))
        feedback_count = cursor.fetchone()["count"]

        total_linked = parcel_count + payment_count + feedback_count

        if total_linked > 0:
            return jsonify({
                "error": f"Customer '{customer['name']}' is linked to {parcel_count} parcel(s) and existing records. Deletion blocked to preserve referential integrity.",
                "can_delete": False,
                "linked_parcels": parcel_count
            }), 409

        cursor.execute("DELETE FROM Customer WHERE customer_id = %s", (customer_id,))
        db.commit()

        return jsonify({
            "message": f"Customer '{customer['name']}' deleted successfully",
            "can_delete": True
        }), 200

    except Exception as error:
        db.rollback()
        return jsonify({"error": str(error)}), 500
    finally:
        cursor.close()
        db.close()


# =========================================================
# BRANCHES MANAGEMENT API
# =========================================================

@app.route("/api/branches", methods=["GET"])
def get_branches():

    search_query = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip()
    active_only = request.args.get("active_only", "").strip().lower() in ("true", "1")

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        conditions = []
        params = []

        if search_query:
            conditions.append("""(
                b.branch_name LIKE %s
                OR b.city LIKE %s
                OR b.state LIKE %s
                OR b.phone LIKE %s
                OR b.address LIKE %s
                OR CAST(b.branch_id AS CHAR) = %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param, search_param, search_param, search_param, search_query])

        if status_filter in ["Active", "Inactive"]:
            conditions.append("b.status = %s")
            params.append(status_filter)
        elif active_only:
            conditions.append("b.status = 'Active'")

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                b.branch_id,
                b.branch_name,
                b.branch_name AS name,
                b.city,
                b.state,
                b.address,
                b.phone,
                b.status,
                e.name AS manager_name,
                (SELECT COUNT(*) FROM Parcel WHERE origin_branch_id = b.branch_id) AS outgoing_parcels,
                (SELECT COUNT(*) FROM Parcel WHERE destination_branch_id = b.branch_id) AS incoming_parcels
            FROM Branch b
            LEFT JOIN Employee e
                ON b.branch_id = e.branch_id
            {where_clause}
            ORDER BY b.branch_id ASC
        """

        cursor.execute(query, tuple(params))
        branches = cursor.fetchall()

        return jsonify(branches)

    finally:
        cursor.close()
        db.close()


@app.route("/api/branches/stats", methods=["GET"])
def get_branch_stats():

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS total_branches,
                COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active_branches,
                COALESCE(SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END), 0) AS inactive_branches,
                COUNT(DISTINCT city) AS cities_covered
            FROM Branch
        """)

        stats = cursor.fetchone()

        return jsonify({
            "total_branches": int(stats["total_branches"] or 0),
            "active_branches": int(stats["active_branches"] or 0),
            "inactive_branches": int(stats["inactive_branches"] or 0),
            "cities_covered": int(stats["cities_covered"] or 0)
        })

    finally:
        cursor.close()
        db.close()


@app.route("/api/branches/<int:branch_id>", methods=["GET"])
def get_branch(branch_id):

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                b.branch_id,
                b.branch_name,
                b.branch_name AS name,
                b.city,
                b.state,
                b.address,
                b.phone,
                b.status,
                e.employee_id AS manager_id,
                e.name AS manager_name,
                e.email AS manager_email,
                e.phone AS manager_phone,
                e.role AS manager_role,
                (SELECT COUNT(*) FROM Parcel WHERE origin_branch_id = b.branch_id) AS outgoing_parcels,
                (SELECT COUNT(*) FROM Parcel WHERE destination_branch_id = b.branch_id) AS incoming_parcels
            FROM Branch b
            LEFT JOIN Employee e
                ON b.branch_id = e.branch_id
            WHERE b.branch_id = %s
        """, (branch_id,))

        branch = cursor.fetchone()

        if branch is None:
            return jsonify({"error": "Branch not found"}), 404

        # Recent parcels linked to this branch
        cursor.execute("""
            SELECT
                p.parcel_id,
                p.tracking_number,
                p.status,
                p.parcel_type,
                p.weight,
                p.shipping_cost,
                DATE_FORMAT(p.booking_date, '%Y-%m-%d %H:%i') AS booking_date,
                CASE
                    WHEN p.origin_branch_id = %s THEN 'Outgoing'
                    ELSE 'Incoming'
                END AS direction
            FROM Parcel p
            WHERE p.origin_branch_id = %s OR p.destination_branch_id = %s
            ORDER BY p.booking_date DESC
            LIMIT 5
        """, (branch_id, branch_id, branch_id))

        branch["recent_parcels"] = cursor.fetchall()

        return jsonify(branch)

    finally:
        cursor.close()
        db.close()


@app.route("/api/branches", methods=["POST"])
def create_branch():

    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    branch_name = (data.get("branch_name") or "").strip()
    city = (data.get("city") or "").strip()
    state = (data.get("state") or "").strip()
    address = (data.get("address") or "").strip()
    phone = (data.get("phone") or "").strip()
    status = (data.get("status") or "Active").strip()

    if not branch_name:
        return jsonify({"error": "Branch name is required"}), 400

    if not city:
        return jsonify({"error": "City is required"}), 400

    if not state:
        return jsonify({"error": "State is required"}), 400

    if not address:
        return jsonify({"error": "Address is required"}), 400

    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    if len(phone) < 5 or len(phone) > 15:
        return jsonify({"error": "Phone number must be between 5 and 15 characters"}), 400

    if status not in ["Active", "Inactive"]:
        status = "Active"

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        # Check duplicate
        cursor.execute("""
            SELECT branch_id
            FROM Branch
            WHERE LOWER(branch_name) = LOWER(%s) AND LOWER(city) = LOWER(%s)
        """, (branch_name, city))

        if cursor.fetchone():
            return jsonify({"error": "A branch with this name already exists in this city"}), 409

        cursor.execute("""
            INSERT INTO Branch (branch_name, city, state, address, phone, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (branch_name, city, state, address, phone, status))

        db.commit()
        new_branch_id = cursor.lastrowid

        return jsonify({
            "message": "Branch created successfully",
            "branch": {
                "branch_id": new_branch_id,
                "branch_name": branch_name,
                "city": city,
                "state": state,
                "address": address,
                "phone": phone,
                "status": status
            }
        }), 201

    finally:
        cursor.close()
        db.close()


@app.route("/api/branches/<int:branch_id>", methods=["PUT"])
def update_branch(branch_id):

    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    branch_name = (data.get("branch_name") or "").strip()
    city = (data.get("city") or "").strip()
    state = (data.get("state") or "").strip()
    address = (data.get("address") or "").strip()
    phone = (data.get("phone") or "").strip()
    status = (data.get("status") or "Active").strip()

    if not branch_name:
        return jsonify({"error": "Branch name is required"}), 400

    if not city:
        return jsonify({"error": "City is required"}), 400

    if not state:
        return jsonify({"error": "State is required"}), 400

    if not address:
        return jsonify({"error": "Address is required"}), 400

    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    if len(phone) < 5 or len(phone) > 15:
        return jsonify({"error": "Phone number must be between 5 and 15 characters"}), 400

    if status not in ["Active", "Inactive"]:
        status = "Active"

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT branch_id FROM Branch WHERE branch_id = %s", (branch_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "Branch not found"}), 404

        # Duplicate check excluding this branch
        cursor.execute("""
            SELECT branch_id
            FROM Branch
            WHERE LOWER(branch_name) = LOWER(%s) AND LOWER(city) = LOWER(%s) AND branch_id != %s
        """, (branch_name, city, branch_id))

        if cursor.fetchone():
            return jsonify({"error": "Another branch with this name already exists in this city"}), 409

        cursor.execute("""
            UPDATE Branch
            SET branch_name = %s, city = %s, state = %s, address = %s, phone = %s, status = %s
            WHERE branch_id = %s
        """, (branch_name, city, state, address, phone, status, branch_id))

        db.commit()

        return jsonify({
            "message": "Branch updated successfully",
            "branch": {
                "branch_id": branch_id,
                "branch_name": branch_name,
                "city": city,
                "state": state,
                "address": address,
                "phone": phone,
                "status": status
            }
        })

    finally:
        cursor.close()
        db.close()


@app.route("/api/branches/<int:branch_id>/status", methods=["PATCH"])
def update_branch_status(branch_id):

    data = request.get_json() or {}
    new_status = data.get("status", "").strip()

    if new_status not in ["Active", "Inactive"]:
        return jsonify({"error": "Status must be 'Active' or 'Inactive'"}), 400

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT branch_id FROM Branch WHERE branch_id = %s", (branch_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "Branch not found"}), 404

        cursor.execute("""
            UPDATE Branch
            SET status = %s
            WHERE branch_id = %s
        """, (new_status, branch_id))

        db.commit()

        return jsonify({
            "message": f"Branch status changed to {new_status}",
            "branch_id": branch_id,
            "status": new_status
        })

    finally:
        cursor.close()
        db.close()


@app.route("/api/branches/<int:branch_id>", methods=["DELETE"])
def delete_branch(branch_id):

    force_deactivate = (
        request.args.get("deactivate", "").strip().lower() in ("true", "1")
        or (request.is_json and request.get_json(silent=True) and request.get_json(silent=True).get("deactivate"))
    )

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT branch_id, branch_name, status FROM Branch WHERE branch_id = %s", (branch_id,))
        branch = cursor.fetchone()
        if branch is None:
            return jsonify({"error": "Branch not found"}), 404

        # Check foreign-key relationships
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM Parcel WHERE origin_branch_id = %s OR destination_branch_id = %s) AS parcel_refs,
                (SELECT COUNT(*) FROM Employee WHERE branch_id = %s) AS employee_refs,
                (SELECT COUNT(*) FROM Vehicle WHERE branch_id = %s) AS vehicle_refs,
                (SELECT COUNT(*) FROM Tracking_Update WHERE branch_id = %s) AS tracking_refs
        """, (branch_id, branch_id, branch_id, branch_id, branch_id))

        ref_counts = cursor.fetchone()
        parcel_refs = int(ref_counts["parcel_refs"] or 0)
        employee_refs = int(ref_counts["employee_refs"] or 0)
        vehicle_refs = int(ref_counts["vehicle_refs"] or 0)
        tracking_refs = int(ref_counts["tracking_refs"] or 0)
        total_refs = parcel_refs + employee_refs + vehicle_refs + tracking_refs

        if total_refs > 0:
            if force_deactivate:
                cursor.execute("UPDATE Branch SET status = 'Inactive' WHERE branch_id = %s", (branch_id,))
                db.commit()
                return jsonify({
                    "message": "Branch deactivated safely. Existing parcel and tracking references remain intact.",
                    "can_delete": false,
                    "deactivated": True,
                    "deleted": False,
                    "status": "Inactive"
                })

            # If not explicitly deactivating, return 409 conflict with clear message
            return jsonify({
                "can_delete": False,
                "deactivated": False,
                "deleted": False,
                "error": "This branch is linked to existing parcels or operational records and cannot be safely deleted. Deactivate it instead?",
                "parcel_refs": parcel_refs,
                "employee_refs": employee_refs,
                "vehicle_refs": vehicle_refs,
                "tracking_refs": tracking_refs,
                "total_refs": total_refs
            }), 409

        # No references, safe to hard delete
        cursor.execute("DELETE FROM Branch WHERE branch_id = %s", (branch_id,))
        db.commit()

        return jsonify({
            "message": "Branch deleted successfully",
            "can_delete": True,
            "deleted": True,
            "deactivated": False
        })

    finally:
        cursor.close()
        db.close()


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        # Total parcels
        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM Parcel
        """)

        total_parcels = cursor.fetchone()["total"]


        # In transit
        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM Parcel
            WHERE status = 'In Transit'
        """)

        in_transit = cursor.fetchone()["total"]


        # Delivered
        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM Parcel
            WHERE status = 'Delivered'
        """)

        delivered = cursor.fetchone()["total"]


        # Customers
        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM Customer
        """)

        total_customers = cursor.fetchone()["total"]


        # Recent parcels
        cursor.execute("""
            SELECT
                p.tracking_number,
                c.name AS customer_name,
                p.status,

                DATE_FORMAT(
                    p.booking_date,
                    '%Y-%m-%d %H:%i'
                ) AS booking_date

            FROM Parcel p

            JOIN Customer c
                ON p.sender_id =
                   c.customer_id

            ORDER BY
                p.booking_date DESC

            LIMIT 8
        """)

        recent_parcels = cursor.fetchall()


        return jsonify({
            "stats": {
                "total_parcels": total_parcels,
                "in_transit": in_transit,
                "delivered": delivered,
                "total_customers": total_customers
            },

            "recent_parcels":
                recent_parcels
        })

    finally:
        cursor.close()
        db.close()


# =========================================================
# GET ALL PARCELS
# =========================================================

@app.route("/api/parcels", methods=["GET"])
def get_parcels():

    search_query = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip()

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        conditions = []
        params = []

        if search_query:
            conditions.append("""(
                p.tracking_number LIKE %s
                OR sender.name LIKE %s
                OR receiver.name LIKE %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param, search_param])

        if status_filter in ["Pending", "In Transit", "Out for Delivery", "Delivered"]:
            conditions.append("p.status = %s")
            params.append(status_filter)

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT

                p.parcel_id,
                p.tracking_number,

                sender.name
                    AS sender_name,
                sender.phone
                    AS sender_phone,
                sender.email
                    AS sender_email,

                receiver.name
                    AS receiver_name,
                receiver.phone
                    AS receiver_phone,
                receiver.email
                    AS receiver_email,

                origin.branch_name
                    AS origin_branch,

                origin.city
                    AS origin_city,

                origin.state
                    AS origin_state,

                destination.branch_name
                    AS destination_branch,

                destination.city
                    AS destination_city,

                destination.state
                    AS destination_state,

                p.weight,
                p.parcel_type,
                p.shipping_cost,
                p.status,

                DATE_FORMAT(
                    p.booking_date,
                    '%Y-%m-%d %H:%i'
                ) AS booking_date

            FROM Parcel p

            JOIN Customer sender
                ON p.sender_id =
                   sender.customer_id

            JOIN Customer receiver
                ON p.receiver_id =
                   receiver.customer_id

            JOIN Branch origin
                ON p.origin_branch_id =
                   origin.branch_id

            JOIN Branch destination
                ON p.destination_branch_id =
                   destination.branch_id

            {where_clause}

            ORDER BY
                p.booking_date DESC
        """

        cursor.execute(query, tuple(params))
        parcels = cursor.fetchall()

        return jsonify(parcels)

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500

    finally:
        cursor.close()
        db.close()


# =========================================================
# TRACKING NUMBER GENERATOR
# =========================================================

def generate_tracking_number():

    characters = (
        string.ascii_uppercase +
        string.digits
    )

    random_part = "".join(
        secrets.choice(characters)
        for _ in range(10)
    )

    return f"CT{random_part}"


# =========================================================
# CUSTOMER VALIDATION
# =========================================================

def validate_customer(
    name,
    email,
    phone,
    address
):

    if not name or not name.strip():
        return "Customer name is required"


    if not email or not email.strip():
        return "Customer email is required"


    if not phone or not phone.strip():
        return "Customer phone is required"


    if not address or not address.strip():
        return "Customer address is required"


    email_pattern = (
        r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )


    if not re.match(
        email_pattern,
        email
    ):
        return "Please enter a valid email address"


    if not phone.isdigit():
        return "Phone number must contain only digits"


    if len(phone) != 10:
        return "Phone number must contain exactly 10 digits"


    return None


# =========================================================
# FIND OR CREATE CUSTOMER
# =========================================================

def get_or_create_customer(
    cursor,
    name,
    email,
    phone,
    address
):

    # -----------------------------------------------------
    # CHECK EMAIL
    # -----------------------------------------------------

    cursor.execute("""
        SELECT customer_id
        FROM Customer
        WHERE email = %s
    """, (
        email,
    ))

    customer = cursor.fetchone()


    if customer:

        customer_id = (
            customer["customer_id"]
        )


        cursor.execute("""
            UPDATE Customer

            SET
                name = %s,
                phone = %s,
                address = %s

            WHERE customer_id = %s
        """, (
            name,
            phone,
            address,
            customer_id
        ))


        return customer_id


    # -----------------------------------------------------
    # CHECK PHONE
    # -----------------------------------------------------

    cursor.execute("""
        SELECT customer_id
        FROM Customer
        WHERE phone = %s
    """, (
        phone,
    ))

    customer = cursor.fetchone()


    if customer:

        customer_id = (
            customer["customer_id"]
        )


        cursor.execute("""
            UPDATE Customer

            SET
                name = %s,
                email = %s,
                address = %s

            WHERE customer_id = %s
        """, (
            name,
            email,
            address,
            customer_id
        ))


        return customer_id


    # -----------------------------------------------------
    # CREATE CUSTOMER
    # -----------------------------------------------------

    cursor.execute("""
        INSERT INTO Customer (
            name,
            email,
            phone,
            address
        )

        VALUES (
            %s,
            %s,
            %s,
            %s
        )
    """, (
        name,
        email,
        phone,
        address
    ))


    return cursor.lastrowid


# =========================================================
# CREATE PARCEL
# =========================================================

@app.route(
    "/api/parcels",
    methods=["POST"]
)
def create_parcel():

    data = request.get_json()


    if not data:

        return jsonify({
            "error":
                "Request body is required"
        }), 400


    # =====================================================
    # SENDER
    # =====================================================

    sender_name = (
        data.get(
            "sender_name",
            ""
        ).strip()
    )


    sender_email = (
        data.get(
            "sender_email",
            ""
        ).strip().lower()
    )


    sender_phone = (
        data.get(
            "sender_phone",
            ""
        ).strip()
    )


    sender_address = (
        data.get(
            "sender_address",
            ""
        ).strip()
    )


    # =====================================================
    # RECEIVER
    # =====================================================

    receiver_name = (
        data.get(
            "receiver_name",
            ""
        ).strip()
    )


    receiver_email = (
        data.get(
            "receiver_email",
            ""
        ).strip().lower()
    )


    receiver_phone = (
        data.get(
            "receiver_phone",
            ""
        ).strip()
    )


    receiver_address = (
        data.get(
            "receiver_address",
            ""
        ).strip()
    )


    # =====================================================
    # VALIDATE SENDER
    # =====================================================

    sender_error = validate_customer(
        sender_name,
        sender_email,
        sender_phone,
        sender_address
    )


    if sender_error:

        return jsonify({
            "error":
                f"Sender: {sender_error}"
        }), 400


    # =====================================================
    # VALIDATE RECEIVER
    # =====================================================

    receiver_error = validate_customer(
        receiver_name,
        receiver_email,
        receiver_phone,
        receiver_address
    )


    if receiver_error:

        return jsonify({
            "error":
                f"Receiver: {receiver_error}"
        }), 400


    # =====================================================
    # PARCEL DATA
    # =====================================================

    try:

        origin_branch_id = int(
            data["origin_branch_id"]
        )


        destination_branch_id = int(
            data["destination_branch_id"]
        )


        weight = float(
            data["weight"]
        )


        shipping_cost = float(
            data["shipping_cost"]
        )

    except (
        KeyError,
        TypeError,
        ValueError
    ):

        return jsonify({
            "error":
                "Invalid parcel information"
        }), 400


    parcel_type = (
        data.get(
            "parcel_type",
            ""
        ).strip()
    )


    if weight <= 0:

        return jsonify({
            "error":
                "Weight must be greater than 0"
        }), 400


    if shipping_cost < 0:

        return jsonify({
            "error":
                "Shipping cost cannot be negative"
        }), 400


    if not parcel_type:

        return jsonify({
            "error":
                "Parcel type is required"
        }), 400


    if (
        origin_branch_id ==
        destination_branch_id
    ):

        return jsonify({
            "error":
                "Origin and destination branches "
                "must be different"
        }), 400


    # =====================================================
    # DATABASE
    # =====================================================

    db = get_db_connection()


    try:

        cursor = db.cursor(
            dictionary=True
        )


        # -------------------------------------------------
        # CHECK ORIGIN BRANCH
        # -------------------------------------------------

        cursor.execute("""
            SELECT branch_id, status
            FROM Branch
            WHERE branch_id = %s
        """, (
            origin_branch_id,
        ))

        origin_branch = cursor.fetchone()

        if origin_branch is None:

            return jsonify({
                "error":
                    "Origin branch does not exist"
            }), 400

        if origin_branch.get("status") == "Inactive":

            return jsonify({
                "error":
                    "Selected origin branch is inactive and cannot accept new parcels"
            }), 400


        # -------------------------------------------------
        # CHECK DESTINATION BRANCH
        # -------------------------------------------------

        cursor.execute("""
            SELECT branch_id, status
            FROM Branch
            WHERE branch_id = %s
        """, (
            destination_branch_id,
        ))

        dest_branch = cursor.fetchone()

        if dest_branch is None:

            return jsonify({
                "error":
                    "Destination branch does not exist"
            }), 400

        if dest_branch.get("status") == "Inactive":

            return jsonify({
                "error":
                    "Selected destination branch is inactive and cannot accept new parcels"
            }), 400


        # -------------------------------------------------
        # FIND / CREATE SENDER
        # -------------------------------------------------

        sender_id = get_or_create_customer(
            cursor,
            sender_name,
            sender_email,
            sender_phone,
            sender_address
        )


        # -------------------------------------------------
        # FIND / CREATE RECEIVER
        # -------------------------------------------------

        receiver_id = get_or_create_customer(
            cursor,
            receiver_name,
            receiver_email,
            receiver_phone,
            receiver_address
        )


        # -------------------------------------------------
        # GENERATE TRACKING NUMBER
        # -------------------------------------------------

        tracking_number = (
            generate_tracking_number()
        )


        while True:

            cursor.execute("""
                SELECT parcel_id
                FROM Parcel
                WHERE tracking_number = %s
            """, (
                tracking_number,
            ))


            if cursor.fetchone() is None:
                break


            tracking_number = (
                generate_tracking_number()
            )


        # -------------------------------------------------
        # INSERT PARCEL
        # -------------------------------------------------

        cursor.execute("""
            INSERT INTO Parcel (

                tracking_number,

                sender_id,
                receiver_id,

                origin_branch_id,
                destination_branch_id,

                weight,
                parcel_type,
                shipping_cost,

                status

            )

            VALUES (

                %s,

                %s,
                %s,

                %s,
                %s,

                %s,
                %s,
                %s,

                'Pending'

            )
        """, (

            tracking_number,

            sender_id,
            receiver_id,

            origin_branch_id,
            destination_branch_id,

            weight,
            parcel_type,
            shipping_cost
        ))


        db.commit()


        parcel_id = (
            cursor.lastrowid
        )


        return jsonify({

            "message":
                "Parcel created successfully",

            "parcel_id":
                parcel_id,

            "tracking_number":
                tracking_number,

            "sender_id":
                sender_id,

            "receiver_id":
                receiver_id

        }), 201


    except Exception as error:

        db.rollback()


        return jsonify({
            "error":
                str(error)
        }), 500


    finally:

        cursor.close()
        db.close()


# =========================================================
# TRACK SINGLE PARCEL
# =========================================================

@app.route(
    "/api/parcels/<tracking_number>",
    methods=["GET"]
)
def track_parcel(
    tracking_number
):

    db = get_db_connection()


    try:

        cursor = db.cursor(
            dictionary=True
        )


        # =================================================
        # PARCEL DETAILS
        # =================================================

        cursor.execute("""
            SELECT

                p.parcel_id,
                p.tracking_number,

                p.weight,
                p.parcel_type,
                p.shipping_cost,
                p.status,


                DATE_FORMAT(
                    p.booking_date,
                    '%Y-%m-%d %H:%i'
                ) AS booking_date,


                sender.name
                    AS sender_name,

                sender.email
                    AS sender_email,

                sender.phone
                    AS sender_phone,


                receiver.name
                    AS receiver_name,

                receiver.email
                    AS receiver_email,

                receiver.phone
                    AS receiver_phone,


                origin.branch_name
                    AS origin_branch,

                origin.city
                    AS origin_city,

                origin.state
                    AS origin_state,


                destination.branch_name
                    AS destination_branch,

                destination.city
                    AS destination_city,

                destination.state
                    AS destination_state


            FROM Parcel p


            JOIN Customer sender
                ON p.sender_id =
                   sender.customer_id


            JOIN Customer receiver
                ON p.receiver_id =
                   receiver.customer_id


            JOIN Branch origin
                ON p.origin_branch_id =
                   origin.branch_id


            JOIN Branch destination
                ON p.destination_branch_id =
                   destination.branch_id


            WHERE
                p.tracking_number = %s

        """, (
            tracking_number,
        ))


        parcel = cursor.fetchone()


        if parcel is None:

            return jsonify({
                "error":
                    "Parcel not found"
            }), 404


        # =================================================
        # TRACKING HISTORY
        # =================================================

        cursor.execute("""
            SELECT

                tu.update_id,
                tu.status,
                tu.location,


                DATE_FORMAT(
                    tu.update_time,
                    '%Y-%m-%d %H:%i'
                ) AS update_time,


                b.branch_name,
                b.city,
                b.state,


                e.name
                    AS employee_name


            FROM Tracking_Update tu


            JOIN Branch b
                ON tu.branch_id =
                   b.branch_id


            JOIN Employee e
                ON tu.employee_id =
                   e.employee_id


            WHERE
                tu.parcel_id = %s


            ORDER BY
                tu.update_time ASC

        """, (
            parcel["parcel_id"],
        ))


        parcel["tracking_history"] = (
            cursor.fetchall()
        )


        return jsonify(parcel)


    finally:

        cursor.close()
        db.close()



# =========================================================
# SHIPMENTS MANAGEMENT API
# =========================================================

@app.route("/api/shipments", methods=["GET"])
def get_shipments():

    search_query = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip()

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        conditions = []
        params = []

        if search_query:
            conditions.append("""(
                CAST(s.shipment_id AS CHAR) = %s
                OR p.tracking_number LIKE %s
                OR sender.name LIKE %s
                OR receiver.name LIKE %s
                OR origin.branch_name LIKE %s
                OR origin.city LIKE %s
                OR destination.branch_name LIKE %s
                OR destination.city LIKE %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([
                search_query,
                search_param,
                search_param,
                search_param,
                search_param,
                search_param,
                search_param,
                search_param
            ])

        if status_filter in ["Pending", "In Transit", "Out for Delivery", "Delivered"]:
            conditions.append("p.status = %s")
            params.append(status_filter)

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                s.shipment_id,
                s.parcel_id,
                s.vehicle_id,
                s.employee_id,
                DATE_FORMAT(s.shipment_date, '%Y-%m-%d %H:%i') AS shipment_date,
                p.tracking_number,
                p.weight,
                p.parcel_type,
                p.shipping_cost,
                p.status,
                DATE_FORMAT(p.booking_date, '%Y-%m-%d %H:%i') AS booking_date,
                sender.name AS sender_name,
                sender.phone AS sender_phone,
                sender.email AS sender_email,
                receiver.name AS receiver_name,
                receiver.phone AS receiver_phone,
                receiver.email AS receiver_email,
                origin.branch_id AS origin_branch_id,
                origin.branch_name AS origin_branch,
                origin.city AS origin_city,
                origin.state AS origin_state,
                destination.branch_id AS destination_branch_id,
                destination.branch_name AS destination_branch,
                destination.city AS destination_city,
                destination.state AS destination_state,
                e.name AS employee_name,
                e.role AS employee_role,
                v.vehicle_number,
                v.vehicle_type,
                COALESCE(
                    (
                        SELECT tu.location
                        FROM Tracking_Update tu
                        WHERE tu.parcel_id = p.parcel_id
                        ORDER BY tu.update_time DESC, tu.update_id DESC
                        LIMIT 1
                    ),
                    origin.city,
                    'In Transit'
                ) AS current_location
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
            JOIN Customer sender ON p.sender_id = sender.customer_id
            JOIN Customer receiver ON p.receiver_id = receiver.customer_id
            LEFT JOIN Branch origin ON p.origin_branch_id = origin.branch_id
            LEFT JOIN Branch destination ON p.destination_branch_id = destination.branch_id
            LEFT JOIN Employee e ON s.employee_id = e.employee_id
            LEFT JOIN Vehicle v ON s.vehicle_id = v.vehicle_id
            {where_clause}
            ORDER BY s.shipment_date DESC, s.shipment_id DESC
        """

        cursor.execute(query, tuple(params))
        shipments = cursor.fetchall()

        return jsonify(shipments)

    except Exception as error:
        return jsonify({"error": str(error)}), 500

    finally:
        cursor.close()
        db.close()


@app.route("/api/shipments/stats", methods=["GET"])
def get_shipment_stats():

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(s.shipment_id) AS total_shipments,
                COALESCE(SUM(CASE WHEN p.status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN p.status = 'In Transit' THEN 1 ELSE 0 END), 0) AS in_transit,
                COALESCE(SUM(CASE WHEN p.status = 'Out for Delivery' THEN 1 ELSE 0 END), 0) AS out_for_delivery,
                COALESCE(SUM(CASE WHEN p.status = 'Delivered' THEN 1 ELSE 0 END), 0) AS delivered
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
        """)

        stats = cursor.fetchone() or {}

        return jsonify({
            "total_shipments": int(stats.get("total_shipments") or 0),
            "pending": int(stats.get("pending") or 0),
            "in_transit": int(stats.get("in_transit") or 0),
            "out_for_delivery": int(stats.get("out_for_delivery") or 0),
            "delivered": int(stats.get("delivered") or 0)
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500

    finally:
        cursor.close()
        db.close()


@app.route("/api/shipments/<int:shipment_id>", methods=["GET"])
def get_shipment(shipment_id):

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                s.shipment_id,
                s.parcel_id,
                s.vehicle_id,
                s.employee_id,
                DATE_FORMAT(s.shipment_date, '%Y-%m-%d %H:%i') AS shipment_date,
                p.tracking_number,
                p.weight,
                p.parcel_type,
                p.shipping_cost,
                p.status,
                DATE_FORMAT(p.booking_date, '%Y-%m-%d %H:%i') AS booking_date,
                sender.name AS sender_name,
                sender.email AS sender_email,
                sender.phone AS sender_phone,
                sender.address AS sender_address,
                receiver.name AS receiver_name,
                receiver.email AS receiver_email,
                receiver.phone AS receiver_phone,
                receiver.address AS receiver_address,
                origin.branch_id AS origin_branch_id,
                origin.branch_name AS origin_branch,
                origin.city AS origin_city,
                origin.state AS origin_state,
                origin.phone AS origin_phone,
                origin.address AS origin_address,
                destination.branch_id AS destination_branch_id,
                destination.branch_name AS destination_branch,
                destination.city AS destination_city,
                destination.state AS destination_state,
                destination.phone AS destination_phone,
                destination.address AS destination_address,
                e.name AS employee_name,
                e.role AS employee_role,
                e.phone AS employee_phone,
                e.email AS employee_email,
                v.vehicle_number,
                v.vehicle_type,
                v.capacity AS vehicle_capacity,
                COALESCE(
                    (
                        SELECT tu.location
                        FROM Tracking_Update tu
                        WHERE tu.parcel_id = p.parcel_id
                        ORDER BY tu.update_time DESC, tu.update_id DESC
                        LIMIT 1
                    ),
                    origin.city,
                    'In Transit'
                ) AS current_location
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
            JOIN Customer sender ON p.sender_id = sender.customer_id
            JOIN Customer receiver ON p.receiver_id = receiver.customer_id
            LEFT JOIN Branch origin ON p.origin_branch_id = origin.branch_id
            LEFT JOIN Branch destination ON p.destination_branch_id = destination.branch_id
            LEFT JOIN Employee e ON s.employee_id = e.employee_id
            LEFT JOIN Vehicle v ON s.vehicle_id = v.vehicle_id
            WHERE s.shipment_id = %s
        """, (shipment_id,))

        shipment = cursor.fetchone()

        if shipment is None:
            return jsonify({"error": "Shipment not found"}), 404

        # Related tracking history for the shipment's parcel
        cursor.execute("""
            SELECT
                tu.update_id,
                tu.status,
                tu.location,
                DATE_FORMAT(tu.update_time, '%Y-%m-%d %H:%i') AS update_time,
                b.branch_name,
                b.city,
                b.state,
                e.name AS employee_name
            FROM Tracking_Update tu
            LEFT JOIN Branch b ON tu.branch_id = b.branch_id
            LEFT JOIN Employee e ON tu.employee_id = e.employee_id
            WHERE tu.parcel_id = %s
            ORDER BY tu.update_time ASC, tu.update_id ASC
        """, (shipment["parcel_id"],))

        shipment["tracking_history"] = cursor.fetchall()

        return jsonify(shipment)

    except Exception as error:
        return jsonify({"error": str(error)}), 500

    finally:
        cursor.close()
        db.close()


@app.route("/api/shipments", methods=["POST"])
def create_shipment():

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    try:
        parcel_id = int(data.get("parcel_id"))
        vehicle_id = int(data.get("vehicle_id"))
        employee_id = int(data.get("employee_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "parcel_id, vehicle_id, and employee_id must be valid integers"}), 400

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        # 1. Validate parcel
        cursor.execute("SELECT parcel_id, tracking_number, origin_branch_id, status FROM Parcel WHERE parcel_id = %s", (parcel_id,))
        parcel = cursor.fetchone()
        if not parcel:
            return jsonify({"error": "Parcel not found"}), 404

        # 2. Check if parcel already has a shipment
        cursor.execute("SELECT shipment_id FROM Shipment WHERE parcel_id = %s", (parcel_id,))
        existing_shipment = cursor.fetchone()
        if existing_shipment:
            return jsonify({"error": f"Parcel #{parcel['tracking_number']} already has an assigned shipment (#SHP-{existing_shipment['shipment_id']})"}), 409

        # 3. Validate vehicle
        cursor.execute("SELECT vehicle_id, vehicle_number, branch_id FROM Vehicle WHERE vehicle_id = %s", (vehicle_id,))
        vehicle = cursor.fetchone()
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404

        # 4. Validate employee
        cursor.execute("SELECT employee_id, name, branch_id FROM Employee WHERE employee_id = %s", (employee_id,))
        employee = cursor.fetchone()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        # 5. Insert Shipment
        cursor.execute("""
            INSERT INTO Shipment (parcel_id, vehicle_id, employee_id, shipment_date)
            VALUES (%s, %s, %s, NOW())
        """, (parcel_id, vehicle_id, employee_id))
        shipment_id = cursor.lastrowid

        # 6. If no tracking update exists yet for this parcel, insert an initial dispatch scan
        cursor.execute("SELECT COUNT(*) as count FROM Tracking_Update WHERE parcel_id = %s", (parcel_id,))
        if cursor.fetchone()["count"] == 0:
            cursor.execute("SELECT city, branch_name FROM Branch WHERE branch_id = %s", (parcel["origin_branch_id"],))
            origin_b = cursor.fetchone()
            location = f"{origin_b['branch_name']}, {origin_b['city']}" if origin_b else "Origin Hub"
            cursor.execute("""
                INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (parcel_id, parcel["origin_branch_id"], employee_id, parcel["status"] or "Pending", location))

        db.commit()

        return jsonify({
            "message": "Shipment assigned successfully",
            "shipment_id": shipment_id,
            "parcel_id": parcel_id,
            "tracking_number": parcel["tracking_number"],
            "vehicle_number": vehicle["vehicle_number"],
            "employee_name": employee["name"]
        }), 201

    except Exception as error:
        db.rollback()
        return jsonify({"error": str(error)}), 500

    finally:
        cursor.close()
        db.close()


@app.route("/api/shipments/unassigned-parcels", methods=["GET"])
def get_unassigned_parcels():

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                p.parcel_id,
                p.tracking_number,
                p.parcel_type,
                p.weight,
                p.status,
                p.origin_branch_id,
                ob.branch_name AS origin_branch,
                ob.city AS origin_city,
                p.destination_branch_id,
                db.branch_name AS destination_branch,
                db.city AS destination_city
            FROM Parcel p
            LEFT JOIN Shipment s ON p.parcel_id = s.parcel_id
            JOIN Branch ob ON p.origin_branch_id = ob.branch_id
            JOIN Branch db ON p.destination_branch_id = db.branch_id
            WHERE s.shipment_id IS NULL
            ORDER BY p.booking_date DESC
        """)
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        db.close()


# =========================================================
# VEHICLES MANAGEMENT API
# =========================================================

@app.route("/api/vehicles", methods=["GET"])
def get_vehicles():

    search_query = request.args.get("search", "").strip()
    type_filter = request.args.get("type", "").strip()
    status_filter = request.args.get("status", "").strip()
    branch_id = request.args.get("branch_id")

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        conditions = []
        params = []

        if search_query:
            conditions.append("""(
                v.vehicle_number LIKE %s
                OR v.vehicle_type LIKE %s
                OR b.branch_name LIKE %s
                OR b.city LIKE %s
                OR CAST(v.vehicle_id AS CHAR) = %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param, search_param, search_param, search_query])

        if type_filter:
            conditions.append("v.vehicle_type = %s")
            params.append(type_filter)

        if branch_id:
            conditions.append("v.branch_id = %s")
            params.append(branch_id)

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                v.vehicle_id,
                v.vehicle_number,
                v.vehicle_type,
                v.capacity,
                v.branch_id,
                b.branch_name,
                b.city,
                b.state,
                (
                    SELECT COUNT(*)
                    FROM Shipment s
                    JOIN Parcel p ON s.parcel_id = p.parcel_id
                    WHERE s.vehicle_id = v.vehicle_id
                      AND p.status IN ('Pending', 'In Transit', 'Out for Delivery')
                ) AS active_shipments
            FROM Vehicle v
            JOIN Branch b ON v.branch_id = b.branch_id
            {where_clause}
            ORDER BY v.vehicle_id ASC
        """
        cursor.execute(query, tuple(params))
        vehicles = cursor.fetchall()

        for veh in vehicles:
            veh["status"] = "In Service" if veh["active_shipments"] > 0 else "Available"

        if status_filter in ["Available", "In Service"]:
            vehicles = [v for v in vehicles if v["status"] == status_filter]

        return jsonify(vehicles)
    finally:
        cursor.close()
        db.close()


@app.route("/api/vehicles/stats", methods=["GET"])
def get_vehicle_stats():

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                COUNT(v.vehicle_id) AS total_vehicles,
                COALESCE(SUM(v.capacity), 0) AS total_capacity
            FROM Vehicle v
        """)
        base = cursor.fetchone() or {}

        cursor.execute("""
            SELECT COUNT(DISTINCT s.vehicle_id) AS in_service
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
            WHERE p.status IN ('Pending', 'In Transit', 'Out for Delivery')
        """)
        in_serv = cursor.fetchone()["in_service"] or 0

        total_v = int(base.get("total_vehicles") or 0)
        avail = max(0, total_v - int(in_serv))

        return jsonify({
            "total_vehicles": total_v,
            "in_service": int(in_serv),
            "available": avail,
            "total_capacity": float(base.get("total_capacity") or 0.0)
        })
    finally:
        cursor.close()
        db.close()


@app.route("/api/vehicles/<int:vehicle_id>", methods=["GET"])
def get_vehicle(vehicle_id):

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                v.vehicle_id,
                v.vehicle_number,
                v.vehicle_type,
                v.capacity,
                v.branch_id,
                b.branch_name,
                b.city,
                b.state,
                b.phone as branch_phone
            FROM Vehicle v
            JOIN Branch b ON v.branch_id = b.branch_id
            WHERE v.vehicle_id = %s
        """, (vehicle_id,))
        vehicle = cursor.fetchone()
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404

        cursor.execute("""
            SELECT
                s.shipment_id,
                p.tracking_number,
                p.status,
                p.parcel_type,
                p.weight,
                e.name AS employee_name,
                DATE_FORMAT(s.shipment_date, '%Y-%m-%d %H:%i') AS shipment_date
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
            LEFT JOIN Employee e ON s.employee_id = e.employee_id
            WHERE s.vehicle_id = %s
            ORDER BY s.shipment_date DESC
            LIMIT 10
        """, (vehicle_id,))
        vehicle["recent_shipments"] = cursor.fetchall()
        vehicle["status"] = "In Service" if any(s["status"] in ['Pending', 'In Transit', 'Out for Delivery'] for s in vehicle["recent_shipments"]) else "Available"

        return jsonify(vehicle)
    finally:
        cursor.close()
        db.close()


# =========================================================
# EMPLOYEES API
# =========================================================

@app.route("/api/employees", methods=["GET"])
def get_employees():
    branch_id = request.args.get("branch_id")
    search_query = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip()

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        conditions = []
        params = []

        if branch_id:
            conditions.append("e.branch_id = %s")
            params.append(branch_id)

        if status_filter:
            conditions.append("e.status = %s")
            params.append(status_filter)

        if search_query:
            conditions.append("""(
                e.name LIKE %s
                OR e.email LIKE %s
                OR e.phone LIKE %s
                OR e.role LIKE %s
                OR b.branch_name LIKE %s
                OR b.city LIKE %s
                OR CAST(e.employee_id AS CHAR) = %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param, search_param, search_param, search_param, search_param, search_query])

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                e.employee_id,
                e.name,
                e.phone,
                e.email,
                e.role,
                e.branch_id,
                e.status,
                b.branch_name,
                b.city,
                (SELECT COUNT(*) FROM Shipment s WHERE s.employee_id = e.employee_id) AS total_shipments,
                (
                    SELECT COUNT(*)
                    FROM Shipment s
                    JOIN Parcel p ON s.parcel_id = p.parcel_id
                    WHERE s.employee_id = e.employee_id
                      AND p.status IN ('Pending', 'In Transit', 'Out for Delivery')
                ) AS active_shipments
            FROM Employee e
            JOIN Branch b ON e.branch_id = b.branch_id
            {where_clause}
            ORDER BY e.employee_id ASC
        """
        cursor.execute(query, tuple(params))
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        db.close()


@app.route("/api/employees/stats", methods=["GET"])
def get_employee_stats():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS total_employees FROM Employee")
        total_employees = cursor.fetchone()["total_employees"] or 0

        cursor.execute("SELECT COUNT(*) AS active_employees FROM Employee WHERE status = 'Active'")
        active_employees = cursor.fetchone()["active_employees"] or 0

        cursor.execute("SELECT COUNT(*) AS inactive_employees FROM Employee WHERE status = 'Inactive'")
        inactive_employees = cursor.fetchone()["inactive_employees"] or 0

        return jsonify({
            "total_employees": total_employees,
            "active_employees": active_employees,
            "inactive_employees": inactive_employees
        })
    finally:
        cursor.close()
        db.close()


@app.route("/api/employees/<int:employee_id>", methods=["GET"])
def get_employee(employee_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                e.employee_id,
                e.name,
                e.phone,
                e.email,
                e.role,
                e.branch_id,
                e.status,
                b.branch_name,
                b.city,
                b.state,
                b.address AS branch_address
            FROM Employee e
            JOIN Branch b ON e.branch_id = b.branch_id
            WHERE e.employee_id = %s
        """, (employee_id,))
        employee = cursor.fetchone()

        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        # Recent shipments handled by this employee
        cursor.execute("""
            SELECT
                s.shipment_id,
                p.parcel_id,
                p.tracking_number,
                p.status AS parcel_status,
                p.parcel_type,
                p.weight,
                DATE_FORMAT(s.shipment_date, '%Y-%m-%d %H:%i') AS shipment_date,
                COALESCE(v.vehicle_number, 'N/A') AS vehicle_number,
                COALESCE(v.vehicle_type, 'Standard') AS vehicle_type,
                ob.city AS origin_city,
                db.city AS destination_city
            FROM Shipment s
            JOIN Parcel p ON s.parcel_id = p.parcel_id
            LEFT JOIN Vehicle v ON s.vehicle_id = v.vehicle_id
            JOIN Branch ob ON p.origin_branch_id = ob.branch_id
            JOIN Branch db ON p.destination_branch_id = db.branch_id
            WHERE s.employee_id = %s
            ORDER BY s.shipment_date DESC
            LIMIT 15
        """, (employee_id,))
        employee["shipments"] = cursor.fetchall()
        employee["total_shipments"] = len(employee["shipments"])
        employee["active_shipments"] = sum(1 for s in employee["shipments"] if s["parcel_status"] in ['Pending', 'In Transit', 'Out for Delivery'])

        return jsonify(employee)
    finally:
        cursor.close()
        db.close()


@app.route("/api/employees", methods=["POST"])
def create_employee():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip()
    role = data.get("role", "").strip()
    branch_id = data.get("branch_id")
    status = data.get("status", "Active").strip()

    if not name:
        return jsonify({"error": "Employee name is required"}), 400
    if not phone or not phone.isdigit() or len(phone) != 10:
        return jsonify({"error": "Phone number must be exactly 10 digits"}), 400
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Please enter a valid email address"}), 400
    if not role:
        return jsonify({"error": "Designation/Role is required"}), 400
    if not branch_id:
        return jsonify({"error": "Assigned Branch is required"}), 400

    if status not in ["Active", "Inactive"]:
        status = "Active"

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        # Check if email is unique
        cursor.execute("SELECT employee_id FROM Employee WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "An employee with this email already exists"}), 409

        # Check if branch exists
        cursor.execute("SELECT branch_id FROM Branch WHERE branch_id = %s", (branch_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Selected branch does not exist"}), 404

        cursor.execute("""
            INSERT INTO Employee (name, phone, email, role, branch_id, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (name, phone, email, role, branch_id, status))
        db.commit()

        new_id = cursor.lastrowid
        return jsonify({
            "message": "Employee created successfully",
            "employee_id": new_id
        }), 201
    finally:
        cursor.close()
        db.close()


@app.route("/api/employees/<int:employee_id>", methods=["PUT"])
def update_employee(employee_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip()
    role = data.get("role", "").strip()
    branch_id = data.get("branch_id")
    status = data.get("status", "Active").strip()

    if not name:
        return jsonify({"error": "Employee name is required"}), 400
    if not phone or not phone.isdigit() or len(phone) != 10:
        return jsonify({"error": "Phone number must be exactly 10 digits"}), 400
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Please enter a valid email address"}), 400
    if not role:
        return jsonify({"error": "Designation/Role is required"}), 400
    if not branch_id:
        return jsonify({"error": "Assigned Branch is required"}), 400

    if status not in ["Active", "Inactive"]:
        status = "Active"

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        # Check employee exists
        cursor.execute("SELECT employee_id FROM Employee WHERE employee_id = %s", (employee_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Employee not found"}), 404

        # Check email uniqueness across other employees
        cursor.execute("SELECT employee_id FROM Employee WHERE email = %s AND employee_id != %s", (email, employee_id))
        if cursor.fetchone():
            return jsonify({"error": "Another employee with this email already exists"}), 409

        # Check branch exists
        cursor.execute("SELECT branch_id FROM Branch WHERE branch_id = %s", (branch_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Selected branch does not exist"}), 404

        # If deactivating, verify no active shipments
        if status == "Inactive":
            cursor.execute("""
                SELECT COUNT(*) AS active_count
                FROM Shipment s
                JOIN Parcel p ON s.parcel_id = p.parcel_id
                WHERE s.employee_id = %s
                  AND p.status IN ('Pending', 'In Transit', 'Out for Delivery')
            """, (employee_id,))
            active_cnt = cursor.fetchone()["active_count"]
            if active_cnt > 0:
                return jsonify({"error": f"Cannot set employee to Inactive: Currently assigned to {active_cnt} active shipment(s) in progress"}), 400

        cursor.execute("""
            UPDATE Employee
            SET name = %s, phone = %s, email = %s, role = %s, branch_id = %s, status = %s
            WHERE employee_id = %s
        """, (name, phone, email, role, branch_id, status, employee_id))
        db.commit()

        return jsonify({"message": "Employee updated successfully"})
    finally:
        cursor.close()
        db.close()


@app.route("/api/employees/<int:employee_id>/status", methods=["PATCH"])
def toggle_employee_status(employee_id):
    data = request.get_json() or {}
    new_status = data.get("status")

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT employee_id, status FROM Employee WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"error": "Employee not found"}), 404

        if not new_status:
            new_status = "Inactive" if emp["status"] == "Active" else "Active"

        if new_status not in ["Active", "Inactive"]:
            return jsonify({"error": "Status must be 'Active' or 'Inactive'"}), 400

        # Safe deactivation check
        if new_status == "Inactive":
            cursor.execute("""
                SELECT COUNT(*) AS active_count
                FROM Shipment s
                JOIN Parcel p ON s.parcel_id = p.parcel_id
                WHERE s.employee_id = %s
                  AND p.status IN ('Pending', 'In Transit', 'Out for Delivery')
            """, (employee_id,))
            active_cnt = cursor.fetchone()["active_count"]
            if active_cnt > 0:
                return jsonify({"error": f"Safe Deactivation Blocked: Employee is actively assigned to {active_cnt} parcel(s) in delivery/transit. Reassign before deactivating."}), 400

        cursor.execute("UPDATE Employee SET status = %s WHERE employee_id = %s", (new_status, employee_id))
        db.commit()

        return jsonify({
            "message": f"Employee status updated to {new_status}",
            "status": new_status
        })
    finally:
        cursor.close()
        db.close()


@app.route("/api/employees/<int:employee_id>", methods=["DELETE"])
def delete_employee(employee_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT employee_id FROM Employee WHERE employee_id = %s", (employee_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Employee not found"}), 404

        # Check references in Shipment, Tracking_Update, or Delivery to preserve historical records
        cursor.execute("SELECT COUNT(*) AS cnt FROM Shipment WHERE employee_id = %s", (employee_id,))
        shipment_refs = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) AS cnt FROM Tracking_Update WHERE employee_id = %s", (employee_id,))
        tracking_refs = cursor.fetchone()["cnt"]

        if shipment_refs > 0 or tracking_refs > 0:
            return jsonify({
                "error": f"Cannot delete employee with historical records ({shipment_refs} shipments, {tracking_refs} tracking updates). Please use safe deactivation instead."
            }), 409

        cursor.execute("DELETE FROM Employee WHERE employee_id = %s", (employee_id,))
        db.commit()

        return jsonify({"message": "Employee deleted successfully"})
    finally:
        cursor.close()
        db.close()


# =========================================================
# PAYMENTS API
# =========================================================

@app.route("/api/payments", methods=["GET"])
def get_payments():
    search_query = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip()
    method_filter = (request.args.get("payment_method") or request.args.get("method") or "").strip()

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        conditions = []
        params = []

        if status_filter:
            conditions.append("py.payment_status = %s")
            params.append(status_filter)

        if method_filter:
            conditions.append("py.payment_method = %s")
            params.append(method_filter)

        if search_query:
            conditions.append("""(
                CAST(py.payment_id AS CHAR) = %s
                OR p.tracking_number LIKE %s
                OR c.name LIKE %s
                OR c.email LIKE %s
                OR c.phone LIKE %s
                OR py.payment_method LIKE %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_query, search_param, search_param, search_param, search_param, search_param])

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                py.payment_id,
                py.parcel_id,
                py.customer_id,
                py.amount,
                py.payment_method,
                py.payment_status,
                DATE_FORMAT(py.payment_date, '%Y-%m-%d %H:%i') AS payment_date,
                p.tracking_number,
                p.status AS parcel_status,
                p.parcel_type,
                p.shipping_cost,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                ob.city AS origin_city,
                db.city AS destination_city
            FROM Payment py
            JOIN Parcel p ON py.parcel_id = p.parcel_id
            JOIN Customer c ON py.customer_id = c.customer_id
            JOIN Branch ob ON p.origin_branch_id = ob.branch_id
            JOIN Branch db ON p.destination_branch_id = db.branch_id
            {where_clause}
            ORDER BY py.payment_id DESC
        """
        cursor.execute(query, tuple(params))
        payments = cursor.fetchall()

        # Format amount as float for JSON
        for py in payments:
            py["amount"] = float(py["amount"])
            py["shipping_cost"] = float(py["shipping_cost"])

        return jsonify(payments)
    finally:
        cursor.close()
        db.close()


@app.route("/api/payments/stats", methods=["GET"])
def get_payment_stats():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS total_payments FROM Payment")
        total_payments = cursor.fetchone()["total_payments"] or 0

        cursor.execute("SELECT COUNT(*) AS successful_payments FROM Payment WHERE payment_status = 'Paid'")
        successful_payments = cursor.fetchone()["successful_payments"] or 0

        cursor.execute("SELECT COUNT(*) AS pending_payments FROM Payment WHERE payment_status = 'Unpaid'")
        pending_payments = cursor.fetchone()["pending_payments"] or 0

        cursor.execute("SELECT COUNT(*) AS refunded_payments FROM Payment WHERE payment_status = 'Refunded'")
        refunded_payments = cursor.fetchone()["refunded_payments"] or 0

        # Only 'Paid' counts towards collected revenue. Pending/Refunded do not.
        cursor.execute("SELECT COALESCE(SUM(amount), 0) AS total_collected FROM Payment WHERE payment_status = 'Paid'")
        total_collected = float(cursor.fetchone()["total_collected"] or 0)

        return jsonify({
            "total_payments": total_payments,
            "successful_payments": successful_payments,
            "pending_payments": pending_payments,
            "refunded_payments": refunded_payments,
            "total_collected": total_collected
        })
    finally:
        cursor.close()
        db.close()


@app.route("/api/payments/unpaid-parcels", methods=["GET"])
def get_unpaid_parcels():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                p.parcel_id,
                p.tracking_number,
                p.sender_id AS customer_id,
                c.name AS customer_name,
                c.email AS customer_email,
                p.shipping_cost,
                p.status AS parcel_status,
                p.parcel_type
            FROM Parcel p
            JOIN Customer c ON p.sender_id = c.customer_id
            LEFT JOIN Payment py ON p.parcel_id = py.parcel_id
            WHERE py.payment_id IS NULL
            ORDER BY p.parcel_id DESC
        """)
        parcels = cursor.fetchall()
        for p in parcels:
            p["shipping_cost"] = float(p["shipping_cost"])
        return jsonify(parcels)
    finally:
        cursor.close()
        db.close()


@app.route("/api/payments/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                py.payment_id,
                py.parcel_id,
                py.customer_id,
                py.amount,
                py.payment_method,
                py.payment_status,
                DATE_FORMAT(py.payment_date, '%Y-%m-%d %H:%i') AS payment_date,
                p.tracking_number,
                p.status AS parcel_status,
                p.parcel_type,
                p.weight,
                p.shipping_cost,
                DATE_FORMAT(p.booking_date, '%Y-%m-%d %H:%i') AS booking_date,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                c.address AS customer_address,
                ob.branch_name AS origin_branch,
                ob.city AS origin_city,
                db_branch.branch_name AS destination_branch,
                db_branch.city AS destination_city
            FROM Payment py
            JOIN Parcel p ON py.parcel_id = p.parcel_id
            JOIN Customer c ON py.customer_id = c.customer_id
            JOIN Branch ob ON p.origin_branch_id = ob.branch_id
            JOIN Branch db_branch ON p.destination_branch_id = db_branch.branch_id
            WHERE py.payment_id = %s
        """, (payment_id,))
        payment = cursor.fetchone()

        if not payment:
            return jsonify({"error": "Payment record not found"}), 404

        payment["amount"] = float(payment["amount"])
        payment["shipping_cost"] = float(payment["shipping_cost"])
        payment["weight"] = float(payment["weight"])

        return jsonify(payment)
    finally:
        cursor.close()
        db.close()


@app.route("/api/payments", methods=["POST"])
def create_payment():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    parcel_id = data.get("parcel_id")
    customer_id = data.get("customer_id")
    amount = data.get("amount")
    payment_method = data.get("payment_method", "").strip()
    payment_status = data.get("payment_status", "Paid").strip()

    if not parcel_id:
        return jsonify({"error": "Parcel ID is required"}), 400
    if not payment_method:
        return jsonify({"error": "Payment method is required"}), 400
    if payment_status not in ["Unpaid", "Paid", "Refunded"]:
        payment_status = "Paid"

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        # 1. Verify parcel exists
        cursor.execute("SELECT parcel_id, sender_id, shipping_cost FROM Parcel WHERE parcel_id = %s", (parcel_id,))
        parcel = cursor.fetchone()
        if not parcel:
            return jsonify({"error": "Parcel not found"}), 404

        # 2. Check if payment already exists for this parcel (enforces UNIQUE constraint)
        cursor.execute("SELECT payment_id FROM Payment WHERE parcel_id = %s", (parcel_id,))
        if cursor.fetchone():
            return jsonify({"error": "A payment record already exists for this parcel"}), 409

        # Auto-derive customer_id from parcel sender if not provided
        if not customer_id:
            customer_id = parcel["sender_id"]

        # Validate customer exists
        cursor.execute("SELECT customer_id FROM Customer WHERE customer_id = %s", (customer_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Customer not found"}), 404

        # Amount validation
        if amount is None or amount == "":
            amount = parcel["shipping_cost"]
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than zero"}), 400
        except ValueError:
            return jsonify({"error": "Invalid amount format"}), 400

        payment_date = datetime.now() if payment_status == "Paid" else None

        cursor.execute("""
            INSERT INTO Payment (parcel_id, customer_id, amount, payment_method, payment_status, payment_date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (parcel_id, customer_id, amount, payment_method, payment_status, payment_date))
        db.commit()

        new_id = cursor.lastrowid
        return jsonify({
            "message": "Payment record created successfully",
            "payment_id": new_id
        }), 201
    finally:
        cursor.close()
        db.close()


@app.route("/api/payments/<int:payment_id>/status", methods=["PATCH"])
def update_payment_status(payment_id):
    data = request.get_json() or {}
    new_status = data.get("status")

    if new_status not in ["Unpaid", "Paid", "Refunded"]:
        return jsonify({"error": "Invalid payment status. Must be 'Unpaid', 'Paid', or 'Refunded'"}), 400

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT payment_id, payment_date FROM Payment WHERE payment_id = %s", (payment_id,))
        py = cursor.fetchone()
        if not py:
            return jsonify({"error": "Payment record not found"}), 404

        if new_status == "Paid":
            payment_date = py["payment_date"] or datetime.now()
        else:
            payment_date = py["payment_date"]

        cursor.execute("""
            UPDATE Payment
            SET payment_status = %s, payment_date = %s
            WHERE payment_id = %s
        """, (new_status, payment_date, payment_id))
        db.commit()

        return jsonify({
            "message": f"Payment status updated to {new_status}",
            "payment_status": new_status
        })
    finally:
        cursor.close()
        db.close()


# =========================================================
# GENERATE QR CODE FOR PAYMENTS
# =========================================================

@app.route("/api/payments/<int:payment_id>/qr", methods=["GET"])
def get_payment_qr(payment_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                py.payment_id,
                py.parcel_id,
                py.customer_id,
                py.amount,
                py.payment_method,
                py.payment_status,
                p.tracking_number,
                c.name AS customer_name
            FROM Payment py
            JOIN Parcel p ON py.parcel_id = p.parcel_id
            JOIN Customer c ON py.customer_id = c.customer_id
            WHERE py.payment_id = %s
        """, (payment_id,))
        payment = cursor.fetchone()

        if not payment:
            return jsonify({"error": "Payment record not found for QR generation"}), 404

        amount_val = float(payment["amount"])
        tracking = payment["tracking_number"]
        ref_code = f"CX-PAY-{payment_id:05d}"

        # Standard UPI reference format with clearly defined demo parameters
        upi_payload = (
            f"upi://pay?pa=courierx.demo@bank"
            f"&pn=CourierX"
            f"&tr={ref_code}"
            f"&am={amount_val:.2f}"
            f"&cu=INR"
            f"&tn=CX-Ref-{tracking}"
        )

        # Generate standard SVG in pure Python
        svg_content, version, mask = generate_qr_svg(upi_payload, quiet_zone=4, scale=7)

        return jsonify({
            "payment_id": payment_id,
            "reference": ref_code,
            "tracking_number": tracking,
            "customer_name": payment["customer_name"],
            "amount": amount_val,
            "payment_status": payment["payment_status"],
            "payment_method": payment["payment_method"],
            "payload": upi_payload,
            "qr_svg": svg_content,
            "is_demo": True,
            "badge": "Demo QR — No Money Transferred",
            "disclaimer": "This demonstration QR code encodes a verified CourierX payment reference. It does not initiate a real banking transaction or modify database records."
        })
    finally:
        cursor.close()
        db.close()


# =========================================================
# FEEDBACK API
# =========================================================

@app.route("/api/feedback", methods=["GET"])
def get_feedback():
    search_query = request.args.get("search", "").strip()
    rating_filter = request.args.get("rating", "").strip()

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        conditions = []
        params = []

        if rating_filter and rating_filter.isdigit():
            conditions.append("fb.rating = %s")
            params.append(int(rating_filter))

        if search_query:
            conditions.append("""(
                CAST(fb.feedback_id AS CHAR) = %s
                OR p.tracking_number LIKE %s
                OR c.name LIKE %s
                OR c.email LIKE %s
                OR fb.comments LIKE %s
            )""")
            search_param = f"%{search_query}%"
            params.extend([search_query, search_param, search_param, search_param, search_param])

        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT
                fb.feedback_id,
                fb.parcel_id,
                fb.customer_id,
                fb.rating,
                fb.comments,
                DATE_FORMAT(fb.feedback_date, '%Y-%m-%d %H:%i') AS feedback_date,
                p.tracking_number,
                p.status AS parcel_status,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone
            FROM Feedback fb
            JOIN Parcel p ON fb.parcel_id = p.parcel_id
            JOIN Customer c ON fb.customer_id = c.customer_id
            {where_clause}
            ORDER BY fb.feedback_id DESC
        """
        cursor.execute(query, tuple(params))
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        db.close()


@app.route("/api/feedback/stats", methods=["GET"])
def get_feedback_stats():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS total_feedback, ROUND(COALESCE(AVG(rating), 0), 1) AS average_rating FROM Feedback")
        res = cursor.fetchone()
        total_feedback = res["total_feedback"] or 0
        avg_rating = float(res["average_rating"] or 0)

        # Rating distribution
        cursor.execute("""
            SELECT rating, COUNT(*) AS cnt
            FROM Feedback
            GROUP BY rating
        """)
        counts = {str(i): 0 for i in range(1, 6)}
        for r in cursor.fetchall():
            counts[str(r["rating"])] = r["cnt"]

        return jsonify({
            "total_feedback": total_feedback,
            "average_rating": avg_rating,
            "distribution": counts
        })
    finally:
        cursor.close()
        db.close()


@app.route("/api/feedback/eligible-parcels", methods=["GET"])
def get_eligible_feedback_parcels():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                p.parcel_id,
                p.tracking_number,
                p.sender_id AS customer_id,
                c.name AS customer_name,
                p.status AS parcel_status,
                p.parcel_type
            FROM Parcel p
            JOIN Customer c ON p.sender_id = c.customer_id
            LEFT JOIN Feedback fb ON p.parcel_id = fb.parcel_id
            WHERE fb.feedback_id IS NULL
            ORDER BY p.parcel_id DESC
        """)
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        db.close()


@app.route("/api/feedback/<int:feedback_id>", methods=["GET"])
def get_feedback_detail(feedback_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                fb.feedback_id,
                fb.parcel_id,
                fb.customer_id,
                fb.rating,
                fb.comments,
                DATE_FORMAT(fb.feedback_date, '%Y-%m-%d %H:%i') AS feedback_date,
                p.tracking_number,
                p.status AS parcel_status,
                p.parcel_type,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone
            FROM Feedback fb
            JOIN Parcel p ON fb.parcel_id = p.parcel_id
            JOIN Customer c ON fb.customer_id = c.customer_id
            WHERE fb.feedback_id = %s
        """, (feedback_id,))
        fb = cursor.fetchone()
        if not fb:
            return jsonify({"error": "Feedback record not found"}), 404
        return jsonify(fb)
    finally:
        cursor.close()
        db.close()


@app.route("/api/feedback", methods=["POST"])
def create_feedback():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    parcel_id = data.get("parcel_id")
    customer_id = data.get("customer_id")
    rating = data.get("rating")
    comments = data.get("comments", "").strip()

    if not parcel_id:
        return jsonify({"error": "Parcel ID is required"}), 400

    if rating is None or str(rating).strip() == "":
        return jsonify({"error": "Rating is required"}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be between 1 and 5"}), 400
    except ValueError:
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    if len(comments) > 500:
        return jsonify({"error": "Comments must not exceed 500 characters"}), 400

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        # Verify parcel exists
        cursor.execute("SELECT parcel_id, sender_id FROM Parcel WHERE parcel_id = %s", (parcel_id,))
        parcel = cursor.fetchone()
        if not parcel:
            return jsonify({"error": "Parcel not found"}), 404

        # Enforce unique feedback per parcel
        cursor.execute("SELECT feedback_id FROM Feedback WHERE parcel_id = %s", (parcel_id,))
        if cursor.fetchone():
            return jsonify({"error": "Feedback has already been submitted for this parcel"}), 409

        if not customer_id:
            customer_id = parcel["sender_id"]

        # Verify customer exists
        cursor.execute("SELECT customer_id FROM Customer WHERE customer_id = %s", (customer_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Customer not found"}), 404

        cursor.execute("""
            INSERT INTO Feedback (parcel_id, customer_id, rating, comments, feedback_date)
            VALUES (%s, %s, %s, %s, %s)
        """, (parcel_id, customer_id, rating, comments, datetime.now()))
        db.commit()

        new_id = cursor.lastrowid
        return jsonify({
            "message": "Feedback submitted successfully",
            "feedback_id": new_id
        }), 201
    finally:
        cursor.close()
        db.close()


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )