#!/usr/bin/env python3
"""
AI Training Database Migration Script
Creates tables for AI training data, sessions, model versions, and performance metrics
"""
import os
import sys
import mysql.connector
from mysql.connector import Error
import json
from datetime import datetime

def get_db_config():
    """Get database configuration from config file"""
    config_path = os.path.join(os.path.dirname(__file__), 'config.py')
    if os.path.exists(config_path):
        # Import config dynamically
        sys.path.insert(0, os.path.dirname(config_path))
        try:
            import config
            return {
                'host': getattr(config, 'DB_HOST', 'localhost'),
                'user': getattr(config, 'DB_USER', 'root'),
                'password': getattr(config, 'DB_PASSWORD', ''),
                'database': getattr(config, 'DB_NAME', 'school_event_management'),
                'port': getattr(config, 'DB_PORT', 3306)
            }
        except ImportError:
            pass

    # Fallback configuration
    return {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'school_event_management',
        'port': 3306
    }

def execute_sql_file(cursor, file_path):
    """Execute SQL commands from a file"""
    with open(file_path, 'r', encoding='utf-8') as file:
        sql_content = file.read()

    # Split SQL commands by semicolon
    commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip()]

    for command in commands:
        if command:  # Skip empty commands
            try:
                cursor.execute(command)
                print(f"✅ Executed: {command[:50]}...")
            except Error as e:
                print(f"❌ Error executing command: {e}")
                print(f"Command: {command[:100]}...")
                return False

    return True

def verify_tables(cursor):
    """Verify that all required tables were created"""
    required_tables = [
        'ai_training_data',
        'ai_training_sessions',
        'ai_model_versions',
        'ai_performance_metrics',
        'ai_training_validation_queue'
    ]

    print("\n🔍 Verifying table creation...")

    for table in required_tables:
        cursor.execute(f"SHOW TABLES LIKE '{table}'")
        result = cursor.fetchone()
        if result:
            print(f"✅ Table '{table}' created successfully")

            # Check record count
            cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
            count_result = cursor.fetchone()
            count = count_result['count'] if count_result else 0
            print(f"   📊 Records: {count}")
        else:
            print(f"❌ Table '{table}' not found")

def main():
    """Main migration function"""
    print("🚀 AI Training Database Migration")
    print("=" * 50)

    # Get database configuration
    db_config = get_db_config()
    print(f"📡 Connecting to database: {db_config['database']}@{db_config['host']}")

    # Path to SQL schema file
    schema_file = os.path.join(os.path.dirname(__file__), 'database', 'ai_training_schema.sql')

    if not os.path.exists(schema_file):
        print(f"❌ Schema file not found: {schema_file}")
        return False

    try:
        # Connect to database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        print("🔗 Connected to database successfully")

        # Execute schema file
        print(f"\n📄 Executing schema file: {schema_file}")
        success = execute_sql_file(cursor, schema_file)

        if success:
            # Verify tables were created
            verify_tables(cursor)

            # Commit changes
            connection.commit()
            print("\n✅ Migration completed successfully!")
            print("\n📋 AI Training System Tables:")
            print("   • ai_training_data - Training examples")
            print("   • ai_training_sessions - Training session history")
            print("   • ai_model_versions - Model versioning & rollback")
            print("   • ai_performance_metrics - Performance tracking")
            print("   • ai_training_validation_queue - Data validation workflow")

            return True
        else:
            print("\n❌ Migration failed!")
            connection.rollback()
            return False

    except Error as e:
        print(f"❌ Database error: {e}")
        return False

    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 Database connection closed")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
