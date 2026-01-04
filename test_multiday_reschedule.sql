-- Multi-day event for testing reschedule feature
-- This creates a 3-day event that was rejected due to conflict

INSERT INTO events (
    name,
    event_type,
    description,
    start_datetime,
    end_datetime,
    venue,
    organizer,
    expected_attendees,
    budget,
    status,
    venue_approval_status,
    equipment_approval_status,
    organizing_department,
    requestor_id,
    conflict_resolution_note,
    equipment,
    timeline,
    budget_breakdown,
    additional_resources,
    created_at,
    updated_at
) VALUES (
    'Annual STEM Innovation Fair 2026',
    'Workshop',
    'Three-day science, technology, engineering, and mathematics exhibition featuring student projects, workshops, and industry talks. Day 1: Setup and opening ceremony, Day 2: Main exhibition and workshops, Day 3: Awards and closing.',
    '2026-03-10 08:00:00',  -- Start: March 10, 8 AM
    '2026-03-12 17:00:00',  -- End: March 12, 5 PM (3 days)
    'Gymnasium',
    'Science Department',
    250,
    12500,
    'Rejected',
    'Rejected',
    'Pending',
    'Science Department',
    (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Requestor') LIMIT 1),
    'Another event was approved for Gymnasium at this time slot.',
    JSON_ARRAY(
        JSON_OBJECT('item', 'Projector', 'quantity', 3),
        JSON_OBJECT('item', 'Sound System', 'quantity', 2),
        JSON_OBJECT('item', 'Display Booths', 'quantity', 20),
        JSON_OBJECT('item', 'Tables', 'quantity', 30),
        JSON_OBJECT('item', 'Chairs', 'quantity', 100)
    ),
    JSON_ARRAY(
        JSON_OBJECT('time', '08:00', 'activity', 'Setup and Registration - Day 1', 'description', 'Participants set up booths'),
        JSON_OBJECT('time', '10:00', 'activity', 'Opening Ceremony', 'description', 'Welcome speech and fair overview'),
        JSON_OBJECT('time', '11:00', 'activity', 'Exhibition Day 1', 'description', 'Project displays and demonstrations'),
        JSON_OBJECT('time', '08:00', 'activity', 'Day 2 - Main Exhibition', 'description', 'Peak exhibition hours'),
        JSON_OBJECT('time', '13:00', 'activity', 'Workshop Sessions', 'description', 'Hands-on STEM workshops'),
        JSON_OBJECT('time', '08:00', 'activity', 'Day 3 - Final Day', 'description', 'Last day of exhibition'),
        JSON_OBJECT('time', '14:00', 'activity', 'Awards Ceremony', 'description', 'Recognizing outstanding projects'),
        JSON_OBJECT('time', '16:00', 'activity', 'Closing and Teardown', 'description', 'Event conclusion')
    ),
    JSON_OBJECT(
        'Venue Rental', 4500,
        'Equipment Rental', 2000,
        'Materials & Supplies', 2500,
        'Catering (3 days)', 2000,
        'Awards & Prizes', 1000,
        'Marketing', 500
    ),
    JSON_ARRAY(
        JSON_OBJECT('type', 'Staff', 'details', '5 volunteers per day'),
        JSON_OBJECT('type', 'Parking', 'details', 'Reserved parking for exhibitors'),
        JSON_OBJECT('type', 'Security', 'details', '24/7 security during event')
    ),
    NOW(),
    NOW()
);

-- Get the ID of the newly created event
SELECT LAST_INSERT_ID() as event_id, 
       'Multi-day event created! Event ID is shown above. Access it via the notifications or admin dashboard.' as message;
