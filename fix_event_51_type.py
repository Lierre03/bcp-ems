
import mysql.connector
from config import Config

def fix_event_type():
    try:
        conn = mysql.connector.connect(**Config.DB_CONFIG)
        cursor = conn.cursor()
        
        event_id = 51
        new_type = 'Academic'
        
        print(f"Updating event {event_id} type to {new_type}...")
        
        cursor.execute("UPDATE events SET event_type = %s WHERE id = %s", (new_type, event_id))
        conn.commit()
        
        if cursor.rowcount > 0:
            print("Update successful!")
        else:
            print("No event found with ID 51.")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_event_type()
