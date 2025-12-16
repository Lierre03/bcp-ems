# ============================================================================
# CONFIGURATION FILE
# School Event Management System
# ============================================================================

import os

class Config:
    """Base configuration"""
    
    # Secret key for session management (Flask native sessions)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Session configuration (Flask native - no Flask-Session extension)
    PERMANENT_SESSION_LIFETIME = 1800  # 30 minutes
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Database configuration
    DB_CONFIG = {
        'host': os.environ.get('DB_HOST') or 'localhost',
        'user': os.environ.get('DB_USER') or 'root',
        'password': os.environ.get('DB_PASSWORD') or '',
        'database': os.environ.get('DB_NAME') or 'school_event_management',
        'port': int(os.environ.get('DB_PORT') or 3306),
        'charset': 'utf8mb4',
        'autocommit': True
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
