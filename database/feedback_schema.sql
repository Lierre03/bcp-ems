-- ============================================================================
-- FEEDBACK SYSTEM TABLES
-- Based on Project Blueprint Requirements
-- ============================================================================

USE school_event_management;

-- ============================================================================
-- TABLE: EVENT_ATTENDANCE (for tracking attendance)
-- ============================================================================
CREATE TABLE event_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    check_in_datetime DATETIME,
    check_out_datetime DATETIME,
    attendance_status ENUM('Present', 'Late', 'Absent') DEFAULT 'Present',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_user (event_id, user_id),
    INDEX idx_event (event_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: EVENT_FEEDBACK
-- ============================================================================
CREATE TABLE event_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    -- Rating scores (1-5 scale)
    overall_rating TINYINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    venue_rating TINYINT CHECK (venue_rating BETWEEN 1 AND 5),
    activities_rating TINYINT CHECK (activities_rating BETWEEN 1 AND 5),
    organization_rating TINYINT CHECK (organization_rating BETWEEN 1 AND 5),
    -- Optional comments
    comments TEXT,
    -- Anonymous flag (for future enhancement)
    is_anonymous BOOLEAN DEFAULT FALSE,
    -- Edit window tracking
    can_edit BOOLEAN DEFAULT TRUE,
    edit_deadline DATETIME,
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_user_feedback (event_id, user_id),
    INDEX idx_event (event_id),
    INDEX idx_user (user_id),
    CHECK (
        (venue_rating IS NULL AND activities_rating IS NULL AND organization_rating IS NULL) OR
        (venue_rating BETWEEN 1 AND 5 AND activities_rating BETWEEN 1 AND 5 AND organization_rating BETWEEN 1 AND 5)
    )
) ENGINE=InnoDB;

-- ============================================================================
-- TRIGGER: Set edit deadline for feedback
-- ============================================================================
DELIMITER ;;
CREATE TRIGGER set_feedback_edit_deadline
    BEFORE INSERT ON event_feedback
    FOR EACH ROW
BEGIN
    -- Set 24-hour edit window from creation time
    SET NEW.edit_deadline = DATE_ADD(NOW(), INTERVAL 24 HOUR);
END;;
DELIMITER ;

-- ============================================================================
-- TRIGGER: Mark feedback as non-editable after deadline
-- ============================================================================
DELIMITER ;;
CREATE TRIGGER update_feedback_edit_status
    BEFORE UPDATE ON event_feedback
    FOR EACH ROW
BEGIN
    -- Check if edit deadline has passed
    IF NEW.updated_at > OLD.edit_deadline THEN
        SET NEW.can_edit = FALSE;
    END IF;
END;;
DELIMITER ;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample attendance records
INSERT INTO event_attendance (event_id, user_id, check_in_datetime, attendance_status) VALUES
(1, 4, '2025-12-16 08:15:00', 'Present'),
(1, 5, '2025-12-16 08:30:00', 'Late');

-- Insert sample feedback
INSERT INTO event_feedback (
    event_id, user_id, overall_rating, venue_rating,
    activities_rating, organization_rating, comments
) VALUES (
    1, 4, 5, 4, 5, 4,
    'Great event! The organization was excellent and all activities were well-planned. Only minor issue with venue audio system.'
), (
    1, 5, 4, 4, 4, 4,
    'Good cultural event. Enjoyed the performances and food. Could use better crowd management.'
);
