import functools
import os
import re
from datetime import datetime
from flask import jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db_connection

# Role Constants
ROLE_ADMIN = "Administrator"
ROLE_CUSTOMER = "Customer"
ROLE_COURIER = "Courier Partner"
ROLE_VENDOR = "Seller/Vendor"
ALL_ROLES = [ROLE_ADMIN, ROLE_CUSTOMER, ROLE_COURIER, ROLE_VENDOR]

# Account Statuses
STATUS_PENDING = "Pending"
STATUS_ACTIVE = "Active"
STATUS_SUSPENDED = "Suspended"
STATUS_REJECTED = "Rejected"


def hash_password(password: str) -> str:
    """Hashes a password using Werkzeug's secure hashing algorithm."""
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Verifies a plain password against the stored hash, with typo tolerance for accidental spacing."""
    if not password_hash or not password:
        return False
    if check_password_hash(password_hash, password):
        return True
    # Tolerates leading/trailing accidental space
    if check_password_hash(password_hash, password.strip()):
        return True
    # Tolerates accidental space before punctuation (e.g., 'Admin@CourierX2026 !' -> 'Admin@CourierX2026!')
    cleaned = re.sub(r'\s+([!@#$%^&*])', r'\1', password).strip()
    if cleaned != password and check_password_hash(password_hash, cleaned):
        return True
    return False


def validate_email(email: str) -> bool:
    """Validates email format using regex."""
    if not email or not isinstance(email, str):
        return False
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email.strip()))


def validate_phone(phone: str) -> bool:
    """Validates phone number format."""
    if not phone or not isinstance(phone, str):
        return False
    cleaned = re.sub(r"[\s\-\(\)\+]", "", phone)
    return len(cleaned) >= 7 and cleaned.isdigit()


def get_current_user():
    """
    Retrieves the currently authenticated user from the Flask session.
    Returns user dict or None if unauthenticated.
    """
    user_id = session.get("user_id")
    if not user_id:
        return None

    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.status,
                u.customer_id,
                u.employee_id,
                u.business_name,
                u.created_at,
                u.last_login,
                c.address AS customer_address,
                e.branch_id AS employee_branch_id,
                b.branch_name AS employee_branch_name,
                b.city AS employee_branch_city
            FROM UserAccount u
            LEFT JOIN Customer c ON u.customer_id = c.customer_id
            LEFT JOIN Employee e ON u.employee_id = e.employee_id
            LEFT JOIN Branch b ON e.branch_id = b.branch_id
            WHERE u.user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if not user or user["status"] != STATUS_ACTIVE:
            # If account is deleted, suspended or rejected, invalidate session
            return None
        return user
    except Exception:
        return None
    finally:
        cursor.close()
        db.close()


def login_required(f):
    """Decorator ensuring request has an authenticated, active session."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                "error": "Authentication required. Please log in to proceed.",
                "authenticated": False
            }), 401
        return f(*args, **kwargs)
    return decorated_function


def role_required(*allowed_roles):
    """
    Decorator ensuring current user has one of the allowed roles.
    Example: @role_required('Administrator', 'Courier Partner')
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({
                    "error": "Authentication required. Please log in to proceed.",
                    "authenticated": False
                }), 401
            if user["role"] not in allowed_roles:
                return jsonify({
                    "error": f"Access forbidden. Your role '{user['role']}' lacks permission for this operation.",
                    "required_roles": list(allowed_roles),
                    "current_role": user["role"]
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
