
import pymysql
from database.db import get_db, init_db
from app import create_app

def migrate_feedback_schema():
    print("Starting Feedback Schema Migration v2...")
    
    # Initialize App and DB
    app = create_app()
    # Pushing context is good practice though not strictly needed if we just use get_db after init
    with app.app_context():
        db = get_db()
    
        conn = db.get_connection()
        cursor = conn.cursor()

    
    try:
        # Check if columns already exist to avoid errors
        cursor.execute("DESCRIBE event_feedback")
        columns = [row['Field'] for row in cursor.fetchall()]
        
        alter_queries = []
        
        if 'registration_process' not in columns:
            alter_queries.append("ADD COLUMN registration_process TINYINT CHECK (registration_process BETWEEN 1 AND 5)")
            
        if 'speaker_effectiveness' not in columns:
            alter_queries.append("ADD COLUMN speaker_effectiveness TINYINT CHECK (speaker_effectiveness BETWEEN 1 AND 5)")
            
        if 'content_relevance' not in columns:
            alter_queries.append("ADD COLUMN content_relevance TINYINT CHECK (content_relevance BETWEEN 1 AND 5)")
            
        if 'net_promoter_score' not in columns:
            # NPS is 0-10
            alter_queries.append("ADD COLUMN net_promoter_score TINYINT CHECK (net_promoter_score BETWEEN 0 AND 10)")
            
        if 'key_takeaways' not in columns:
            alter_queries.append("ADD COLUMN key_takeaways TEXT")
            
        if 'future_interest' not in columns:
            alter_queries.append("ADD COLUMN future_interest BOOLEAN DEFAULT NULL")

        if alter_queries:
            full_query = f"ALTER TABLE event_feedback {', '.join(alter_queries)}"
            print(f"Executing: {full_query}")
            cursor.execute(full_query)
            conn.commit()
            print("Migration successful! New columns added.")
        else:
            print("No changes needed. Columns already exist.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate_feedback_schema()
