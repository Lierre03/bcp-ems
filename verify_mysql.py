
import os
import sys
# Ensure rebuild directory is in path

# Add rebuild to sys.path
sys.path.append(os.path.join(os.getcwd(), 'rebuild'))

try:
    from config import config
    from database.db import Database
except ImportError:
    # Fallback if running directly inside rebuild
    sys.path.append(os.getcwd())
    from config import config
    from database.db import Database

def test_mysql_translation():
    print("=== Testing SQL Translation Logic ===")
    
    # Mock config for MySQL
    conf = {
        'type': 'mysql',
        'host': 'localhost',
        'port': 3306,
        'user': 'root', 
        'password': '',
        'database': 'school_event_management'
    }
    
    db = Database(conf)
    
    # Test Cases
    cases = [
        (
            "INSERT INTO events (name) VALUES ('Test') RETURNING id",
            "INSERT INTO events (name) VALUES ('Test') "
        ),
        (
            "SELECT TO_CHAR(e.start_datetime, 'YYYY-MM-DD') FROM events",
            "SELECT DATE_FORMAT(e.start_datetime, '%Y-%m-%d') FROM events"
        ),
        (
            "SELECT COUNT(*) FILTER (WHERE status = 'Completed') FROM events",
            "SELECT SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) FROM events"
        ),
        (
            "SELECT name::text FROM users",
            "SELECT name FROM users"
        ),
        (
            "SELECT * FROM events WHERE name ILIKE '%Test%'",
            "SELECT * FROM events WHERE name LIKE '%Test%'"
        )
    ]
    
    failures = 0
    for original, expected in cases:
        translated = db.fix_sql(original)
        if translated.strip() != expected.strip():
            print(f"[FAIL] Translaion failed")
            print(f"Original: {original}")
            print(f"Expected: {expected}")
            print(f"Actual:   {translated}")
            failures += 1
        else:
            print(f"[PASS] {original[:40]}...")
            
    if failures == 0:
        print("ALL TRANSLATION TESTS PASSED")
    else:
        print(f"{failures} TESTS FAILED")

def test_connection():
    print("\n=== Testing Live MySQL Connection (XAMPP) ===")
    try:
        conf = {
             'host': 'localhost',
             'user': 'root',
             'password': '',
             'database': 'school_event_management',
             'port': 3306,
             'autocommit': True,
             'type': 'mysql'
        }
        db = Database(conf)
        conn = db.get_connection()
        if conn.is_connected():
            print("SUCCESS: Connected to MySQL!")
            
            # Test a query
            rows = db.execute_query("SELECT count(*) as c FROM users")
            print(f"User count: {rows[0]['c']}")

            # Test fix_sql live
            try:
                # Should fallback to SUM(CASE...)
                print("Testing complex query compatibility...")
                res = db.execute_query("SELECT COUNT(*) FILTER (WHERE is_active=1) as active_count FROM users")
                print(f"Active users (via FILTER->CASE translation): {res[0]['active_count']}")
            except Exception as e:
                print(f"Complex query failed: {e}")
            
        db.close()
    except Exception as e:
        print(f"Connection failed: {e}")
        # If connection fails, it might be environment issue, but we care most about logic here
        pass

if __name__ == "__main__":
    test_mysql_translation()
    test_connection()
