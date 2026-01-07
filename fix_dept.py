
from app import create_app
from database.db import get_db

app = create_app()

with app.app_context():
    db = get_db()
    
    print("Updating 'itdept' user department to 'IT Department'...")
    rows = db.execute_query("UPDATE users SET department = 'IT Department' WHERE username = 'itdept'")
    print(f"Updated {rows} rows (or executed successfully).")
    
    # Verify
    user = db.execute_one("SELECT username, department FROM users WHERE username = 'itdept'")
    print(f"New User State: {user}")
