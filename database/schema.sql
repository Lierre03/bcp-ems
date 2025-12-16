-- ============================================================================
-- SCHOOL EVENT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Fresh Start - Day 1 Setup
-- Created: December 14, 2025
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS school_event_management 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE school_event_management;

-- ============================================================================
-- TABLE 1: ROLES
-- ============================================================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    hierarchy_level INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default roles
INSERT INTO roles (name, description, hierarchy_level) VALUES
('Super Admin', 'Full system access, AI training, user management', 1),
('Admin', 'Event approval, budget oversight, analytics', 2),
('Staff', 'Venue/equipment management, conflict resolution', 3),
('Requestor', 'Event creation, expense logging', 4),
('Participant', 'Event registration, attendance, feedback', 5);

-- ============================================================================
-- TABLE 2: USERS
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_role (role_id)
) ENGINE=InnoDB;

-- Insert demo admin user (password: admin123)
-- Password hash generated with: python -c "import bcrypt; print(bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode())"
INSERT INTO users (username, email, password_hash, role_id, first_name, last_name) VALUES
('admin', 'admin@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqGOZPXlOq', 1, 'System', 'Administrator');

-- ============================================================================
-- TABLE 3: EVENTS
-- ============================================================================
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    event_type ENUM('Academic', 'Sports', 'Cultural', 'Workshop', 'Other') NOT NULL,
    description TEXT,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    expected_attendees INT DEFAULT 0,
    max_attendees INT,
    status ENUM('Draft', 'Pending', 'Under Review', 'Approved', 'Ongoing', 'Completed', 'Archived') DEFAULT 'Draft',
    venue VARCHAR(100),
    organizer VARCHAR(100),
    requestor_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (requestor_id) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (end_datetime > start_datetime),
    CHECK (max_attendees IS NULL OR max_attendees >= expected_attendees),
    INDEX idx_status (status),
    INDEX idx_start_date (start_datetime),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE 4: EVENT_STATUS_HISTORY
-- ============================================================================
CREATE TABLE event_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT NOT NULL,
    reason TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_event (event_id)
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE 5: BUDGETS
-- ============================================================================
CREATE TABLE budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT UNIQUE NOT NULL,
    total_budget DECIMAL(10,2) NOT NULL,
    venue_cost DECIMAL(10,2) DEFAULT 0.00,
    equipment_cost DECIMAL(10,2) DEFAULT 0.00,
    catering_cost DECIMAL(10,2) DEFAULT 0.00,
    other_cost DECIMAL(10,2) DEFAULT 0.00,
    actual_expenses DECIMAL(10,2),
    is_ai_predicted BOOLEAN DEFAULT FALSE,
    prediction_confidence DECIMAL(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CHECK (prediction_confidence IS NULL OR prediction_confidence BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE 6: AI_TRAINING_DATA
-- ============================================================================
CREATE TABLE ai_training_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    expected_attendees INT NOT NULL,
    actual_attendees INT,
    total_budget DECIMAL(10,2) NOT NULL,
    venue_type VARCHAR(50) NOT NULL,
    equipment_count INT DEFAULT 0,
    actual_expenses DECIMAL(10,2),
    is_validated BOOLEAN DEFAULT FALSE,
    source ENUM('Manual', 'Auto-Generated') DEFAULT 'Manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_validated (is_validated, source)
) ENGINE=InnoDB;

-- ============================================================================
-- SEED DATA FOR DEMO
-- ============================================================================

-- Sample AI training data (for ML model)
INSERT INTO ai_training_data (event_type, expected_attendees, actual_attendees, total_budget, venue_type, equipment_count, actual_expenses, is_validated, source) VALUES
('Academic', 200, 185, 25000.00, 'Auditorium', 5, 23500.00, TRUE, 'Manual'),
('Sports', 150, 142, 15000.00, 'Gymnasium', 10, 14200.00, TRUE, 'Manual'),
('Cultural', 300, 320, 35000.00, 'Hall', 8, 36500.00, TRUE, 'Manual'),
('Workshop', 50, 48, 8000.00, 'Classroom', 3, 7500.00, TRUE, 'Manual'),
('Academic', 180, 175, 22000.00, 'Auditorium', 6, 21000.00, TRUE, 'Manual');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'school_event_management';

-- Verify default admin user
SELECT id, username, email, role_id, first_name, last_name 
FROM users;

-- Verify roles
SELECT * FROM roles ORDER BY hierarchy_level;
