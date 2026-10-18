-- =========================================================
-- COURIERX AUTHENTICATION & MULTI-USER ROLE MIGRATION
-- Database: courier_management (MySQL)
-- Safe, additive migration preserving all existing records.
-- =========================================================

USE courier_management;

-- 1. Create UserAccount Table
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

-- 2. Safely Extend Feedback Table with Reviewer Role & Moderation
-- Note: Handled idempotently by backend/migrate_auth.py to verify column existence.
