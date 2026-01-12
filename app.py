# ============================================================================
# MAIN APPLICATION FILE
# Flask app initialization, blueprint registration
# ============================================================================

from flask import Flask, render_template, send_from_directory, request
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
from backend.api_feedback import feedback_bp
from backend.api_registrations import registration_bp
from backend.api_attendance import attendance_bp
from backend.api_ml import ml_bp
from backend.api_venues import venues_bp
from backend.api_users import users_bp
from backend.api_notifications import notifications_bp
from backend.api_analytics import analytics_bp


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

    # Fix PostgreSQL sequences (one-time fix for imported data)
    with app.app_context():
        try:
            from backend.fix_postgres_sequences import fix_sequences
            fix_sequences()
        except Exception as e:
            app.logger.error(f"Failed to run sequence fix: {e}")
    
    # Configure logging
    logging.basicConfig(
        level=app.config['LOG_LEVEL'],
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Register blueprints
    print("DEBUG: About to register blueprints")
    app.register_blueprint(attendance_bp)
    print("DEBUG: Attendance blueprint registered")
    app.register_blueprint(auth_bp)
    print("DEBUG: Auth blueprint registered")
    app.register_blueprint(events_bp)
    print("DEBUG: Events blueprint registered")
    app.register_blueprint(feedback_bp)
    print("DEBUG: Feedback blueprint registered")
    app.register_blueprint(registration_bp)
    print("DEBUG: Registration blueprint registered")
    app.register_blueprint(ml_bp)
    print("DEBUG: ML blueprint registered")
    app.register_blueprint(venues_bp)
    print("DEBUG: Venues blueprint registered")
    app.register_blueprint(users_bp)
    print("DEBUG: Users blueprint registered")
    app.register_blueprint(notifications_bp)
    print("DEBUG: Notifications blueprint registered")
    app.register_blueprint(analytics_bp)
    print("DEBUG: Analytics blueprint registered")
    
    # Debug route for database connection
    @app.route('/debug-db')
    def debug_db_route():
        try:
            from database.db import get_db
            db = get_db()
            # Try a simple query
            version = db.execute_one("SELECT version()")
            
            # Get connection config (masked)
            import os
            db_url = os.environ.get('DATABASE_URL', 'Not Set')
            masked_url = db_url.replace(db_url.split(':')[2].split('@')[0], '******') if '@' in db_url else db_url
            
            return f"""
            <h1>Database Connection Successful!</h1>
            <p><b>Version:</b> {version}</p>
            <p><b>DATABASE_URL:</b> {masked_url}</p>
            <p><b>SSL Mode Check:</b> Connection established.</p>
            """, 200
        except Exception as e:
            import traceback
            return f"""
            <h1>Database Connection Failed</h1>
            <p><b>Error:</b> {str(e)}</p>
            <h3>Traceback:</h3>
            <pre>{traceback.format_exc()}</pre>
            """, 500

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

    @app.route('/superadmin')
    def superadmin():
        """Serve admin dashboard for super admin"""
        return send_from_directory(app.template_folder, 'admin.html')

    @app.route('/staff')
    def staff():
        """Serve staff dashboard"""
        return send_from_directory(app.template_folder, 'staff.html')

    @app.route('/student')
    def student():
        """Serve student dashboard"""
        return send_from_directory(app.template_folder, 'student.html')

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
    

    # ========================================================================
    # SCHEDULED TASKS (Lazy Execution)
    # ========================================================================
    
    @app.before_request
    def check_event_completion():
        """
        Lazily check for past events and mark them as Completed.
        Only runs on relevant routes (admin/api) to save performance.
        """
        # Only run on API or Admin routes
        # Only run on API or Admin routes
        if not request.path or not (request.path.startswith('/api/') or request.path.startswith('/admin')):
            return

        try:
            from database.db import get_db
            
            db = get_db()
            
            # 1. Check for events and get IDs
            check_query = """
                SELECT id, name, status 
                FROM events 
                WHERE status IN ('Approved', 'Ongoing') 
                AND end_datetime < NOW()
                AND deleted_at IS NULL
            """
            
            events = db.execute_query(check_query)
            
            if events:
                 # 2. Update Status (Auto-commit handled by helper)
                 update_query = """
                    UPDATE events 
                    SET status = 'Completed', updated_at = NOW()
                    WHERE status IN ('Approved', 'Ongoing') 
                    AND end_datetime < NOW()
                    AND deleted_at IS NULL
                 """
                 db.execute_update(update_query)
                 
                 # 3. Log history (Best effort, okay if slightly desynced from update in rare crash)
                 for e in events:
                    db.execute_insert("""
                        INSERT INTO event_status_history (id, event_id, old_status, new_status, changed_by, reason)
                        VALUES (DEFAULT, %s, %s, 'Completed', NULL, 'Auto-completed (system)')
                    """, (e['id'], e['status']))
                            
                 app.logger.info(f"Lazily auto-completed {len(events)} events")
        except Exception as e:
            # Print error to stdout so it shows in terminal
            print(f"ERROR in lazy_check: {e}")
            import traceback
            traceback.print_exc()
            import sys
            sys.stdout.flush()

    return app


# ============================================================================
# RUN APPLICATION
# ============================================================================

# Create app instance for production (gunicorn)
app = create_app(os.environ.get('FLASK_ENV') or 'production')

if __name__ == '__main__':
    # Create app with development config for local development
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
