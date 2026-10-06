from flask import Flask, jsonify, render_template, request
from db import get_db_connection

import secrets
import string
import re


app = Flask(
    __name__,
    template_folder="../templates",
    static_folder="../static"
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

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                customer_id,
                name,
                email,
                phone,
                address
            FROM Customer
            ORDER BY customer_id
        """)

        return jsonify(cursor.fetchall())

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
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )