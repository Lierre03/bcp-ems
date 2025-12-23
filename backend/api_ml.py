"""
ML API - Accurate AI Training System for Event Planning
Matches the updated 'ai_training_data' table structure
Full Implementation + Dynamic Resource Fetching
REMOVED CATERING
"""
from flask import Blueprint, request, jsonify
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, MultiLabelBinarizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, accuracy_score
import mysql.connector
import json
from datetime import datetime

ml_bp = Blueprint('ml', __name__, url_prefix='/api/ml')

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# Define paths for models
EVENT_VECTORIZER_PATH = os.path.join(MODEL_DIR, 'event_vectorizer.pkl')
EVENT_CLASSIFIER_PATH = os.path.join(MODEL_DIR, 'event_classifier.pkl')
BUDGET_MODEL_PATH = os.path.join(MODEL_DIR, 'budget_predictor.pkl')
EQUIPMENT_MODEL_PATH = os.path.join(MODEL_DIR, 'equipment_predictor.pkl')
BREAKDOWN_PROFILE_PATH = os.path.join(MODEL_DIR, 'budget_profiles.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.pkl')

def get_db():
    return mysql.connector.connect(
        host='localhost', user='root', password='', database='school_event_management'
    )

def load_training_data():
    """Load and preprocess training data from ai_training_data table"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # UPDATED QUERY: REMOVED CATERING
    cursor.execute("""
        SELECT event_name, event_type, expected_attendees, total_budget,
               equipment, activities, additional_resources,
               budget_breakdown, venue, organizer, description
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
    
    # Scale attendees
    scaler = StandardScaler()
    df['attendees_scaled'] = scaler.fit_transform(df[['expected_attendees']])

    # Parse JSON arrays into Python lists (Removed catering)
    for col in ['equipment', 'activities', 'additional_resources', 'budget_breakdown']:
        df[f'{col}_list'] = df[col].apply(lambda x: json.loads(x) if x else [])

    return df

@ml_bp.route('/add-training-data', methods=['POST'])
def add_training_data():
    """Add new training example to MySQL"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()

        # UPDATED INSERT STATEMENT: REMOVED CATERING
        cursor.execute("""
            INSERT INTO ai_training_data
            (event_name, event_type, description, venue, organizer, 
             expected_attendees, total_budget, budget_breakdown,
             equipment, activities, additional_resources, is_validated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """, (
            data.get('eventName', ''),
            data.get('eventType', 'Academic'),
            data.get('description', ''),
            data.get('venue', ''),
            data.get('organizer', ''),
            data.get('attendees', 0),
            data.get('budget', 0),
            json.dumps(data.get('budgetBreakdown', [])),
            json.dumps(data.get('equipment', [])),
            json.dumps(data.get('activities', [])),
            json.dumps(data.get('additionalResources', []))
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Training data added successfully'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/training-data', methods=['GET'])
def get_training_history():
    """Fetch recent training data for display"""
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, event_name, event_type, total_budget, created_at 
            FROM ai_training_data 
            ORDER BY created_at DESC LIMIT 10
        """)
        data = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/training-stats', methods=['GET'])
def training_stats():
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as total FROM ai_training_data WHERE is_validated = 1")
        total = cursor.fetchone()['total']
        conn.close()
        return jsonify({'success': True, 'total_samples': total})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/equipment-options', methods=['GET'])
def get_equipment_options():
    try:
        categories = {
            'Audio & Visual': ['Projector', 'Speaker', 'Microphone', 'Screen'],
            'Furniture & Setup': ['Tables', 'Chairs', 'Stage', 'Podium'],
            'Sports & Venue': ['Scoreboard', 'Lighting', 'Camera', 'First Aid Kit']
        }

        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT equipment FROM ai_training_data")
        rows = cursor.fetchall()
        conn.close()

        learned_items = set()
        existing_items = set(sum(categories.values(), []))

        for row in rows:
            if row['equipment']:
                try:
                    items = json.loads(row['equipment'])
                    for item in items:
                        if item not in existing_items:
                            learned_items.add(item)
                except:
                    pass
        
        if learned_items:
            categories['Learned Items'] = sorted(list(learned_items))

        return jsonify({'success': True, 'categories': categories})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/train-models', methods=['POST'])
def train_models():
    """
    Retrains ALL AI models (Budget, Equipment, Classifier) using MySQL data.
    """
    try:
        df = load_training_data()
        
        if len(df) < 5:
            return jsonify({'success': False, 'message': 'Not enough data to train (need at least 5 samples)'})

        # --- 1. Train Budget Model (Linear Regression) ---
        X_budget = df[['event_type_encoded', 'expected_attendees']]
        y_budget = df['total_budget']
        
        budget_model = LinearRegression()
        budget_model.fit(X_budget, y_budget)
        joblib.dump(budget_model, BUDGET_MODEL_PATH)
        budget_score = budget_model.score(X_budget, y_budget)

        # --- 2. Train Equipment Model (Random Forest) ---
        mlb = MultiLabelBinarizer()
        y_equipment = mlb.fit_transform(df['equipment_list'])
        
        equipment_model = MultiOutputClassifier(RandomForestClassifier(n_estimators=100, random_state=42))
        equipment_model.fit(X_budget, y_equipment)
        joblib.dump((equipment_model, mlb), EQUIPMENT_MODEL_PATH)
        equipment_accuracy = equipment_model.score(X_budget, y_equipment)

        # --- 3. Train Event Classifier (TF-IDF + Logistic Regression) ---
        if 'event_name' in df.columns:
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
            classifier = LogisticRegression(random_state=42, max_iter=1000)
            
            X_text = vectorizer.fit_transform(df['event_name'])
            y_type = df['event_type']
            
            classifier.fit(X_text, y_type)
            
            joblib.dump(vectorizer, EVENT_VECTORIZER_PATH)
            joblib.dump(classifier, EVENT_CLASSIFIER_PATH)

        # --- 4. Learn Budget Breakdown Profiles ---
        budget_profiles = {}
        for event_type in df['event_type'].unique():
            type_df = df[df['event_type'] == event_type]
            profile = {}
            total_events = len(type_df)
            
            for breakdown_list in type_df['budget_breakdown_list']:
                event_total = sum(item.get('amount', 0) for item in breakdown_list)
                if event_total > 0:
                    for item in breakdown_list:
                        name = item.get('name', 'Misc')
                        amount = item.get('amount', 0)
                        name_key = name.strip().title() 
                        if name_key not in profile: profile[name_key] = 0
                        profile[name_key] += (amount / event_total) / total_events
            
            budget_profiles[event_type] = {k: round(v, 2) for k, v in profile.items() if v > 0.05}
            
        joblib.dump(budget_profiles, BREAKDOWN_PROFILE_PATH)

        metadata = {
            'trained_at': datetime.now().isoformat(),
            'samples': len(df),
            'budget_score': budget_score,
            'equipment_accuracy': equipment_accuracy,
            'equipment_labels': list(mlb.classes_)
        }
        joblib.dump(metadata, METADATA_PATH)

        return jsonify({
            'success': True, 
            'message': f'Models trained on {len(df)} samples',
            'metrics': {
                'budget_r2': round(budget_score, 4),
                'equipment_acc': round(equipment_accuracy, 4)
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/predict-resources', methods=['POST'])
def predict_resources():
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

        type_mapping = {'Academic': 0, 'Sports': 1, 'Cultural': 2, 'Workshop': 3, 'Seminar': 4}
        event_type_encoded = type_mapping.get(event_type, 0)

        # --- BUDGET PREDICTION ---
        if os.path.exists(BUDGET_MODEL_PATH):
            budget_model = joblib.load(BUDGET_MODEL_PATH)
            predicted_budget = budget_model.predict([[event_type_encoded, attendees]])[0]
            predictions['estimatedBudget'] = max(1000, int(predicted_budget))
            predictions['confidence'] = 0.92
        else:
            base_rates = {'Academic': 150, 'Sports': 200, 'Cultural': 300, 'Workshop': 180, 'Seminar': 160}
            rate = base_rates.get(event_type, 150)
            predictions['estimatedBudget'] = attendees * rate

        # --- BUDGET BREAKDOWN ---
        if os.path.exists(BREAKDOWN_PROFILE_PATH):
            profiles = joblib.load(BREAKDOWN_PROFILE_PATH)
            if event_type in profiles:
                total = predictions['estimatedBudget']
                raw_breakdown = {k: int(v * total) for k, v in profiles[event_type].items()}
                predictions['budgetBreakdown'] = raw_breakdown
            else:
                predictions['budgetBreakdown'] = {
                    "Venue": int(predictions['estimatedBudget'] * 0.3),
                    "Equipment": int(predictions['estimatedBudget'] * 0.4),
                    "Marketing": int(predictions['estimatedBudget'] * 0.2),
                    "Misc": int(predictions['estimatedBudget'] * 0.1)
                }

        # --- EQUIPMENT PREDICTION ---
        if os.path.exists(EQUIPMENT_MODEL_PATH):
            equipment_model, mlb = joblib.load(EQUIPMENT_MODEL_PATH)
            eq_pred_binary = equipment_model.predict([[event_type_encoded, attendees]])
            predicted_items = mlb.inverse_transform(eq_pred_binary)[0]
            predictions['resources'] = list(predicted_items)
        else:
            defaults = {
                'Academic': ['Projector', 'Microphone', 'Whiteboard'],
                'Sports': ['Scoreboard', 'First Aid Kit', 'Sound System'],
                'Cultural': ['Stage Lighting', 'Sound System', 'Microphone']
            }
            predictions['resources'] = defaults.get(event_type, ['Projector', 'Microphone'])

        # --- TIMELINE GENERATION ---
        predictions['timeline'] = [
            {'phase': 'Setup', 'startTime': '08:00', 'endTime': '09:00'},
            {'phase': 'Main Event', 'startTime': '09:00', 'endTime': f"{9+int(duration)}:00"},
            {'phase': 'Teardown', 'startTime': f"{9+int(duration)}:00", 'endTime': f"{10+int(duration)}:00"}
        ]
        
        return jsonify({'success': True, **predictions})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/classify-event-type', methods=['POST'])
def classify_event_type():
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text or len(text) < 3:
            return jsonify({'success': False, 'error': 'Text too short'})

        if not os.path.exists(EVENT_CLASSIFIER_PATH) or not os.path.exists(EVENT_VECTORIZER_PATH):
            return jsonify({'success': False, 'message': 'Models not initialized'})

        classifier = joblib.load(EVENT_CLASSIFIER_PATH)
        vectorizer = joblib.load(EVENT_VECTORIZER_PATH)

        text_vec = vectorizer.transform([text])
        prediction = classifier.predict(text_vec)[0]
        
        probs = classifier.predict_proba(text_vec)[0]
        confidence = max(probs) * 100

        return jsonify({
            'success': True,
            'eventType': prediction,
            'confidence': round(confidence, 1)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})