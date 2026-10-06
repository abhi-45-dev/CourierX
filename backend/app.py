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
# BRANCHES
# =========================================================

@app.route("/api/branches", methods=["GET"])
def get_branches():

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                branch_id,
                branch_name AS name,
                city,
                state,
                address,
                phone
            FROM Branch
            ORDER BY branch_id
        """)

        return jsonify(cursor.fetchall())

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

    db = get_db_connection()

    try:
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT

                p.parcel_id,
                p.tracking_number,

                sender.name
                    AS sender_name,

                receiver.name
                    AS receiver_name,


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


            ORDER BY
                p.booking_date DESC
        """)

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
            SELECT branch_id
            FROM Branch
            WHERE branch_id = %s
        """, (
            origin_branch_id,
        ))


        if cursor.fetchone() is None:

            return jsonify({
                "error":
                    "Origin branch does not exist"
            }), 400


        # -------------------------------------------------
        # CHECK DESTINATION BRANCH
        # -------------------------------------------------

        cursor.execute("""
            SELECT branch_id
            FROM Branch
            WHERE branch_id = %s
        """, (
            destination_branch_id,
        ))


        if cursor.fetchone() is None:

            return jsonify({
                "error":
                    "Destination branch does not exist"
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