-- ============================================================================
-- ADD EVENT DETAILS TABLES
-- Migration to add equipment, activities, decorations, and budget breakdown
-- ============================================================================

USE school_event_management;

-- ============================================================================
-- TABLE: EVENT_EQUIPMENT
-- Stores required equipment for events
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    equipment_name VARCHAR(200) NOT NULL,
    quantity INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id)
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: EVENT_ACTIVITIES
-- Stores planned activities/timeline for events
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    activity_name VARCHAR(500) NOT NULL,
    sequence_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_order (event_id, sequence_order)
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: BUDGET_BREAKDOWN
-- Stores detailed budget breakdown by category
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_breakdown (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    UNIQUE KEY unique_event_category (event_id, category)
) ENGINE=InnoDB;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Migration completed successfully!' AS status;
