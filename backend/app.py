from flask import Flask
from api_ml import ml_bp

def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)

    # Register the machine learning blueprint
    app.register_blueprint(ml_bp)

    @app.route("/")
    def index():
        return "Welcome to the School Event Management API!"

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)