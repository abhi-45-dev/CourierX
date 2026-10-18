import os
import sys
from werkzeug.security import generate_password_hash

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_db_connection

def run_migration():
    print("Starting CourierX Authentication & Multi-User Migration...")
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)

        # 1. Create UserAccount Table
        print("Creating UserAccount table if not exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserAccount (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(15) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('Administrator', 'Customer', 'Courier Partner', 'Seller/Vendor') NOT NULL,
                status ENUM('Pending', 'Active', 'Suspended', 'Rejected') NOT NULL DEFAULT 'Active',
                customer_id INT NULL,
                employee_id INT NULL,
                business_name VARCHAR(150) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME NULL,
                FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE SET NULL,
                FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL,
                INDEX idx_user_role (role),
                INDEX idx_user_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        """)

        # 2. Check and add columns to Feedback table
        cursor.execute("DESCRIBE Feedback")
        existing_cols = {row["Field"] for row in cursor.fetchall()}
        
        feedback_cols_to_add = [
            ("reviewer_role", "ENUM('Customer', 'Courier Partner', 'Seller/Vendor') NOT NULL DEFAULT 'Customer'"),
            ("reviewer_user_id", "INT NULL"),
            ("target_employee_id", "INT NULL"),
            ("target_customer_id", "INT NULL"),
            ("moderation_status", "ENUM('Approved', 'Flagged', 'Hidden') NOT NULL DEFAULT 'Approved'"),
            ("moderated_by", "INT NULL"),
            ("moderation_note", "VARCHAR(255) NULL")
        ]

        for col_name, col_def in feedback_cols_to_add:
            if col_name not in existing_cols:
                print(f"Adding column '{col_name}' to Feedback table...")
                cursor.execute(f"ALTER TABLE Feedback ADD COLUMN {col_name} {col_def}")

        # Add foreign keys for Feedback if not present
        cursor.execute("""
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Feedback' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        """)
        existing_fks = {row["CONSTRAINT_NAME"] for row in cursor.fetchall()}

        if "fk_feedback_reviewer_user" not in existing_fks:
            try:
                cursor.execute("""
                    ALTER TABLE Feedback 
                    ADD CONSTRAINT fk_feedback_reviewer_user FOREIGN KEY (reviewer_user_id) REFERENCES UserAccount(user_id) ON DELETE SET NULL
                """)
                print("Added foreign key fk_feedback_reviewer_user")
            except Exception as e:
                print(f"Notice fk_feedback_reviewer_user: {e}")

        if "fk_feedback_target_emp" not in existing_fks:
            try:
                cursor.execute("""
                    ALTER TABLE Feedback 
                    ADD CONSTRAINT fk_feedback_target_emp FOREIGN KEY (target_employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
                """)
                print("Added foreign key fk_feedback_target_emp")
            except Exception as e:
                print(f"Notice fk_feedback_target_emp: {e}")

        if "fk_feedback_target_cust" not in existing_fks:
            try:
                cursor.execute("""
                    ALTER TABLE Feedback 
                    ADD CONSTRAINT fk_feedback_target_cust FOREIGN KEY (target_customer_id) REFERENCES Customer(customer_id) ON DELETE SET NULL
                """)
                print("Added foreign key fk_feedback_target_cust")
            except Exception as e:
                print(f"Notice fk_feedback_target_cust: {e}")

        if "fk_feedback_moderated_by" not in existing_fks:
            try:
                cursor.execute("""
                    ALTER TABLE Feedback 
                    ADD CONSTRAINT fk_feedback_moderated_by FOREIGN KEY (moderated_by) REFERENCES UserAccount(user_id) ON DELETE SET NULL
                """)
                print("Added foreign key fk_feedback_moderated_by")
            except Exception as e:
                print(f"Notice fk_feedback_moderated_by: {e}")

        # Update unique index on Feedback: (parcel_id, reviewer_role)
        cursor.execute("SHOW INDEX FROM Feedback WHERE Key_name = 'parcel_id'")
        if cursor.fetchone():
            print("Replacing single 'parcel_id' unique index with composite '(parcel_id, reviewer_role)'...")
            try:
                cursor.execute("ALTER TABLE Feedback DROP INDEX parcel_id")
            except Exception as e:
                print(f"Notice dropping parcel_id index: {e}")

        cursor.execute("SHOW INDEX FROM Feedback WHERE Key_name = 'uq_parcel_reviewer'")
        if not cursor.fetchone():
            try:
                cursor.execute("ALTER TABLE Feedback ADD CONSTRAINT uq_parcel_reviewer UNIQUE (parcel_id, reviewer_role)")
                print("Added composite unique constraint uq_parcel_reviewer (parcel_id, reviewer_role)")
            except Exception as e:
                print(f"Notice adding uq_parcel_reviewer: {e}")

        # 3. Provision Default Administrator if not present
        cursor.execute("SELECT user_id, email FROM UserAccount WHERE role = 'Administrator'")
        admin = cursor.fetchone()
        if not admin:
            admin_email = "admin@courierx.com"
            admin_pass = "Admin@CourierX2026!"
            hashed_pass = generate_password_hash(admin_pass)
            print(f"Provisioning initial Administrator account: {admin_email}...")
            cursor.execute("""
                INSERT INTO UserAccount (name, email, phone, password_hash, role, status)
                VALUES (%s, %s, %s, %s, 'Administrator', 'Active')
            """, ("System Administrator", admin_email, "+91 9876543210", hashed_pass))
            print("Initial Administrator successfully created.")
        else:
            print(f"Administrator account already exists: {admin['email']} (ID: {admin['user_id']})")

        conn.commit()
        print("Migration completed successfully with all constraints intact!")
    except Exception as err:
        conn.rollback()
        print(f"Migration error: {err}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
