
import mysql.connector

try:
    conn = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="root",
        database="bcp_sms4_pcm"
    )
    cursor = conn.cursor()

    print("--- Resetting Issuance Status ---")

    # 1. Identify assets that are currently marked as 'Issued' in reservations
    cursor.execute("SELECT asset_id FROM event_asset_reservations WHERE status = 'Issued'")
    issued_assets = [row[0] for row in cursor.fetchall()]

    if not issued_assets:
        print("No issued reservations found to reset.")
    else:
        print(f"Found {len(issued_assets)} issued assets. Resetting...")
        
        # 2. Reset Reservation Status
        cursor.execute("UPDATE event_asset_reservations SET status = 'Reserved' WHERE status = 'Issued'")
        print(f"Updated {cursor.rowcount} reservations to 'Reserved'.")

        # 3. Reset Asset Status to 'In-Storage'
        # We only reset those that are currently 'In-Use' and were part of the issued set
        placeholders = ', '.join(['%s'] * len(issued_assets))
        query = f"UPDATE bcp_sms4_asset SET status = 'In-Storage' WHERE status = 'In-Use' AND asset_id IN ({placeholders})"
        cursor.execute(query, issued_assets)
        print(f"Updated {cursor.rowcount} assets to 'In-Storage'.")
        
        conn.commit()
        print("Reset complete.")

except mysql.connector.Error as err:
    print(f"Error: {err}")
finally:
    if 'conn' in locals() and conn.is_connected():
        conn.close()
