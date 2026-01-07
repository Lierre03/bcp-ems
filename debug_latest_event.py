
import pymysql
import json
import os
from datetime import datetime

# DB Config from config.py
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def inspect_latest_event():
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Get the most recent event
        query = """
            SELECT id, name, status, budget, budget_breakdown, timeline, additional_resources, equipment, created_at, updated_at
            FROM events 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        
        cursor.execute(query)
        event = cursor.fetchone()
        
        if not event:
            print("No events found in database.")
            return

        print(f"=== LATEST EVENT (ID: {event['id']}) ===")
        print(f"Name: {event['name']}")
        print(f"Status: {event['status']}")
        print(f"Budget (Total): {event['budget']}")
        print(f"Created At: {event['created_at']}")
        print("-" * 40)
        
        print("\n[BUDGET BREAKDOWN]")
        if event['budget_breakdown']:
            try:
                if isinstance(event['budget_breakdown'], str):
                    bb = json.loads(event['budget_breakdown'])
                    print(json.dumps(bb, indent=2))
                else:
                     print(f"RAW (Is Json?): {event['budget_breakdown']}")
            except json.JSONDecodeError:
                print(f"RAW (Not JSON): {event['budget_breakdown']}")
        else:
            print("NULL/EMPTY")

        print("\n[TIMELINE]")
        if event['timeline']:
            try:
                if isinstance(event['timeline'], str):
                    tl = json.loads(event['timeline'])
                    print(json.dumps(tl, indent=2))
                else:
                    print(json.dumps(event['timeline'], indent=2))
            except json.JSONDecodeError:
                print(f"RAW (Not JSON): {event['timeline']}")
        else:
            print("NULL/EMPTY")

        print("\n[ADDITIONAL RESOURCES]")
        if event['additional_resources']:
            try:
                if isinstance(event['additional_resources'], str):
                    ar = json.loads(event['additional_resources'])
                    print(json.dumps(ar, indent=2))
                else:
                    print(json.dumps(event['additional_resources'], indent=2))
            except json.JSONDecodeError:
                print(f"RAW (Not JSON): {event['additional_resources']}")
        else:
            print("NULL/EMPTY")

        print("-" * 40)

    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    inspect_latest_event()
