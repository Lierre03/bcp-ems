-- Reset Mental Health event for venue approval testing
-- This sets the event to "Under Review" (concept approved) with pending venue and equipment approvals

UPDATE events 
SET status = 'Under Review',
    venue_approval_status = 'Pending',
    equipment_approval_status = 'Pending',
    updated_at = NOW()
WHERE name LIKE '%Mental Health%';

-- Verify the update
SELECT id, name, status, venue_approval_status, equipment_approval_status 
FROM events 
WHERE name LIKE '%Mental Health%';
