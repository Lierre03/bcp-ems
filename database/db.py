# ============================================================================
# DATABASE UTILITIES
# Connection pooling and query helpers
# ============================================================================

try:
    import psycopg
    from psycopg.rows import dict_row
    HAS_PSYCOPG = True
except ImportError:
    import sqlite3
    HAS_PSYCOPG = False
    
from contextlib import contextmanager
import logging
import threading
from queue import Queue, Empty, Full
import os

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
            if HAS_PSYCOPG:
                # PostgreSQL Connection
                conn = psycopg.connect(
                    host=self.config['host'],
                    user=self.config['user'],
                    password=self.config['password'],
                    dbname=self.config['database'],
                    port=self.config['port'],
                    row_factory=dict_row,
                    autocommit=self.config.get('autocommit', True),
                    sslmode=self.config.get('sslmode', 'require')
                )
                logger.info("PG Database connection established")
                return conn
            else:
                # SQLite Connection Fallback
                db_path = 'school_event_management.db'
                # Prefer config database if it looks like a file path
                if self.config.get('database') and (self.config['database'].endswith('.db') or self.config['database'].endswith('.sqlite')):
                    db_path = self.config['database']
                
                conn = sqlite3.connect(db_path, check_same_thread=False)
                conn.row_factory = sqlite3.Row  # Enable dict-like access
                logger.info(f"SQLite Database connection established ({db_path})")
                return conn

        except Exception as e:
            # Log connection params for debugging (safe subset)
            debug_config = {k: v for k, v in self.config.items() if k != 'password'}
            logger.error(f"Database connection failed with params: {debug_config}")
            logger.error(f"Database connection error: {e}")
            raise
    
    def get_connection(self):
        """Get connection from pool or create new one"""
        try:
            # Try to get an existing connection from pool
            conn = self._pool.get_nowait()
            # Verify connection is still alive
            is_valid = False
            if HAS_PSYCOPG:
                if not conn.closed:
                    is_valid = True
            else:
                # SQLite doesn't have .closed attribute
                try:
                    conn.execute("SELECT 1")
                    is_valid = True
                except:
                    pass
            
            if is_valid:
                return conn
            else:
                conn.close()
        except Empty:
            pass
        
        # Create new connection if pool is empty
        return self._create_connection()
    
    def return_connection(self, conn):
        """Return connection to pool"""
        is_open = False
        if conn:
            if HAS_PSYCOPG:
                if not conn.closed: is_open = True
            else:
                try:
                    conn.execute("SELECT 1")
                    is_open = True
                except:
                    pass

        if is_open:
            try:
                # Only return to pool if there's space
                self._pool.put_nowait(conn)
            except Full:
                # Pool is full, close this connection
                conn.close()
        elif conn:
            try:
                conn.close()
            except:
                pass
    
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
            conn.autocommit = False
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
                    conn.autocommit = self.config.get('autocommit', True)
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
            
            # Check if query returns rows (e.g. RETURNING id)
            if cursor.description:
                result = cursor.fetchone()
                if result:
                    # Return 'id' if dict or first element if tuple
                    return result['id'] if isinstance(result, dict) else result[0]
            
            # Fallback for databases supporting lastrowid (SQLite/MySQL)
            return getattr(cursor, 'lastrowid', None)
    
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
