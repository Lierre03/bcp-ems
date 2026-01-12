import os
import psycopg
from urllib.parse import urlparse

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        return psycopg.connect(database_url)
    
    # Fallback to individual vars
    host = os.environ.get('DB_HOST', 'localhost')
    user = os.environ.get('DB_USER', 'postgres') # 'root' is unlikely for postgres
    password = os.environ.get('DB_PASSWORD', '')
    dbname = os.environ.get('DB_NAME', 'school_event_management')
    port = os.environ.get('DB_PORT', 5432)
    
    conn_str = f"host={host} user={user} password={password} dbname={dbname} port={port}"
    print(f"Connecting with: host={host} user={user} dbname={dbname}")
    
    return psycopg.connect(conn_str)

def fix_schema():
    print("Attempting to fix database schema...")
    try:
        conn = get_db_connection()
        conn.autocommit = True
    except Exception as e:
        print(f"Connection failed: {e}")
        print("Please ensure DATABASE_URL is set or DB credentials are provided.")
        return

    try:
        cur = conn.cursor()
        
        print("Fixing ai_training_data id sequence...")
        
        # 1. Create sequence if not exists
        try:
            cur.execute("CREATE SEQUENCE IF NOT EXISTS ai_training_data_id_seq;")
            print("Sequence created or exists.")
        except Exception as e:
            print(f"Error creating sequence: {e}")

        # 2. Get max id to set sequence correctly
        cur.execute("SELECT COALESCE(MAX(id), 0) FROM ai_training_data;")
        max_id = cur.fetchone()[0]
        print(f"Current max id: {max_id}")
        
        # 3. Set sequence value
        # Restarting sequence at max_id + 1
        new_val = max_id + 1
        try:
            cur.execute(f"SELECT setval('ai_training_data_id_seq', {new_val}, false);")
            print(f"Sequence set to {new_val}")
        except Exception as e:
            print(f"Error setting sequence value: {e}")

        # 4. Alter table to use sequence
        try:
            cur.execute("ALTER TABLE ai_training_data ALTER COLUMN id SET DEFAULT nextval('ai_training_data_id_seq');")
            print("Column default set to sequence.")
        except Exception as e:
            print(f"Error altering column default: {e}")

        # 5. Link sequence to table
        try:
            cur.execute("ALTER SEQUENCE ai_training_data_id_seq OWNED BY ai_training_data.id;")
            print("Sequence owned by table.")
        except Exception as e:
            print(f"Error linking sequence: {e}")

        print("✅ Successfully fixed ai_training_data schema!")
        
    except Exception as e:
        print(f"❌ Error executing schema fix: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema()
