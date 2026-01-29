import mysql.connector
from config import Config

def check_enum():
    config = Config.DB_CONFIG.copy()
    config['database'] = 'bcp_sms4_pcm'
    if config['password'] == 'root':
        config['password'] = 'root'
    
    if 'type' in config:
        del config['type']
        
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        cursor.execute("DESCRIBE bcp_sms4_asset")
        rows = cursor.fetchall()
        
        print("Schema for bcp_sms4_asset:")
        for row in rows:
            if row[0] == 'status':
                print(f"STATUS COLUMN: {row}")
                
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_enum()
