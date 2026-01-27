
import mysql.connector
import os
import sys

# DB Config from config.py
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'root',  
    'database': 'school_event_management',
    'port': 3306
}

def run_migration():
    print("Connecting to MySQL database...")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(buffered=True)
        print("Connected.")

        # 1. Add columns to equipment table
        # MySQL doesn't always support ADD COLUMN IF NOT EXISTS in older versions, 
        # so we'll check first or wrap in try/except for each column is safer/easier
        
        print("\n=== Checking 'equipment' table columns ===")
        # Get existing columns
        cursor.execute("DESCRIBE equipment")
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        columns_to_add = [
            ("archived", "BOOLEAN DEFAULT FALSE"),
            ("archived_at", "TIMESTAMP NULL"),
            ("archived_by", "INT"),
            ("archive_reason", "TEXT")
        ]
        
        for col_name, col_def in columns_to_add:
            if col_name not in existing_columns:
                print(f"Adding column: {col_name}")
                try:
                    cursor.execute(f"ALTER TABLE equipment ADD COLUMN {col_name} {col_def}")
                    print(f"  -> Added {col_name}")
                except mysql.connector.Error as err:
                    print(f"  -> Failed to add {col_name}: {err}")
            else:
                print(f"Column {col_name} already exists.")

        # 2. Create equipment_quantity_logs table
        print("\n=== Creating 'equipment_quantity_logs' table ===")
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS equipment_quantity_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            equipment_id INT NOT NULL,
            change_type VARCHAR(10) NOT NULL,
            quantity_change INT NOT NULL,
            reason TEXT,
            changed_by INT,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            previous_quantity INT NOT NULL,
            new_quantity INT NOT NULL,
            INDEX idx_eq_logs_equipment (equipment_id),
            FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """
        try:
            cursor.execute(create_table_sql)
            print("Table 'equipment_quantity_logs' created or already exists.")
        except mysql.connector.Error as err:
            print(f"Error creating table: {err}")

        # 3. Create index on archived
        print("\n=== Creating indexes ===")
        # MySQL doesn't support CRATE INDEX IF NOT EXISTS in all versions nicely without a procedure.
        # But we can try and ignore error if exists.
        try:
            cursor.execute("CREATE INDEX idx_equipment_archived ON equipment(archived)")
            print("Index 'idx_equipment_archived' created.")
        except mysql.connector.Error as err:
            if err.errno == 1061: # Duplicate key name
                print("Index 'idx_equipment_archived' already exists.")
            else:
                print(f"Error creating index: {err}")

        conn.commit()
        print("\nMigration completed successfully.")
        
    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("Connection closed.")

if __name__ == "__main__":
    run_migration()
