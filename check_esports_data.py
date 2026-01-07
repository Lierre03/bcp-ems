
import mysql.connector
import joblib
import os
import sys

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')
EVENT_VECTORIZER_PATH = os.path.join(MODEL_DIR, 'event_vectorizer.pkl')

def get_db_connection():
    try:
        return mysql.connector.connect(
            host='localhost', user='root', password='', database='school_event_management'
        )
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def check_database():
    print("\n--- Checking Database ---")
    conn = get_db_connection()
    if not conn:
        return

    cursor = conn.cursor(dictionary=True)
    
    # Check ai_training_data
    print("Querying ai_training_data for 'Esports'...")
    cursor.execute("SELECT * FROM ai_training_data WHERE event_name LIKE '%Esports%' OR description LIKE '%Esports%'")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} rows in ai_training_data:")
    for row in rows:
        print(f" - ID: {row['id']}, Name: {row['event_name']}, Type: {row['event_type']}, Validated: {row['is_validated']}")

    # Check events table
    print("\nQuerying events table for 'Esports'...")
    cursor.execute("SELECT * FROM events WHERE name LIKE '%Esports%' OR description LIKE '%Esports%'")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} rows in events:")
    for row in rows:
        print(f" - ID: {row['id']}, Name: {row['name']}, Status: {row['status']}")

    conn.close()

def check_vectorizer():
    print("\n--- Checking Vectorizer ---")
    if not os.path.exists(EVENT_VECTORIZER_PATH):
        print(f"Vectorizer file not found at {EVENT_VECTORIZER_PATH}")
        return

    try:
        vectorizer = joblib.load(EVENT_VECTORIZER_PATH)
        print("Vectorizer loaded successfully.")
        
        test_phrase = "Esports Tournament"
        vec = vectorizer.transform([test_phrase])
        
        print(f"Test phrase: '{test_phrase}'")
        print(f"Non-zero elements: {vec.nnz}")
        
        if vec.nnz == 0:
            print("❌ The phrase maps to the zero vector! 'Esports' is NOT in the vocabulary.")
        else:
            print("✅ The phrase has non-zero elements.")
            print(f"Vector data: {vec.data}")
            
            # Check individual words
            for word in test_phrase.split():
                sub_vec = vectorizer.transform([word])
                print(f"Word '{word}': nnz={sub_vec.nnz}")

    except Exception as e:
        print(f"Error loading/using vectorizer: {e}")

if __name__ == "__main__":
    check_database()
    check_vectorizer()
