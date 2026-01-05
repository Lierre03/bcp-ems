-- Add check_in_method column to event_attendance table
USE school_event_management;

-- Add the column if it doesn't exist
ALTER TABLE event_attendance 
ADD COLUMN IF NOT EXISTS check_in_method ENUM('QR', 'Manual') DEFAULT 'QR' 
AFTER check_in_datetime;
