CREATE DATABASE IF NOT EXISTS courier_management;
USE courier_management;

CREATE TABLE IF NOT EXISTS Customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    address VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Branch (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS Employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(50) NOT NULL,
    branch_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES Branch(branch_id)
);

CREATE TABLE IF NOT EXISTS Vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) NOT NULL,
    capacity DECIMAL(10,2) NOT NULL,
    branch_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES Branch(branch_id)
);

CREATE TABLE IF NOT EXISTS Parcel (
    parcel_id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    origin_branch_id INT NOT NULL,
    destination_branch_id INT NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    parcel_type VARCHAR(50) NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'In Transit', 'Out for Delivery', 'Delivered')
        DEFAULT 'Pending',
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id) REFERENCES Customer(customer_id),
    FOREIGN KEY (receiver_id) REFERENCES Customer(customer_id),
    FOREIGN KEY (origin_branch_id) REFERENCES Branch(branch_id),
    FOREIGN KEY (destination_branch_id) REFERENCES Branch(branch_id)
);

CREATE TABLE IF NOT EXISTS Shipment (
    shipment_id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    employee_id INT NOT NULL,
    shipment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parcel_id) REFERENCES Parcel(parcel_id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);

CREATE TABLE IF NOT EXISTS Tracking_Update (
    update_id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT NOT NULL,
    branch_id INT NOT NULL,
    employee_id INT NOT NULL,
    status ENUM('Pending', 'In Transit', 'Out for Delivery', 'Delivered')
        NOT NULL,
    location VARCHAR(150) NOT NULL,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parcel_id) REFERENCES Parcel(parcel_id),
    FOREIGN KEY (branch_id) REFERENCES Branch(branch_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);

CREATE TABLE IF NOT EXISTS Delivery (
    delivery_id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    delivery_date DATETIME,
    delivery_status ENUM('Pending', 'Delivered', 'Failed')
        DEFAULT 'Pending',

    FOREIGN KEY (parcel_id) REFERENCES Parcel(parcel_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);

CREATE TABLE IF NOT EXISTS Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status ENUM('Unpaid', 'Paid', 'Refunded')
        DEFAULT 'Unpaid',
    payment_date DATETIME,

    FOREIGN KEY (parcel_id) REFERENCES Parcel(parcel_id),
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE IF NOT EXISTS Feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    rating INT NOT NULL,
    comments VARCHAR(500),
    feedback_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parcel_id) REFERENCES Parcel(parcel_id),
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id),

    CHECK (rating BETWEEN 1 AND 5)
);
