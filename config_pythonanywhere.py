# PythonAnywhere Configuration
# Use this file ONLY on PythonAnywhere deployment

DB_CONFIG = {
    'host': 'BCPSEMS.mysql.pythonanywhere-services.com',
    'user': 'BCPSEMS',
    'password': 'YOUR_MYSQL_PASSWORD_HERE',  # Replace with your actual password
    'database': 'BCPSEMS$school_event_management',
    'port': 3306,
    'charset': 'utf8mb4',
    'autocommit': True
}

SECRET_KEY = 'pythonanywhere-secret-key-change-in-production'
DEBUG = False
