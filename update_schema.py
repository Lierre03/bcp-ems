import pymysql.cursors
from config import Config

def update_schema():
    try:
        conf = Config.DB_CONFIG
        conn = pymysql.connect(
            host=conf['host'],
            user=conf['user'],
            password=conf['password'],
            database=conf['database'],
            port=conf['port'],
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
        cursor = conn.cursor()
        
        # Alter table to add 'Cancelled' to ENUM
        print("Updating events table schema...")
        cursor.execute("""
            ALTER TABLE events 
            MODIFY COLUMN status 
            ENUM('Draft','Pending','Under Review','Approved','Rejected','Ongoing','Completed','Archived','Conflict_Rejected','Cancelled') 
            DEFAULT 'Draft'
        """)
        
        print("Schema updated successfully.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error updating schema: {e}")

if __name__ == "__main__":
    update_schema()
