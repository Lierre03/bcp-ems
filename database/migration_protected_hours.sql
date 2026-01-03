-- ============================================================================
-- MIGRATION: Protected Hours System (Option B - Hybrid FCFS)
-- Date: January 3, 2026
-- Purpose: Add time-block protection for academic hours while maintaining FCFS
-- ============================================================================

USE school_event_management;

-- Step 1: Add event classification flags to events table
ALTER TABLE events 
ADD COLUMN is_academic_block BOOLEAN DEFAULT FALSE 
COMMENT 'Auto-approved academic requirements (classes, exams, thesis defenses)';

ALTER TABLE events 
ADD COLUMN is_official_event BOOLEAN DEFAULT FALSE
COMMENT 'University-sanctioned events (graduation, board meetings, accreditation)';

-- Step 2: Create venue protected hours table
CREATE TABLE IF NOT EXISTS venue_protected_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue VARCHAR(100) NOT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    block_type ENUM('Academic','Maintenance','University') NOT NULL DEFAULT 'Academic',
    description TEXT COMMENT 'Optional explanation for this block',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_venue_schedule (venue, day_of_week, start_time),
    INDEX idx_venue (venue),
    INDEX idx_day (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Seed default protected hours (Mon-Fri 8AM-5PM for main venues)
-- Computer Laboratory & Auditorium
INSERT INTO venue_protected_hours (venue, day_of_week, start_time, end_time, block_type, description) VALUES
('Computer Laboratory & Auditorium', 'Monday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Computer Laboratory & Auditorium', 'Tuesday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Computer Laboratory & Auditorium', 'Wednesday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Computer Laboratory & Auditorium', 'Thursday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Computer Laboratory & Auditorium', 'Friday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities');

-- Auditorium (if it exists as separate venue)
INSERT IGNORE INTO venue_protected_hours (venue, day_of_week, start_time, end_time, block_type, description) VALUES
('Auditorium', 'Monday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Auditorium', 'Tuesday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Auditorium', 'Wednesday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Auditorium', 'Thursday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities'),
('Auditorium', 'Friday', '08:00:00', '17:00:00', 'Academic', 'Reserved for classes and academic activities');

-- Gymnasium (lighter restrictions - mornings only)
INSERT IGNORE INTO venue_protected_hours (venue, day_of_week, start_time, end_time, block_type, description) VALUES
('Gymnasium', 'Monday', '08:00:00', '12:00:00', 'Academic', 'Reserved for PE classes'),
('Gymnasium', 'Tuesday', '08:00:00', '12:00:00', 'Academic', 'Reserved for PE classes'),
('Gymnasium', 'Wednesday', '08:00:00', '12:00:00', 'Academic', 'Reserved for PE classes'),
('Gymnasium', 'Thursday', '08:00:00', '12:00:00', 'Academic', 'Reserved for PE classes'),
('Gymnasium', 'Friday', '08:00:00', '12:00:00', 'Academic', 'Reserved for PE classes');

-- Step 4: Create indexes on events table for efficient querying
CREATE INDEX IF NOT EXISTS idx_is_academic ON events(is_academic_block);
CREATE INDEX IF NOT EXISTS idx_is_official ON events(is_official_event);
CREATE INDEX IF NOT EXISTS idx_venue_datetime ON events(venue, start_datetime, end_datetime);

-- Step 5: Verification queries
SELECT '=== Protected Hours Configuration ===' as '';
SELECT venue, day_of_week, start_time, end_time, block_type 
FROM venue_protected_hours 
ORDER BY venue, FIELD(day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'), start_time;

SELECT '=== Events Table Updated ===' as '';
DESCRIBE events;

-- Success message
SELECT '✓ Migration completed successfully!' as 'Status',
       'Protected hours system is now active' as 'Message';
