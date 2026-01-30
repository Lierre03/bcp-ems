# ============================================================================
# CONFIGURATION FILE
# School Event Management System
# ============================================================================

import os

# Try to load optional environment variables (requires python-dotenv)
# If not installed, just use os.environ (which is standard)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Config:
    """Base configuration"""
    
    # Secret key for session management (Flask native sessions)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = 28800  # 8 hours
    
    # CRITICAL FIX FOR HTTP DEPLOYMENT:
    SESSION_COOKIE_SECURE = False   # Must be False if using http://
    SESSION_COOKIE_HTTPONLY = True  # Keep True for security
    SESSION_COOKIE_SAMESITE = 'Lax' # Lax is safer than None for HTTP
    SESSION_COOKIE_NAME = 'session'
    
    # Database configuration (MySQL Only for XAMPP)
    # Priority: 1. ENV VAR  2. Default
    DB_CONFIG = {
        'host': os.environ.get('DB_HOST') or 'localhost',
        'user': os.environ.get('DB_USER') or 'root',
        'password': os.environ.get('DB_PASSWORD') if os.environ.get('DB_PASSWORD') is not None else 'root',
        'database': os.environ.get('DB_NAME') or 'school_event_management',
        'port': int(os.environ.get('DB_PORT') or 3306),
        'autocommit': True,
        'type': 'mysql'
    }
    
    # CORS configuration
    CORS_ORIGINS = [
        'http://localhost:5000',
        'http://127.0.0.1:5000'
    ]
    
    # File upload configuration
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # AI Model configuration
    AI_MODEL_PATH = 'backend/ai_model/budget_model.pkl'
    AI_MIN_CONFIDENCE = 0.70  # 70% minimum confidence threshold
    
    # Password hashing
    BCRYPT_LOG_ROUNDS = 12  # Cost factor for bcrypt
    
    # API Rate limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_DEFAULT = "100 per minute"
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = 'logs/app.log'


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    # Override with stronger secret key in production
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()
    # Enable secure cookies for HTTPS (DISABLED for HTTP Deployment)
    SESSION_COOKIE_SECURE = False


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'school_event_management_test',
        'port': 3306,
        'charset': 'utf8mb4'
    }


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
