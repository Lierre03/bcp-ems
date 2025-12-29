-- ============================================================================
-- ALTER EVENTS TABLE TO USE JSON COLUMNS
-- Store equipment, timeline, and budget breakdown as JSON (like AI training data)
-- ============================================================================

USE school_event_management;

-- Add JSON columns to events table
ALTER TABLE `events` 
ADD COLUMN IF NOT EXISTS `equipment` JSON DEFAULT NULL AFTER `budget`,
ADD COLUMN IF NOT EXISTS `timeline` JSON DEFAULT NULL AFTER `equipment`,
ADD COLUMN IF NOT EXISTS `budget_breakdown` JSON DEFAULT NULL AFTER `timeline`;

-- Drop the normalized tables if they exist (we're using JSON instead)
DROP TABLE IF EXISTS `budget_breakdown`;
DROP TABLE IF EXISTS `event_activities`;
DROP TABLE IF EXISTS `event_equipment`;

SELECT 'Events table updated to use JSON columns!' AS status;
