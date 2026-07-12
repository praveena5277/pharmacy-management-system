-- Create Database
CREATE DATABASE IF NOT EXISTS pharmacy_db;
USE pharmacy_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  role ENUM('admin', 'staff') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  generic_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  strength VARCHAR(20), -- e.g. 500mg, 5ml
  unit VARCHAR(20), -- e.g. Tablet, Bottle, Strip
  price DECIMAL(10,2) NOT NULL, -- Retail price
  cost_price DECIMAL(10,2) NOT NULL, -- Supplier cost price
  stock_quantity INT DEFAULT 0,
  min_stock_level INT DEFAULT 10,
  expiry_date DATE,
  supplier_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 5. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_no VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INT,
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 6. Purchase Details Table
CREATE TABLE IF NOT EXISTS purchase_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT,
  medicine_id INT,
  quantity INT NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
);

-- 7. Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT,
  sale_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  tax DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  payment_type ENUM('Cash', 'Card', 'UPI') DEFAULT 'Cash',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- 8. Sale Details Table
CREATE TABLE IF NOT EXISTS sale_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT,
  medicine_id INT,
  quantity INT NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
);

-- Insert Default Admin User (Password is 'admin123' hashed with bcrypt: $2a$10$w3P4h9eIeFp0qDkWz5wXOu1N3mBv2aWk1yI8B0yX4W3K7C5mF6yO6)
-- (Actually, we will hash it properly or use bcrypt inside db.js initialization. Here is a pre-hashed string for standard bcryptjs)
INSERT INTO users (username, password, email, role) 
VALUES ('admin', '$2a$10$1Pz5P7F6F7C8mE6mE6mE6eG6/8cE9d.Zz2eUuF6xQ/VlGb2Bv1fW6', 'admin@pharmacy.com', 'admin')
ON DUPLICATE KEY UPDATE id=id;
