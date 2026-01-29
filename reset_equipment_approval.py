
import mysql.connector

def reset_equipment_approval():
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            port=3306,
            user="root",
            password="root",
            database="school_event_management"
        )
        cursor = conn.cursor(dictionary=True)
        
        # Check current status of Event 55
        cursor.execute("SELECT id, name, equipment_approval_status FROM events WHERE id = 55")
        event = cursor.fetchone()
        
        if event:
            print(f"Current Status for Event 55: {event['equipment_approval_status']}")
            
            # Reset to Pending
            cursor.execute("UPDATE events SET equipment_approval_status = 'Pending' WHERE id = 55")
            conn.commit()
            print("Updated Event 55 equipment_approval_status to 'Pending'.")
        else:
            print("Event 55 not found.")

        # Reset ALL Approved statuses to Pending
        cursor.execute("UPDATE events SET equipment_approval_status = 'Pending' WHERE equipment_approval_status = 'Approved'")
        print(f"Updated {cursor.rowcount} other events to 'Pending'.")

        conn.commit()

        conn.close()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

if __name__ == "__main__":
    reset_equipment_approval()
