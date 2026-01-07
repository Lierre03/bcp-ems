
from database.db import get_db
import sys

# Mock app context if needed, or just import db directly if it works standalone with env vars
# Use factory
from app import create_app
app = create_app()

with app.app_context():
    db = get_db()
    
    print("--- EVENT ---")
    depts = db.execute_query("SELECT DISTINCT organizing_department FROM events")
    print("\n--- DEPARTMENTS IN EVENTS ---")
    for d in depts:
        print(d)

    print("\n--- USER (itdept) ---")
    user = db.execute_one("SELECT * FROM users WHERE username = 'itdept'")
    print(user)
