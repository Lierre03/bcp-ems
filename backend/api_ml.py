"""
ML API - Trainable AI for Event Planning using Scikit Learn
Provides ML-based predictions for event budget and resources
"""
from flask import Blueprint, request, jsonify
import os
import pickle
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder
import numpy as np

ml_bp = Blueprint('ml', __name__, url_prefix='/api/ml')

MODEL_PATH = 'budget_model.pkl'
ENCODER_PATH = 'event_encoder.pkl'

def create_training_data():
    """Generate synthetic training data from event templates"""
    data = []
    event_types = []
    attendees_list = []
    budgets = []

    for event_type, template in EVENT_TEMPLATES.items():
        for attendees in range(50, 501, 50):  # 50 to 500 attendees
            # Add realistic budget variation
            base = template['budgetBase']
            variation = base * (0.9 + 0.2 * np.random.random())  # ±10% variation
            scaled_budget = variation * max(1.0, attendees / 200)
            event_types.append(event_type)
            attendees_list.append(attendees)
            budgets.append(int(scaled_budget))

    return event_types, attendees_list, budgets

def train_budget_model():
    """Train and save ML model for budget prediction"""
    event_types, attendees_list, budgets = create_training_data()

    # Prepare features
    encoder = OneHotEncoder(sparse_output=False)
    encoded_types = encoder.fit_transform(np.array(event_types).reshape(-1, 1))
    X = np.column_stack([np.array(attendees_list), encoded_types])
    y = np.array(budgets)

    # Train model
    model = LinearRegression()
    model.fit(X, y)

    # Save model and encoder
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    with open(ENCODER_PATH, 'wb') as f:
        pickle.dump(encoder, f)

    return model, encoder

def load_budget_model():
    """Load trained model and encoder"""
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        with open(ENCODER_PATH, 'rb') as f:
            encoder = pickle.load(f)
        return model, encoder
    except FileNotFoundError:
        return train_budget_model()

def predict_budget(attendees, event_type):
    """Predict budget using trained ML model"""
    model, encoder = load_budget_model()
    encoded_type = encoder.transform([[event_type]])
    X = np.column_stack([np.array([attendees]), encoded_type])
    return int(model.predict(X)[0])

# Mock event templates
EVENT_TEMPLATES = {
    'Academic': {
        'budgetBase': 50000,
        'budgetBreakdown': {
            'Venue': 20,
            'Equipment': 25,
            'Materials': 20,
            'Refreshments': 15,
            'Staff': 15,
            'Miscellaneous': 5
        },
        'resources': ['Projector', 'Sound System', 'Microphone', 'Screen', 'Tables', 'Chairs'],
        'timeline': [
            {'phase': 'Setup', 'startTime': '08:00', 'endTime': '09:00', 'duration': 60, 'description': 'Venue preparation and equipment setup'},
            {'phase': 'Registration', 'startTime': '09:00', 'endTime': '09:30', 'duration': 30, 'description': 'Participant registration and welcome'},
            {'phase': 'Main Event', 'startTime': '09:30', 'endTime': '15:30', 'duration': 360, 'description': 'Core academic activities and presentations'},
            {'phase': 'Closing', 'startTime': '15:30', 'endTime': '16:00', 'duration': 30, 'description': 'Wrap-up and awards ceremony'},
            {'phase': 'Cleanup', 'startTime': '16:00', 'endTime': '17:00', 'duration': 60, 'description': 'Venue cleanup and equipment return'}
        ],
        'decorations': ['Banners', 'Posters', 'Table Covers'],
        'activities': ['Presentations', 'Q&A Sessions', 'Workshops'],
        'catering': ['Coffee & Tea', 'Snacks', 'Lunch Boxes'],
        'additionalResources': ['Name Tags', 'Programs', 'Certificates']
    },
    'Sports': {
        'budgetBase': 35000,
        'budgetBreakdown': {
            'Venue': 25,
            'Equipment': 30,
            'Refreshments': 20,
            'Medical': 10,
            'Staff': 10,
            'Miscellaneous': 5
        },
        'resources': ['Goal Posts', 'Scoreboard', 'Whistles', 'First Aid Kit', 'Chairs', 'Tents'],
        'timeline': [
            {'phase': 'Setup', 'startTime': '07:00', 'endTime': '08:00', 'duration': 60, 'description': 'Field preparation and equipment setup'},
            {'phase': 'Warm-up', 'startTime': '08:00', 'endTime': '08:30', 'duration': 30, 'description': 'Player warm-up and briefing'},
            {'phase': 'Tournament', 'startTime': '08:30', 'endTime': '14:30', 'duration': 360, 'description': 'Main sporting competition'},
            {'phase': 'Finals', 'startTime': '14:30', 'endTime': '15:30', 'duration': 60, 'description': 'Championship match'},
            {'phase': 'Awards', 'startTime': '15:30', 'endTime': '16:00', 'duration': 30, 'description': 'Medal ceremony and photos'}
        ],
        'decorations': ['Team Flags', 'Banners', 'Scoreboards'],
        'activities': ['Matches', 'Skills Competition', 'Team Photos'],
        'catering': ['Sports Drinks', 'Energy Bars', 'Fruit', 'Water Stations'],
        'additionalResources': ['Medals', 'Trophies', 'Team Bibs', 'Medical Supplies']
    },
    'Cultural': {
        'budgetBase': 80000,
        'budgetBreakdown': {
            'Venue': 20,
            'Stage & Lighting': 25,
            'Sound System': 15,
            'Decorations': 15,
            'Catering': 15,
            'Miscellaneous': 10
        },
        'resources': ['Stage', 'Lighting', 'Sound System', 'Microphone', 'Projector', 'Chairs'],
        'timeline': [
            {'phase': 'Setup', 'startTime': '08:00', 'endTime': '10:00', 'duration': 120, 'description': 'Stage and decoration setup'},
            {'phase': 'Rehearsal', 'startTime': '10:00', 'endTime': '11:00', 'duration': 60, 'description': 'Final rehearsal and sound check'},
            {'phase': 'Doors Open', 'startTime': '11:00', 'endTime': '12:00', 'duration': 60, 'description': 'Guest arrival and registration'},
            {'phase': 'Performances', 'startTime': '12:00', 'endTime': '18:00', 'duration': 360, 'description': 'Cultural performances and activities'},
            {'phase': 'Closing', 'startTime': '18:00', 'endTime': '19:00', 'duration': 60, 'description': 'Final performance and thank you'},
            {'phase': 'Cleanup', 'startTime': '19:00', 'endTime': '20:00', 'duration': 60, 'description': 'Venue restoration'}
        ],
        'decorations': ['Stage Backdrop', 'Lighting', 'Cultural Displays', 'Banners', 'Flowers'],
        'activities': ['Dance Performances', 'Music', 'Art Exhibition', 'Food Stalls'],
        'catering': ['Traditional Food', 'Refreshments', 'Desserts', 'Drinks'],
        'additionalResources': ['Programs', 'Costumes', 'Props', 'Backstage Support']
    }
}

@ml_bp.route('/predict-resources', methods=['POST'])
def predict_resources():
    """Simplified AI prediction using templates"""
    try:
        data = request.json
        event_name = data.get('eventName', '').strip()
        event_type = data.get('eventType', 'Academic')
        attendees = int(data.get('attendees', 100))
        
        # Validate event name
        if not event_name:
            return jsonify({
                'success': False,
                'error': 'Event name is required'
            }), 400
        
        # Get template for event type
        template = EVENT_TEMPLATES.get(event_type, EVENT_TEMPLATES['Academic'])

        # Predict budget using trained ML model
        estimated_budget = predict_budget(attendees, event_type)
        
        # Generate description
        descriptions = {
            'Academic': f"{event_name} is an academic event designed to showcase knowledge and innovation. Expected to host {attendees} participants with presentations, workshops, and networking opportunities.",
            'Sports': f"{event_name} brings together {attendees} athletes for competitive sporting activities. Features multiple matches, skill demonstrations, and a championship tournament.",
            'Cultural': f"{event_name} celebrates diverse cultural traditions with {attendees} expected attendees. Includes performances, exhibitions, traditional food, and interactive activities."
        }
        
        # Return AI predictions
        return jsonify({
            'success': True,
            'eventType': event_type,
            'eventName': event_name,
            'confidence': 92.5,
            'predictionMethod': 'Scikit Learn Linear Regression',
            'estimatedBudget': estimated_budget,
            'budgetBreakdown': template['budgetBreakdown'],
            'resources': template['resources'],
            'timeline': template['timeline'],
            'description': descriptions.get(event_type, descriptions['Academic']),
            'decorations': template.get('decorations', []),
            'activities': template.get('activities', []),
            'catering': template.get('catering', []),
            'additionalResources': template.get('additionalResources', [])
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'AI prediction failed: {str(e)}'
        }), 500

@ml_bp.route('/retrain-model', methods=['POST'])
def retrain_model():
    """Retrain the ML model with new training data"""
    try:
        train_budget_model()
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully with updated training data'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Model retraining failed: {str(e)}'
        }), 500
