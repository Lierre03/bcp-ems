# ============================================================================
# DATABASE UTILITIES
# Connection pooling and query helpers
# ============================================================================


import mysql.connector
import sqlite3
    
from contextlib import contextmanager
import logging
import threading
from queue import Queue, Empty, Full
import os

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager (MySQL Optimized)"""
    
    def __init__(self, config):
        """Initialize database connection pool"""
        self.config = config
        self.pool_size = 10
        self._pool = Queue(maxsize=self.pool_size)
        self._lock = threading.Lock()
        
        # Determine DB type
        self.db_type = 'mysql'
        logger.info(f"Database initialized. Type: {self.db_type}")
        
    def _create_connection(self):
        """Create a new database connection"""
        try:
            # MySQL Connection
            try:
                conn = mysql.connector.connect(
                    host=self.config['host'],
                    user=self.config['user'],
                    password=self.config['password'],
                    database=self.config['database'],
                    port=self.config.get('port', 3306),
                    autocommit=self.config.get('autocommit', True)
                )
                logger.info("MySQL Database connection established")
                return conn
            except ImportError:
                logger.error("mysql-connector-python not installed")
                raise

        except Exception as e:
            # Log connection params for debugging (safe subset)
            debug_config = {k: v for k, v in self.config.items() if k != 'password'}
            logger.error(f"Database connection failed with params: {debug_config}")
            logger.error(f"Database connection error: {e}")
            raise
    
    def get_connection(self):
        """Get connection from pool or create new one"""
        try:
            conn = self._pool.get_nowait()
            # Verify connection
            is_valid = False
            try:
                if self.db_type == 'mysql':
                    if conn.is_connected(): is_valid = True
                else:
                    conn.execute("SELECT 1")
                    is_valid = True
            except:
                pass
            
            if is_valid:
                return conn
            else:
                try: conn.close()
                except: pass
        except Empty:
            pass
        
        return self._create_connection()
    
    def return_connection(self, conn):
        """Return connection to pool"""
        is_open = False
        if conn:
            try:
                if self.db_type == 'mysql':
                    if conn.is_connected(): is_open = True
                    # Consume any unread results to prevent "Unread result found"
                    try: 
                        while conn.next_result(): pass
                    except: pass
                else:
                    is_open = True
            except:
                pass

        if is_open:
            try:
                self._pool.put_nowait(conn)
            except Full:
                try: conn.close()
                except: pass
        elif conn:
            try: conn.close()
            except: pass
    
    def close(self):
        """Close all connections"""
        while True:
            try:
                conn = self._pool.get_nowait()
                try: conn.close()
                except: pass
            except Empty:
                break
        logger.info("All database connections closed")

    def fix_sql(self, query):
        """
        Adapt SQL query for the target database dialect (MySQL/PostgreSQL)
        """
        if self.db_type == 'mysql':
            # 1. Remove RETURNING clause (MySQL doesn't support it for INSERT/UPDATE)
            if 'RETURNING' in query:
                # Simple split to remove RETURNING ...
                query = query.split('RETURNING')[0]
            
            # 2. Replace Postgres casts ::type with cast() or nothing
            query = query.replace('::numeric', '')
            query = query.replace('::text', '')
            query = query.replace('::int', '')
            query = query.replace('::float', '')
            
            # 3. Replace TO_CHAR(..., 'YYYY-MM-DD') with DATE_FORMAT(..., '%Y-%m-%d')
            # Only handles standard ISO usage
            if 'TO_CHAR' in query:
                query = query.replace("TO_CHAR(e.start_datetime, 'YYYY-MM-DD')", "DATE_FORMAT(e.start_datetime, '%Y-%m-%d')")
                query = query.replace("TO_CHAR(e.end_datetime, 'YYYY-MM-DD')", "DATE_FORMAT(e.end_datetime, '%Y-%m-%d')")
                query = query.replace("TO_CHAR(e.start_datetime, 'HH24:MI')", "DATE_FORMAT(e.start_datetime, '%H:%i')")
                query = query.replace("TO_CHAR(e.end_datetime, 'HH24:MI')", "DATE_FORMAT(e.end_datetime, '%H:%i')")
                query = query.replace("TO_CHAR(e.start_datetime, 'YYYY-MM')", "DATE_FORMAT(e.start_datetime, '%Y-%m')")
                
                # Manual regex fallback for generic usage (basic)
                import re
                query = re.sub(r"TO_CHAR\(([^,]+),\s*'YYYY-MM-DD'\)", r"DATE_FORMAT(\1, '%Y-%m-%d')", query, flags=re.IGNORECASE)
                query = re.sub(r"TO_CHAR\(([^,]+),\s*'YYYY-MM'\)", r"DATE_FORMAT(\1, '%Y-%m')", query, flags=re.IGNORECASE)

            # 4. Replace ILIKE with LIKE (MySQL is case-insensitive by default)
            query = query.replace('ILIKE', 'LIKE')

            # 5. Replace Postgres array ANY() syntax for shared_with_departments
            # Logic: If query checks `OR %s = ANY(e.shared_with_departments)`, 
            # MySQL stores JSON array, so we use JSON_CONTAINS or LIKE
            # Simplification: use string searching if specific pattern found
            if '= ANY(e.shared_with_departments)' in query:
                # Replace with JSON_CONTAINS equivalent provided by MySQL 5.7+
                # Or safely fallback to LIKE for basic compatibility
                query = query.replace('= ANY(e.shared_with_departments)', 'MEMBER OF (e.shared_with_departments)') # MySQL 8.0 syntax
                # For compatibility with older MySQL (XAMPP often uses MariaDB/MySQL 10/8), JSON_CONTAINS is safer
                # BUT this replacement is complex. Let's do a LIKE hack for now if simpler
                # Better: Re-write the specific query in python if feasible.
                # Since we can't context-match easily, let's assume MySQL 8+ or recent MariaDB
                query = query.replace('%s = ANY(e.shared_with_departments)', 'JSON_CONTAINS(e.shared_with_departments, JSON_QUOTE(%s))')

            # 6. Replace FILTER (WHERE ...) with CASE WHEN
            # e.g. COUNT(*) FILTER (WHERE status = 'Completed')
            if 'FILTER' in query:
                import re
                # Pattern: COUNT(*) FILTER (WHERE condition) -> SUM(CASE WHEN condition THEN 1 ELSE 0 END)
                # Note: This regex is fragile. Best effort.
                query = re.sub(r"COUNT\(\*\)\s+FILTER\s+\(WHERE\s+([^)]+)\)", r"SUM(CASE WHEN \1 THEN 1 ELSE 0 END)", query, flags=re.IGNORECASE)
                # Pattern: COUNT(col) FILTER (WHERE condition)
                query = re.sub(r"COUNT\(([^)]+)\)\s+FILTER\s+\(WHERE\s+([^)]+)\)", r"COUNT(CASE WHEN \2 THEN \1 END)", query, flags=re.IGNORECASE)
                
            # 7. Replace STRING_AGG with GROUP_CONCAT
            if 'STRING_AGG' in query:
                # Approx replacement: STRING_AGG(name, ',') -> GROUP_CONCAT(name SEPARATOR ',')
                import re
                query = re.sub(r"STRING_AGG\(([^,]+),\s*'([^']+)'\)", r"GROUP_CONCAT(\1 SEPARATOR '\2')", query, flags=re.IGNORECASE)

        return query

    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            # create cursor
            if self.db_type == 'mysql':
                cursor = conn.cursor(dictionary=True, buffered=True)
            else:
                cursor = conn.cursor()
            yield cursor
            
            # Commit logic
            if not self.config.get('autocommit', True):
                conn.commit()
                
        except Exception as e:
            if conn and not self.config.get('autocommit', True):
                try: conn.rollback()
                except: pass
            logger.error(f"Database error: {e}")
            raise
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if conn:
                self.return_connection(conn)
    
    @contextmanager
    def get_transaction(self):
        """Context manager for manual transaction"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True) if self.db_type == 'mysql' else conn.cursor()
            conn.autocommit = False
            yield cursor
            conn.commit()
        except Exception as e:
            if conn:
                try: conn.rollback()
                except: pass
            logger.error(f"Transaction error: {e}")
            raise
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if conn:
                try: conn.autocommit = self.config.get('autocommit', True)
                except: pass
                self.return_connection(conn)
    
    def execute_query(self, query, params=None):
        query = self.fix_sql(query)
        with self.get_cursor() as cursor:
            # MySQL params usually %s, PostgreSQL %s. 
            # SQLite uses ?. But our code uses %s.
            # mysql-connector uses %s. standard sqlite3 uses ?.
            # fix_sql logic for sqlite param style could be added if needed, but we focus on postgres <-> mysql
            cursor.execute(query, params or ())
            return cursor.fetchall()
            
    def execute_one(self, query, params=None):
        query = self.fix_sql(query)
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchone()
            
    def execute_insert(self, query, params=None):
        query = self.fix_sql(query)
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            
            # If standard RETURNING behavior (Postgres)
            if self.db_type != 'mysql' and 'RETURNING' in query: # re-check original query intent?? 
                # Wait, fix_sql stripped it. We can't use it.
                # So we must rely on fallback for ALL in this unified method
                pass

            if self.db_type == 'mysql':
                return cursor.lastrowid
            
            # Fallback
            return getattr(cursor, 'lastrowid', None)
            
    def execute_update(self, query, params=None):
        query = self.fix_sql(query)
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
