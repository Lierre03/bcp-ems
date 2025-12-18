# ============================================================================
# MAIN APPLICATION FILE
# Flask app initialization, blueprint registration
# ============================================================================

from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import logging
import os

# Import configuration
from config import config

# Import database
from database.db import init_db

# Import blueprints
from backend.auth import auth_bp
from backend.api_events import events_bp
from backend.api_ml import ml_bp
from backend.api_venues import venues_bp
from backend.api_users import users_bp


# ============================================================================
# CREATE APPLICATION
# ============================================================================

def create_app(config_name='development'):
    """Application factory pattern"""
    
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    
    # Initialize database
    init_db(app.config['DB_CONFIG'])
    
    # Configure logging
    logging.basicConfig(
        level=app.config['LOG_LEVEL'],
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Register blueprints
    print("DEBUG: About to register blueprints")
    app.register_blueprint(auth_bp)
    print("DEBUG: Auth blueprint registered")
    app.register_blueprint(events_bp)
    print("DEBUG: Events blueprint registered")
    app.register_blueprint(ml_bp)
    print("DEBUG: ML blueprint registered")
    app.register_blueprint(venues_bp)
    print("DEBUG: Venues blueprint registered")
    app.register_blueprint(users_bp)
    print("DEBUG: Users blueprint registered")
    
    # Test route
    @app.route('/test')
    def test():
        return {'message': 'Server is working'}
    
    # ========================================================================
    # ROUTES
    # ========================================================================
    
    @app.route('/')
    def index():
        """Serve login page"""
        return render_template('login.html')
    
    @app.route('/register')
    def register():
        """Serve registration page"""
        return render_template('register.html')
    
    @app.route('/admin')
    def admin():
        """Serve admin dashboard"""
        return send_from_directory(app.template_folder, 'admin.html')

    @app.route('/staff')
    def staff():
        """Serve staff dashboard"""
        return send_from_directory(app.template_folder, 'staff.html')
    
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        """Serve static files"""
        return send_from_directory(app.static_folder, filename)
    
    @app.route('/health')
    def health_check():
        """Health check endpoint"""
        return {'status': 'healthy', 'message': 'Server is running'}, 200
    
    # ========================================================================
    # ERROR HANDLERS
    # ========================================================================
    
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    return app


# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == '__main__':
    # Create app with development config
    app = create_app('development')
    
    # Create necessary directories
    os.makedirs('logs', exist_ok=True)
    os.makedirs('static/uploads', exist_ok=True)
    
    # Run server
    print("=" * 80)
    print("SCHOOL EVENT MANAGEMENT SYSTEM - REBUILD")
    print("=" * 80)
    print("Server starting on http://localhost:5001")
    print("Admin Dashboard: http://localhost:5001/admin")
    print("=" * 80)
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )
