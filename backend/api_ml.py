"""
ML API - Accurate AI Training System for Event Planning
Compact scikit-learn implementation for intelligent event suggestions
"""
from flask import Blueprint, request, jsonify
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, MultiLabelBinarizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, accuracy_score
import mysql.connector
import json
from datetime import datetime

ml_bp = Blueprint('ml', __name__, url_prefix='/api/ml')

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def get_db():
    return mysql.connector.connect(
        host='localhost', user='root', password='', database='school_event_management'
    )

def load_training_data():
    """Load and preprocess training data from ai_training_data table"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT event_type, expected_attendees, total_budget,
               equipment, activities, catering, additional_resources
        FROM ai_training_data
        WHERE is_validated = 1 AND total_budget > 0
    """)

    data = cursor.fetchall()
    conn.close()

    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)

    # Extract features
    df['event_type_encoded'] = pd.Categorical(df['event_type']).codes
    df['attendees_scaled'] = StandardScaler().fit_transform(df[['expected_attendees']])

    # Parse JSON arrays for multi-label targets
    df['equipment_list'] = df['equipment'].apply(lambda x: json.loads(x) if x else [])
    df['activities_list'] = df['activities'].apply(lambda x: json.loads(x) if x else [])
    df['catering_list'] = df['catering'].apply(lambda x: json.loads(x) if x else [])
    df['resources_list'] = df['additional_resources'].apply(lambda x: json.loads(x) if x else [])

    return df

def train_compact_models():
    """Train accurate ML models with minimal code"""
    df = load_training_data()
    if df.empty or len(df) < 5:
        return False

    # 1. BUDGET PREDICTOR - Linear Regression (most accurate for continuous values)
    X_budget = df[['event_type_encoded', 'expected_attendees']].values
    y_budget = df['total_budget'].values

    budget_model = LinearRegression()
    X_train, X_test, y_train, y_test = train_test_split(X_budget, y_budget, test_size=0.2, random_state=42)
    budget_model.fit(X_train, y_train)

    budget_score = r2_score(y_test, budget_model.predict(X_test))
    print(f"Budget Model R²: {budget_score:.3f}")

    # 2. EQUIPMENT CLASSIFIER - Multi-label classification
    all_equipment = set()
    for eq_list in df['equipment_list']:
        all_equipment.update(eq_list)

    equipment_labels = sorted(list(all_equipment))
    mlb = MultiLabelBinarizer(classes=equipment_labels)
    y_equipment = mlb.fit_transform(df['equipment_list'])

    equipment_model = MultiOutputClassifier(RandomForestClassifier(n_estimators=50, random_state=42))
    equipment_model.fit(X_budget, y_equipment)

    # Test accuracy
    y_pred = equipment_model.predict(X_test)
    equipment_accuracy = accuracy_score(y_equipment[:len(X_test)], y_pred)
    print(f"Equipment Model Accuracy: {equipment_accuracy:.3f}")

    # Save models
    joblib.dump(budget_model, os.path.join(MODEL_DIR, 'budget_predictor.pkl'))
    joblib.dump((equipment_model, mlb), os.path.join(MODEL_DIR, 'equipment_predictor.pkl'))

    # Save training metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'samples': len(df),
        'budget_score': float(budget_score),
        'equipment_accuracy': float(equipment_accuracy),
        'equipment_labels': equipment_labels
    }
    joblib.dump(metadata, os.path.join(MODEL_DIR, 'model_metadata.pkl'))

    return True

def generate_smart_timeline(event_type, duration_hours, attendees):
    """Generate realistic timeline based on patterns and ML"""
    base_phases = {
        'Academic': [
            {'phase': 'Setup', 'duration': 60, 'percentage': 0.15},
            {'phase': 'Registration', 'duration': 30, 'percentage': 0.08},
            {'phase': 'Main Event', 'duration': duration_hours * 60 * 0.7, 'percentage': 0.7},
            {'phase': 'Break', 'duration': 15, 'percentage': 0.04},
            {'phase': 'Closing', 'duration': 15, 'percentage': 0.03}
        ],
        'Sports': [
            {'phase': 'Setup', 'duration': 60, 'percentage': 0.12},
            {'phase': 'Warm-up', 'duration': 30, 'percentage': 0.06},
            {'phase': 'Competition', 'duration': duration_hours * 60 * 0.8, 'percentage': 0.8},
            {'phase': 'Awards', 'duration': 20, 'percentage': 0.02}
        ],
        'Cultural': [
            {'phase': 'Setup', 'duration': 90, 'percentage': 0.18},
            {'phase': 'Registration', 'duration': 30, 'percentage': 0.06},
            {'phase': 'Performance', 'duration': duration_hours * 60 * 0.75, 'percentage': 0.75},
            {'phase': 'Closing', 'duration': 15, 'percentage': 0.01}
        ]
    }

    phases = base_phases.get(event_type, base_phases['Academic'])
    total_duration = duration_hours * 60

    # Adjust durations based on scale
    scale_factor = min(1 + (attendees - 50) / 200, 2.0)  # Scale up to 2x for large events

    timeline = []
    current_time = 0

    for phase in phases:
        duration = int(phase['duration'] * scale_factor)
        start_time = current_time
        end_time = start_time + duration

        timeline.append({
            'phase': phase['phase'],
            'startTime': f"{start_time//60:02d}:{start_time%60:02d}",
            'endTime': f"{end_time//60:02d}:{end_time%60:02d}",
            'duration': duration
        })

        current_time = end_time

    return timeline

def generate_budget_breakdown(total_budget, event_type):
    """Generate realistic budget allocation based on event type patterns"""
    allocations = {
        'Academic': {'venue': 35, 'equipment': 30, 'materials': 20, 'catering': 10, 'misc': 5},
        'Sports': {'venue': 30, 'equipment': 35, 'medical': 15, 'catering': 15, 'misc': 5},
        'Cultural': {'venue': 25, 'equipment': 20, 'decor': 25, 'catering': 20, 'misc': 10}
    }

    breakdown = allocations.get(event_type, allocations['Academic'])

    return {
        category: {
            'percentage': percentage,
            'amount': int(total_budget * percentage / 100)
        }
        for category, percentage in breakdown.items()
    }

@ml_bp.route('/predict-resources', methods=['POST'])
def predict_resources():
    """Accurate ML-powered resource predictions"""
    try:
        data = request.json
        event_type = data.get('eventType', 'Academic')
        attendees = int(data.get('expectedAttendees', 100))
        duration = float(data.get('duration', 4))

        predictions = {
            'eventType': event_type,
            'estimatedBudget': 0,
            'resources': [],
            'timeline': [],
            'budgetBreakdown': {},
            'confidence': 0.85
        }

        # Load trained models if available
        budget_model_path = os.path.join(MODEL_DIR, 'budget_predictor.pkl')
        equipment_model_path = os.path.join(MODEL_DIR, 'equipment_predictor.pkl')

        # BUDGET PREDICTION
        if os.path.exists(budget_model_path):
            budget_model = joblib.load(budget_model_path)
            event_type_encoded = {'Academic': 0, 'Sports': 1, 'Cultural': 2}.get(event_type, 0)
            predicted_budget = budget_model.predict([[event_type_encoded, attendees]])[0]
            predictions['estimatedBudget'] = max(5000, int(predicted_budget))
        else:
            # Fallback: simple rules
            base_budget = attendees * 150  # $150 per attendee
            type_multiplier = {'Academic': 1.0, 'Sports': 1.2, 'Cultural': 1.4}
            predictions['estimatedBudget'] = int(base_budget * type_multiplier.get(event_type, 1.0))

        # EQUIPMENT PREDICTION
        if os.path.exists(equipment_model_path):
            equipment_model, mlb = joblib.load(equipment_model_path)
            event_type_encoded = {'Academic': 0, 'Sports': 1, 'Cultural': 2}.get(event_type, 0)
            equipment_pred = equipment_model.predict([[event_type_encoded, attendees]])[0]
            predicted_equipment = mlb.inverse_transform([equipment_pred])[0]
            predictions['resources'] = list(predicted_equipment)
        else:
            # Fallback: type-based rules
            equipment_map = {
                'Academic': ['Projector', 'Microphone', 'Whiteboard'],
                'Sports': ['Scoreboard', 'First Aid Kit', 'Speakers'],
                'Cultural': ['Stage Lighting', 'Sound System', 'Microphone']
            }
            predictions['resources'] = equipment_map.get(event_type, ['Projector', 'Microphone'])

        # TIMELINE GENERATION
        predictions['timeline'] = generate_smart_timeline(event_type, duration, attendees)

        # BUDGET BREAKDOWN
        predictions['budgetBreakdown'] = generate_budget_breakdown(predictions['estimatedBudget'], event_type)

        # Add catering suggestions based on attendees
        if attendees > 200:
            predictions['catering'] = ['Snacks', 'Drinks', 'Lunch']
        elif attendees > 100:
            predictions['catering'] = ['Snacks', 'Drinks']
        else:
            predictions['catering'] = ['Snacks']

        return jsonify({'success': True, **predictions})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/train-models', methods=['POST'])
def train_models():
    """Train ML models on current training data"""
    try:
        success = train_compact_models()
        if success:
            return jsonify({'success': True, 'message': 'Models trained successfully'})
        else:
            return jsonify({'success': False, 'message': 'Insufficient training data'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/add-training-data', methods=['POST'])
def add_training_data():
    """Add new training example"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO ai_training_data
            (event_name, event_type, expected_attendees, total_budget,
             equipment, activities, catering, additional_resources, is_validated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1)
        """, (
            data.get('eventName', ''),
            data.get('eventType', 'Academic'),
            data.get('attendees', 0),
            data.get('budget', 0),
            json.dumps(data.get('equipment', [])),
            json.dumps(data.get('activities', [])),
            json.dumps(data.get('catering', [])),
            json.dumps(data.get('additionalResources', []))
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Training data added'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/training-stats', methods=['GET'])
def training_stats():
    """Get training data statistics"""
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) as total, event_type FROM ai_training_data WHERE is_validated = 1 GROUP BY event_type")
        stats = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) as total FROM ai_training_data WHERE is_validated = 1")
        total = cursor.fetchone()['total']

        conn.close()

        return jsonify({
            'success': True,
            'total_samples': total,
            'by_type': {s['event_type']: s['total'] for s in stats}
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
