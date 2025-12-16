# ============================================================================
# DATABASE UTILITIES
# Connection pooling and query helpers
# ============================================================================

import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager with pooling"""
    
    def __init__(self, config):
        """Initialize database connection pool"""
        self.config = config
        self.connection = None
        
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = pymysql.connect(
                host=self.config['host'],
                user=self.config['user'],
                password=self.config['password'],
                database=self.config['database'],
                port=self.config['port'],
                charset=self.config['charset'],
                cursorclass=DictCursor,
                autocommit=self.config.get('autocommit', True)
            )
            logger.info("Database connection established")
            return self.connection
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def get_connection(self):
        """Get active connection or create new one"""
        if self.connection is None or not self.connection.open:
            return self.connect()
        return self.connection
    
    def close(self):
        """Close database connection"""
        if self.connection and self.connection.open:
            self.connection.close()
            logger.info("Database connection closed")
    
    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            cursor.close()
    
    def execute_query(self, query, params=None):
        """Execute SELECT query and return results"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchall()
    
    def execute_one(self, query, params=None):
        """Execute SELECT query and return single result"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchone()
    
    def execute_insert(self, query, params=None):
        """Execute INSERT query and return last insert ID"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.lastrowid
    
    def execute_update(self, query, params=None):
        """Execute UPDATE/DELETE query and return affected rows"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.rowcount


# Global database instance (initialized in app.py)
db = None


def init_db(config):
    """Initialize global database instance"""
    global db
    db = Database(config)
    return db


def get_db():
    """Get global database instance"""
    if db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return db
