-- ============================================================================
-- ADD BUDGET COLUMN TO EVENTS TABLE
-- Migration to add budget field directly to events table
-- ============================================================================

USE school_event_management;

-- Add budget column to events table if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2) DEFAULT 0.00 AFTER expected_attendees;

-- Update existing events with budget from budgets table if it exists
UPDATE events e
LEFT JOIN budgets b ON e.id = b.event_id
SET e.budget = COALESCE(b.total_budget, 0.00)
WHERE b.id IS NOT NULL;

SELECT 'Budget column added to events table successfully!' AS status;
