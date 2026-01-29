from flask import Flask
from api_ml import ml_bp

def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)

    # Register Blueprints
    from backend.api_ml import ml_bp
    from backend.api_events import events_bp
    from backend.api_inventory import inventory_bp
    from backend.api_equipment import equipment_bp
    # from backend.api_users import users_bp # Assuming these exist or will exist
    # from backend.api_venues import venues_bp

    app.register_blueprint(ml_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(equipment_bp)

    @app.route("/")
    def index():
        return "Welcome to the School Event Management API!"

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)