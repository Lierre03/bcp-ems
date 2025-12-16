import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='',
    database='school_event_management'
)

cursor = conn.cursor()

# Read SQL file
with open('database/add_event_details_tables.sql', 'r') as f:
    sql_content = f.read()

# Execute statements
statements = sql_content.split(';')
for statement in statements:
    statement = statement.strip()
    if statement and not statement.startswith('--'):
        try:
            cursor.execute(statement)
            conn.commit()
        except Exception as e:
            print(f"Error: {e}")
            print(f"Statement: {statement[:100]}...")

cursor.close()
conn.close()

print("Migration completed successfully!")
