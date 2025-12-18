-- ============================================================================
-- EVENT REGISTRATION SYSTEM TABLES
-- For student event registration functionality
-- ============================================================================

USE school_event_management;

-- ============================================================================
-- TABLE: EVENT_REGISTRATIONS
-- ============================================================================
CREATE TABLE event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registration_status ENUM('Registered', 'Waitlisted', 'Cancelled') DEFAULT 'Registered',
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    qr_code VARCHAR(255), -- For future QR code implementation
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_user_registration (event_id, user_id),
    INDEX idx_event (event_id),
    INDEX idx_user (user_id),
    INDEX idx_status (registration_status)
) ENGINE=InnoDB;

-- ============================================================================
-- TRIGGER: Generate QR code on registration
-- ============================================================================
DELIMITER ;;
CREATE TRIGGER generate_registration_qr
    BEFORE INSERT ON event_registrations
    FOR EACH ROW
BEGIN
    -- Generate a simple QR code identifier (can be enhanced later)
    SET NEW.qr_code = CONCAT('REG-', NEW.event_id, '-', NEW.user_id, '-', UNIX_TIMESTAMP());
END;;
DELIMITER ;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample registrations for approved events
INSERT INTO event_registrations (event_id, user_id, registration_status) VALUES
(10, 4, 'Registered'),  -- Foundation Day - johndoe
(10, 5, 'Registered');  -- Foundation Day - mariasantos
