
import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',
        database='bcp_sms4_pcm',
        port=3306
    )

def inspect_enum():
    conn = get_connection()
    cursor = conn.cursor()
    print("--- Inspecting bcp_sms4_asset Status Column ---")
    cursor.execute("SHOW COLUMNS FROM bcp_sms4_asset LIKE 'status'")
    result = cursor.fetchone()
    print(f"Column: {result[0]}")
    print(f"Type: {result[1]}")
    conn.close()

if __name__ == "__main__":
    inspect_enum()
