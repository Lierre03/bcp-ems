#!/usr/bin/env python3
"""
Create event registrations table
"""

import sys
sys.path.append('.')
from config import Config
from database.db import init_db

def create_registration_table():
    print("Initializing database connection...")
    db = init_db(Config.DB_CONFIG)

    # Create the event_registrations table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS event_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        registration_status ENUM('Registered', 'Waitlisted', 'Cancelled') DEFAULT 'Registered',
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        qr_code VARCHAR(255),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_event_user_registration (event_id, user_id),
        INDEX idx_event (event_id),
        INDEX idx_user (user_id),
        INDEX idx_status (registration_status)
    ) ENGINE=InnoDB;
    """

    try:
        with db.get_cursor() as cursor:
            print('Creating event_registrations table...')
            cursor.execute(create_table_sql)
            print('Table created successfully!')

            # Insert sample data
            print('Inserting sample registration data...')
            sample_sql = """
            INSERT IGNORE INTO event_registrations (event_id, user_id, registration_status)
            VALUES (10, 4, 'Registered');
            """
            cursor.execute(sample_sql)
            print('Sample data inserted!')

    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_registration_table()
