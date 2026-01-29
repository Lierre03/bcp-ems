
import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',
        database='school_event_management',
        port=3306,
        autocommit=True
    )

def verify_event(event_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    print(f"--- Verifying Event {event_id} ---")
    
    # Check 1: Raw existence
    cursor.execute("SELECT * FROM events WHERE id = %s", (event_id,))
    raw_event = cursor.fetchone()
    if not raw_event:
        print("FAIL: Event ID does not exist in 'events' table.")
        return
    else:
        print(f"PASS: Event exists. deleted_at: {raw_event['deleted_at']}, requestor_id: {raw_event['requestor_id']}")

    # Check 2: Requestor Join
    cursor.execute("SELECT * FROM users WHERE id = %s", (raw_event['requestor_id'],))
    user = cursor.fetchone()
    if not user:
        print(f"FAIL: User with ID {raw_event['requestor_id']} (requestor) DOES NOT EXIST.")
    else:
        print(f"PASS: Requestor exists ({user['username']}).")
        
    # Check 3: The exact query used by API
    query = """
        SELECT e.*, u.username as requestor_username,
               CONCAT(u.first_name, ' ', u.last_name) as requestor_name
        FROM events e
        JOIN users u ON e.requestor_id = u.id
        WHERE e.id = %s AND e.deleted_at IS NULL
    """
    cursor.execute(query, (event_id,))
    api_result = cursor.fetchone()
    if not api_result:
        print("FAIL: API Query returned None. (Check JOIN or deleted_at)")
    else:
        print("PASS: API Query successful.")

    conn.close()

if __name__ == "__main__":
    verify_event(61)
