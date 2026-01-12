-- Migration: Add archive functionality to equipment table
-- Run this in Render Dashboard > Database > SQL Editor

-- Step 1: Add archive columns to equipment table
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Step 2: Create equipment quantity logs table for audit trail
CREATE TABLE IF NOT EXISTS equipment_quantity_logs (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    change_type VARCHAR(10) NOT NULL CHECK (change_type IN ('ADD', 'REDUCE')),
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL
);

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_equipment_archived ON equipment(archived);
CREATE INDEX IF NOT EXISTS idx_quantity_logs_equipment ON equipment_quantity_logs(equipment_id);

-- Step 4: Verify changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'equipment' 
AND column_name IN ('archived', 'archived_at', 'archived_by', 'archive_reason')
ORDER BY ordinal_position;

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'equipment_quantity_logs'
ORDER BY ordinal_position;
