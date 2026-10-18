-- =========================================================
-- COURIERX AUTHENTICATION & MULTI-USER ROLE ROLLBACK SCRIPT
-- Reverses migration_auth.sql safely
-- =========================================================

USE courier_management;

-- 1. Restore Feedback unique key and drop additive columns
ALTER TABLE Feedback DROP FOREIGN KEY IF EXISTS fk_feedback_reviewer_user;
ALTER TABLE Feedback DROP FOREIGN KEY IF EXISTS fk_feedback_target_emp;
ALTER TABLE Feedback DROP FOREIGN KEY IF EXISTS fk_feedback_target_cust;
ALTER TABLE Feedback DROP FOREIGN KEY IF EXISTS fk_feedback_moderated_by;

ALTER TABLE Feedback DROP INDEX IF EXISTS uq_parcel_reviewer;
ALTER TABLE Feedback ADD UNIQUE KEY parcel_id (parcel_id);

ALTER TABLE Feedback DROP COLUMN IF EXISTS reviewer_role;
ALTER TABLE Feedback DROP COLUMN IF EXISTS reviewer_user_id;
ALTER TABLE Feedback DROP COLUMN IF EXISTS target_employee_id;
ALTER TABLE Feedback DROP COLUMN IF EXISTS target_customer_id;
ALTER TABLE Feedback DROP COLUMN IF EXISTS moderation_status;
ALTER TABLE Feedback DROP COLUMN IF EXISTS moderated_by;
ALTER TABLE Feedback DROP COLUMN IF EXISTS moderation_note;

-- 2. Drop UserAccount table
DROP TABLE IF EXISTS UserAccount;
