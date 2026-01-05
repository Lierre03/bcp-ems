
import pymysql
import os
from backend.api_venues import VENUES

# DB Config
DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'database': os.environ.get('DB_NAME') or 'school_event_management',
    'port': int(os.environ.get('DB_PORT') or 3306),
    'charset': 'utf8mb4',
    'autocommit': True
}

def migrate_venues():
    print("--- Starting Venues Migration ---")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Create Table
        print("1. Creating venues table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS venues (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                type VARCHAR(50) NOT NULL,
                capacity INT NOT NULL DEFAULT 0,
                color VARCHAR(20) DEFAULT 'gray',
                is_active TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        """)
        
        # 2. Insert Data
        print(f"2. Migrating {len(VENUES)} venues...")
        inserted_count = 0
        skipped_count = 0
        
        for v in VENUES:
            # Check if exists (by name)
            cursor.execute("SELECT id FROM venues WHERE name = %s", (v['name'],))
            existing = cursor.fetchone()
            
            if existing:
                print(f"   Skipping {v['name']} (Already exists)")
                skipped_count += 1
            else:
                cursor.execute("""
                    INSERT INTO venues (name, type, capacity, color)
                    VALUES (%s, %s, %s, %s)
                """, (v['name'], v['type'], v['capacity'], v['color']))
                inserted_count += 1
                print(f"   Inserted {v['name']}")
                
        print("\n--- Migration Complete ---")
        print(f"Total: {len(VENUES)}")
        print(f"Inserted: {inserted_count}")
        print(f"Skipped: {skipped_count}")
        
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    migrate_venues()
