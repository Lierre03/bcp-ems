
import logging
from database.db import get_db

logger = logging.getLogger(__name__)

def fix_sequences():
    """
    Fixes PostgreSQL sequences for tables that were imported with missing SERIAL definitions.
    This creates a sequence for each table's ID column and sets it to the current max ID + 1.
    """
    tables = [
        'users', 
        'students', 
        'events', 
        'event_registrations', 
        'event_attendance', 
        'event_feedback', 
        'event_status_history', 
        'notifications', 
        'equipment', 
        'venues', 
        'budgets',
        'roles'
    ]
    
    db = get_db()
    
    try:
        logger.info("Starting database sequence fix...")
        
        # We need to use valid transaction handling
        # Since we are running DDL (Active Record modification), we shouldn't use the standard 
        # transaction wrapper which might have issues with some DDLs in some drivers, 
        # but here we use standard queries.
        
        with db.get_cursor() as cursor:
            # Enable autocommit for DDL operations if needed, but usually works in transactions too
            # for Postgres.
            
            for table in tables:
                seq_name = f"{table}_id_seq"
                logger.info(f"Fixing sequence for table: {table}")
                
                # 1. Create sequence if not exists
                cursor.execute(f"CREATE SEQUENCE IF NOT EXISTS {seq_name}")
                
                # 2. Set default value for ID column to use the sequence
                # We use ALTER COLUMN SET DEFAULT
                cursor.execute(f"ALTER TABLE {table} ALTER COLUMN id SET DEFAULT nextval('{seq_name}')")
                
                # 3. Sync sequence value with current max ID
                # We use setval. We check COALESCE(MAX(id), 0) + 1
                cursor.execute(f"SELECT setval('{seq_name}', (SELECT COALESCE(MAX(id), 0) + 1 FROM {table}), false)")
        
        logger.info("Database sequences fixed successfully.")
        
    except Exception as e:
        logger.error(f"Error fixing sequences: {e}")
        # We don't raise here to avoid crashing the app if it's just a permission issue 
        # or if it's already fixed in a way that causes a unique error.
