import pymysql.cursors
from config import Config

def inspect_users_table():
    try:
        conf = Config.DB_CONFIG
        conn = pymysql.connect(
            host=conf['host'],
            user=conf['user'],
            password=conf['password'],
            database=conf['database'],
            port=conf['port'],
            cursorclass=pymysql.cursors.DictCursor
        )
        cursor = conn.cursor()
        cursor.execute("DESCRIBE users")
        columns = cursor.fetchall()
        
        print("Users table schema:")
        for col in columns:
            print(f"  {col['Field']}: {col['Type']}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(e)

if __name__ == "__main__":
    inspect_users_table()
