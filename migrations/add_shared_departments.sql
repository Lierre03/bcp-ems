-- Migration: Add shared_with_departments column for cross-department event sharing
-- Run this in Render Dashboard > Database > SQL Editor

-- Step 1: Add column if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS shared_with_departments TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing IT Department events to share with related programs
-- This maintains current behavior where IT programs can see each other's events
UPDATE events 
SET shared_with_departments = ARRAY['BSIT', 'BSCS', 'BSIS']::TEXT[]
WHERE organizing_department IN ('BSIT', 'BSCS', 'BSIS', 'IT Department', 'BSCpE')
AND (shared_with_departments IS NULL OR shared_with_departments = '{}');

-- Step 3: Verify migration
SELECT organizing_department, 
       COUNT(*) as total_events, 
       COUNT(CASE WHEN shared_with_departments != '{}' THEN 1 END) as shared_events
FROM events
GROUP BY organizing_department
ORDER BY organizing_department;
