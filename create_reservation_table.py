import mysql.connector
from config import Config

def create_reservation_table():
    config = Config.DB_CONFIG.copy()
    config['database'] = 'bcp_sms4_pcm'
    # Ensure password fixes if needed
    if config['password'] == 'root':
        config['password'] = 'root'
    if 'type' in config:
        del config['type']
        
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Create Table
        query = """
        CREATE TABLE IF NOT EXISTS event_asset_reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            asset_id INT NOT NULL,
            status ENUM('Reserved', 'Issued', 'Returned') DEFAULT 'Reserved',
            reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (event_id),
            INDEX (asset_id),
            INDEX (status)
        ) ENGINE=InnoDB;
        """
        
        cursor.execute(query)
        print("Table 'event_asset_reservations' created successfully.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error creating table: {e}")

if __name__ == "__main__":
    create_reservation_table()
