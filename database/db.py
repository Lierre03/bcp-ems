# ============================================================================
# DATABASE UTILITIES
# Connection pooling and query helpers
# ============================================================================

import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager
import logging
import threading
from queue import Queue, Empty, Full

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager with simple pooling"""
    
    def __init__(self, config):
        """Initialize database connection pool"""
        self.config = config
        self.pool_size = 10
        self._pool = Queue(maxsize=self.pool_size)
        self._lock = threading.Lock()
        
    def _create_connection(self):
        """Create a new database connection"""
        try:
            conn = psycopg.connect(
                host=self.config['host'],
                user=self.config['user'],
                password=self.config['password'],
                dbname=self.config['database'],
                port=self.config['port'],
                row_factory=dict_row,
                autocommit=self.config.get('autocommit', True)
            )
            logger.info("Database connection established")
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def get_connection(self):
        """Get connection from pool or create new one"""
        try:
            # Try to get an existing connection from pool
            conn = self._pool.get_nowait()
            # Verify connection is still alive
            if not conn.closed:
                return conn
            else:
                conn.close()
        except Empty:
            pass
        
        # Create new connection if pool is empty
        return self._create_connection()
    
    def return_connection(self, conn):
        """Return connection to pool"""
        if conn and conn.open:
            try:
                # Only return to pool if there's space
                self._pool.put_nowait(conn)
            except Full:
                # Pool is full, close this connection
                conn.close()
        elif conn:
            conn.close()
    
    def close(self):
        """Close all pooled connections"""
        while True:
            try:
                conn = self._pool.get_nowait()
                conn.close()
            except Empty:
                break
        logger.info("All database connections closed")
    
    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor with proper connection handling"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            yield cursor
            # Don't commit if autocommit is enabled
            if not self.config.get('autocommit', True):
                conn.commit()
        except Exception as e:
            # Don't rollback if autocommit is enabled
            if conn and not self.config.get('autocommit', True):
                try:
                    conn.rollback()
                except:
                    pass
            logger.error(f"Database error: {e}")
            raise
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            # Return connection to pool instead of closing
            if conn:
                self.return_connection(conn)
    
    @contextmanager
    def get_transaction(self):
        """Context manager for manual transaction control"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            # Temporarily disable autocommit for transaction
            conn.autocommit(False)
            yield cursor
            conn.commit()
        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            logger.error(f"Transaction error: {e}")
            raise
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            # Re-enable autocommit before returning to pool
            if conn:
                try:
                    conn.autocommit(self.config.get('autocommit', True))
                except:
                    pass
                self.return_connection(conn)
    
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
