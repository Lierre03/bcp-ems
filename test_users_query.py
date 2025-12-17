from database.db import get_db, init_db
from config import Config

init_db(Config.DB_CONFIG)
db = get_db()

print("Checking roles table schema...")
schema = db.execute_query('DESCRIBE roles')
print("\nRoles table columns:")
for col in schema:
    print(f"  - {col['Field']} ({col['Type']})")

print("\n\nChecking roles data...")
roles = db.execute_query('SELECT * FROM roles')
print(f"\nFound {len(roles)} roles:")
for role in roles:
    print(f"  {role}")
