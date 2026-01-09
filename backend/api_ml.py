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
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, MultiLabelBinarizer, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, accuracy_score, mean_absolute_error
from database.db import get_db
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

def convert_to_24hour(time_str):
    """Convert 12-hour AM/PM time to 24-hour format for HTML time input"""
    if not time_str or ':' not in time_str:
        return '09:00'
    
    # Already in 24-hour format (HH:MM)
    if 'AM' not in time_str.upper() and 'PM' not in time_str.upper():
        # Ensure it's properly formatted
        parts = time_str.split(':')
        if len(parts) == 2:
            try:
                hours = int(parts[0])
                minutes = int(parts[1])
                return f"{hours:02d}:{minutes:02d}"
            except:
                return '09:00'
        return time_str
    
    # Convert from 12-hour AM/PM to 24-hour
    try:
        time_str = time_str.strip().upper()
        is_pm = 'PM' in time_str
        time_part = time_str.replace(' AM', '').replace(' PM', '').strip()
        
        parts = time_part.split(':')
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        
        # Convert to 24-hour
        if is_pm and hours != 12:
            hours += 12
        elif not is_pm and hours == 12:
            hours = 0
        
        return f"{hours:02d}:{minutes:02d}"
    except:
        return '09:00'

def load_training_data():
    """Load and preprocess training data from ai_training_data table AND completed events"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # Get dedicated training data
    cursor.execute("""
        SELECT event_name, event_type, attendees, total_budget,
               equipment, activities, additional_resources,
               budget_breakdown, venue, organizer, description
        FROM ai_training_data
        WHERE is_validated = 1 AND total_budget > 0
    """)
    training_data = cursor.fetchall()

    # ALSO get completed real events to learn from actual usage
    cursor.execute("""
        SELECT 
            name as event_name,
            event_type,
            expected_attendees as attendees,
            budget as total_budget,
            equipment,
            '' as activities,
            additional_resources,
            budget_breakdown,
            venue,
            organizer,
            description
        FROM events
        WHERE status = 'Completed' 
          AND budget > 0 
          AND deleted_at IS NULL
    """)
    completed_events = cursor.fetchall()
    
    conn.close()

    # Combine database training + completed events
    all_data = training_data + completed_events
    
    if not all_data:
        return pd.DataFrame()

    df = pd.DataFrame(all_data)

    # Extract features
    df['event_type_encoded'] = pd.Categorical(df['event_type']).codes
    
    # Scale attendees
    scaler = StandardScaler()
    df['attendees_scaled'] = scaler.fit_transform(df[['attendees']])

    # Parse JSON arrays - extract names from equipment/resources objects
    df['equipment_list'] = df['equipment'].apply(lambda x: 
        [item['name'] if isinstance(item, dict) and 'name' in item else item 
         for item in (json.loads(x) if x else [])]
    )
    
    # NEW: Keep full objects to track quantities
    df['equipment_objects'] = df['equipment'].apply(lambda x: 
        [item if isinstance(item, dict) and 'name' in item else {'name': item, 'quantity': 1}
         for item in (json.loads(x) if x else [])]
    )
    
    df['additional_resources_list'] = df['additional_resources'].apply(lambda x:
        [item['name'] if isinstance(item, dict) and 'name' in item else item 
         for item in (json.loads(x) if x else [])]
    )
    
    df['activities_list'] = df['activities'].apply(lambda x: json.loads(x) if x else [])
    df['budget_breakdown_list'] = df['budget_breakdown'].apply(lambda x: json.loads(x) if x else [])

    return df

@ml_bp.route('/add-training-data', methods=['POST'])
def add_training_data():
    """Add new training example to MySQL"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()

        # Activities can be:
        # - Single day: [{startTime, endTime, phase}, ...]
        # - Multi-day: {day1: [...], day2: [...], day3: [...]}
        activities = data.get('activities', [])
        activities_json = json.dumps(activities)

        cursor.execute("""
            INSERT INTO ai_training_data
            (event_name, event_type, description, venue, organizer, start_date, end_date,
             attendees, total_budget, budget_breakdown,
             equipment, activities, additional_resources, is_validated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """, (
            data.get('eventName', ''),
            data.get('eventType', 'Academic'),
            data.get('description', ''),
            data.get('venue', ''),
            data.get('organizer', ''),
            data.get('startDate') or None,
            data.get('endDate') or None,
            data.get('attendees', 0),
            data.get('budget', 0),
            json.dumps(data.get('budgetBreakdown', [])),
            json.dumps(data.get('equipment', [])),
            activities_json,
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
        db = get_db()
        data = db.execute_query("""
            SELECT
                id,
                event_name as eventName,
                event_type as eventType,
                description,
                venue,
                organizer,
                attendees,
                total_budget as budget,
                budget_breakdown,
                equipment,
                activities,
                additional_resources as additionalResources,
                created_at
            FROM ai_training_data
            WHERE is_validated = 1
            ORDER BY created_at DESC
        """)

        # Parse JSON fields for frontend and format data
        for item in data:
            try:
                # Parse equipment (stored as JSON array)
                if item.get('equipment') and isinstance(item['equipment'], str):
                    item['equipment'] = json.loads(item['equipment'])

                # Parse additional_resources (stored as JSON array)
                if item.get('additionalResources') and isinstance(item['additionalResources'], str):
                    item['additionalResources'] = json.loads(item['additionalResources'])

                # Parse budget_breakdown (stored as JSON array)
                if item.get('budget_breakdown') and isinstance(item['budget_breakdown'], str):
                    item['budget_breakdown'] = json.loads(item['budget_breakdown'])

                # Parse activities/timeline (stored as JSON array)
                if item.get('activities') and isinstance(item['activities'], str):
                    item['activities'] = json.loads(item['activities'])

                # Format created_at date properly
                if item.get('created_at'):
                    # Convert to readable format
                    dt = datetime.fromisoformat(str(item['created_at']).replace('Z', '+00:00'))
                    item['created_at'] = dt.isoformat()

            except json.JSONDecodeError as e:
                print(f"JSON parsing error for item {item.get('id', 'unknown')}: {e}")
                # Keep original values if parsing fails
                pass
            except Exception as e:
                print(f"Data processing error for item {item.get('id', 'unknown')}: {e}")
                pass

        return jsonify({'success': True, 'data': data})
    except Exception as e:
        print(f"Training data API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/training-stats', methods=['GET'])
def training_stats():
    try:
        db = get_db()
        
        # Count dedicated training data
        training_result = db.execute_one("SELECT COUNT(*) as total FROM ai_training_data WHERE is_validated = 1")
        training_count = training_result['total']
        
        # Count completed events that can be used for training
        completed_result = db.execute_one("SELECT COUNT(*) as total FROM events WHERE status = 'Completed' AND budget > 0 AND deleted_at IS NULL")
        completed_count = completed_result['total']
        
        return jsonify({
            'success': True, 
            'total_samples': training_count + completed_count,
            'training_data': training_count,
            'completed_events': completed_count,
            'message': f'Learning from {training_count} training samples + {completed_count} completed events'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/equipment-options', methods=['GET'])
def get_equipment_options():
    try:
        # Get dynamic categories from equipment table
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        # Get all unique categories
        cursor.execute("SELECT DISTINCT category FROM equipment ORDER BY category")
        category_rows = cursor.fetchall()

        # Get all equipment items grouped by category
        cursor.execute("SELECT category, STRING_AGG(name, ',' ORDER BY name) as items FROM equipment GROUP BY category ORDER BY category")
        equipment_rows = cursor.fetchall()

        # Build categories dictionary from database
        categories = {}
        for row in equipment_rows:
            try:
                items = row['items'].split(',') if row['items'] else []
                categories[row['category']] = sorted(items)
            except:
                categories[row['category']] = []

        # Add any categories that don't have equipment yet
        for cat_row in category_rows:
            if cat_row['category'] not in categories:
                categories[cat_row['category']] = []

        # Also include learned items from training data for completeness
        cursor.execute("SELECT equipment FROM ai_training_data")
        training_rows = cursor.fetchall()
        conn.close()

        learned_items = set()
        existing_items = set(sum(categories.values(), []))

        for row in training_rows:
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
        X_budget = df[['event_type_encoded', 'attendees']]
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

        # --- 3. Train Additional Resources Model (Random Forest) ---
        mlb_resources = MultiLabelBinarizer()
        y_resources = mlb_resources.fit_transform(df['additional_resources_list'])
        
        resources_model = MultiOutputClassifier(RandomForestClassifier(n_estimators=100, random_state=42))
        resources_model.fit(X_budget, y_resources)
        
        RESOURCES_MODEL_PATH = os.path.join(MODEL_DIR, 'resources_predictor.pkl')
        joblib.dump((resources_model, mlb_resources), RESOURCES_MODEL_PATH)
        resources_accuracy = resources_model.score(X_budget, y_resources)

        # --- 4. Train Event Classifier (TF-IDF + Logistic Regression) ---
        if 'event_name' in df.columns:
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english', ngram_range=(1, 2))
        if 'event_name' in df.columns:
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english', ngram_range=(1, 2))
            # Use LogisticRegression which often works better for small text datasets
            classifier = LogisticRegression(random_state=42, class_weight='balanced', max_iter=1000)
            
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
                # Filter out valid dict items only
                valid_items = [item for item in breakdown_list if isinstance(item, dict)]
                event_total = sum(item.get('amount', 0) for item in valid_items)
                
                if event_total > 0:
                    for item in valid_items:
                        name = item.get('name', 'Misc')
                        amount = item.get('amount', 0)
                        name_key = name.strip().title() 
                        if name_key not in profile: profile[name_key] = 0
                        profile[name_key] += (amount / event_total) / total_events
            
            budget_profiles[event_type] = {k: round(v, 2) for k, v in profile.items() if v > 0.05}
            
        joblib.dump(budget_profiles, BREAKDOWN_PROFILE_PATH)

        # --- 5. Learn Timeline Profiles ---
        timeline_profiles = {}
        for event_type in df['event_type'].unique():
            type_df = df[df['event_type'] == event_type]
            timelines = []
            
            for activities in type_df['activities_list']:
                timeline = None
                if isinstance(activities, dict):  # Multi-day format {day1: [...], day2: [...]}
                    # Extract day1 as the primary timeline pattern
                    if 'day1' in activities and isinstance(activities['day1'], list) and activities['day1']:
                        timeline = activities['day1']
                elif isinstance(activities, list) and activities:  # Single-day format [...]
                    timeline = activities
                
                # Validate and clean timeline data
                if timeline:
                    valid_timeline = []
                    for activity in timeline:
                        if isinstance(activity, dict) and 'phase' in activity:
                            # Ensure all required fields exist
                            cleaned = {
                                'phase': activity.get('phase', 'Activity'),
                                'startTime': activity.get('startTime', activity.get('start_time', '09:00 AM')),
                                'endTime': activity.get('endTime', activity.get('end_time', '10:00 AM'))
                            }
                            valid_timeline.append(cleaned)
                    
                    if valid_timeline:
                        timelines.append(valid_timeline)
            
            if timelines:
                # Store all timeline examples for this event type
                timeline_profiles[event_type] = timelines
        
        TIMELINE_PROFILE_PATH = os.path.join(MODEL_DIR, 'timeline_profiles.pkl')
        joblib.dump(timeline_profiles, TIMELINE_PROFILE_PATH)

        # Convert any NaN values to 0 for JSON compatibility
        def safe_float(val):
            return 0.0 if (isinstance(val, float) and np.isnan(val)) else float(val)
        
        metadata = {
            'trained_at': datetime.now().isoformat(),
            'samples': len(df),
            'budget_score': safe_float(budget_score),
            'equipment_accuracy': safe_float(equipment_accuracy),
            'equipment_labels': list(mlb.classes_),
            'resources_accuracy': safe_float(resources_accuracy),
            'resources_labels': list(mlb_resources.classes_)
        }
        joblib.dump(metadata, METADATA_PATH)

        return jsonify({
            'success': True, 
            'message': f'Models trained on {len(df)} samples',
            'metrics': {
                'budget_r2': round(safe_float(budget_score), 4),
                'equipment_acc': round(safe_float(equipment_accuracy), 4)
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/predict-resources', methods=['POST'])
def predict_resources():
    """
    TRUE AI PREDICTION using scikit-learn models trained on ALL events.
    This learns patterns from the entire dataset, not just one similar event.
    """
    try:
        data = request.json
        print(f"\n{'='*60}")
        print(f"TRUE ML PREDICTION (Learning from ALL events)")
        print(f"{'='*60}")
        print(f"Request: {data}")
        
        event_type = data.get('eventType', 'Academic')
        attendees = int(data.get('attendees', 100))
        duration = float(data.get('duration', 4))
        event_name = data.get('eventName', '')

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

        # Load ALL training data for analysis
        df = load_training_data()
        
        if df.empty:
            print("[ML] No training data available, using fallback predictions")
            return generate_fallback_predictions(event_type, attendees, duration)

        print(f"[ML] Loaded {len(df)} training samples for ML prediction")
        
        # ========================================================================
        # STEP 0: EVENT TYPE CLASSIFICATION CONFIDENCE
        # ========================================================================
        try:
            if event_name and os.path.exists(EVENT_CLASSIFIER_PATH) and os.path.exists(EVENT_VECTORIZER_PATH):
                classifier = joblib.load(EVENT_CLASSIFIER_PATH)
                vectorizer = joblib.load(EVENT_VECTORIZER_PATH)
                text_vec = vectorizer.transform([event_name])
                
                # CHECK FOR UNKNOWN WORDS (Zero Vector)
                # If the input text has no overlap with training vocabulary,
                # the vector will be all zeros, meaning the model is just guessing.
                if text_vec.nnz == 0:
                    print(f"[TYPE ML] No vocabulary overlap for '{event_name}' - Unknown Event")
                    predictions['confidence'] = 10.0
                    predictions['eventType'] = 'Unknown' # Optional: could leave as guessed but low confidence
                else:
                    probs = classifier.predict_proba(text_vec)[0]
                    type_confidence = round(max(probs) * 100, 1)  # Round to 1 decimal place
                    predictions['confidence'] = type_confidence
                    
                    # FIX: Actually USE the predicted event type if confidence is good
                    predicted_class_index = probs.argmax()
                    predicted_type = classifier.classes_[predicted_class_index]
                    
                    if type_confidence > 40.0:  # Threshold to override user input/default
                        print(f"[TYPE ML] 🚀 overriding event type to: {predicted_type}")
                        predictions['eventType'] = predicted_type
                        event_type = predicted_type  # Update local var for subsequent lookups
                        type_mapping = {'Academic': 0, 'Sports': 1, 'Cultural': 2, 'Workshop': 3, 'Seminar': 4}
                        event_type_encoded = type_mapping.get(event_type, 0)
        except Exception as e:
            print(f"[TYPE ML] Could not get type confidence: {e}")

        # ========================================================================
        # STEP 1: BUDGET PREDICTION - Learn from ALL events using ML
        # ========================================================================
        print(f"\n[BUDGET ML] Predicting budget using regression on ALL {len(df)} events...")
        
        try:
            # Use RandomForestRegressor for better accuracy
            X_budget = df[['event_type_encoded', 'attendees']].values
            y_budget = df['total_budget'].values
            
            # Train on ALL events
            budget_regressor = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=10)
            budget_regressor.fit(X_budget, y_budget)
            
            # Predict for new event
            predicted_budget = budget_regressor.predict([[event_type_encoded, attendees]])[0]
            predictions['estimatedBudget'] = max(1000, int(predicted_budget))
            
            # Calculate confidence using cross-validation on training data
            scores = cross_val_score(budget_regressor, X_budget, y_budget, cv=min(3, len(df)), scoring='r2')
            budget_confidence = max(0.5, min(0.95, scores.mean()))
            # DON'T overwrite type confidence if already set
            if 'confidence' not in predictions or predictions['confidence'] == 0.85:
                predictions['confidence'] = budget_confidence
            
            print(f"[BUDGET ML] Predicted: ₱{predictions['estimatedBudget']:,} (confidence: {budget_confidence:.2%})")
            print(f"[BUDGET ML] Model trained on {len(df)} samples, R² score: {scores.mean():.3f}")
            
        except Exception as e:
            print(f"[BUDGET ML] Error: {e}, using fallback")
            rate = {'Academic': 200, 'Sports': 250, 'Cultural': 300, 'Workshop': 220, 'Seminar': 180}.get(event_type, 200)
            predictions['estimatedBudget'] = attendees * rate

        # ========================================================================
        # STEP 2: EQUIPMENT PREDICTION - Learn equipment patterns from ALL events
        # ========================================================================
        print(f"\n[EQUIPMENT ML] Learning equipment patterns from ALL events...")
        
        try:
            # Collect ALL equipment from ALL events
            all_equipment_counts = {}
            type_equipment_counts = {}
            equipment_quantities = {} # NEW: Track quantities
            
            for idx, row in df.iterrows():
                eq_list = row.get('equipment_list', [])
                eq_objects = row.get('equipment_objects', []) # NEW
                event_type_row = row.get('event_type', '')
                
                # Use eq_objects if available to get quantities
                for item_obj in eq_objects:
                    name = item_obj.get('name')
                    qty = int(item_obj.get('quantity', 1))
                    
                    if name not in equipment_quantities:
                        equipment_quantities[name] = []
                    equipment_quantities[name].append(qty)

                for item in eq_list:
                    # Count across ALL events
                    all_equipment_counts[item] = all_equipment_counts.get(item, 0) + 1
                    
                    # Count by event type
                    if event_type_row not in type_equipment_counts:
                        type_equipment_counts[event_type_row] = {}
                    type_equipment_counts[event_type_row][item] = type_equipment_counts[event_type_row].get(item, 0) + 1
            
            # Calculate probability: how often does each equipment appear for this event type?
            equipment_probs = {}
            if event_type in type_equipment_counts:
                type_total_events = len(df[df['event_type'] == event_type])
                for item, count in type_equipment_counts[event_type].items():
                    probability = count / type_total_events
                    equipment_probs[item] = probability
            
            # Select equipment with >30% probability for this event type
            predicted_equipment = [item for item, prob in equipment_probs.items() if prob > 0.3]
            
            # Add high-frequency items from ALL events (>50% appearance rate)
            for item, count in all_equipment_counts.items():
                if count / len(df) > 0.5 and item not in predicted_equipment:
                    predicted_equipment.append(item)
            
            # Adjust based on attendees (large events need more equipment)
            if attendees > 200:
                for item in ['Microphone', 'Speaker', 'Tables', 'Chairs']:
                    if item in all_equipment_counts and item not in predicted_equipment:
                        predicted_equipment.append(item)
            
            # Format as objects with quantities
            final_resources = []
            for item in predicted_equipment:
                # Calculate average quantity from history
                avg_qty = 1
                if item in equipment_quantities and equipment_quantities[item]:
                    quantities = equipment_quantities[item]
                    avg_qty = max(1, int(round(sum(quantities) / len(quantities))))
                
                final_resources.append({'name': item, 'quantity': avg_qty})

            predictions['resources'] = final_resources
            predictions['equipment'] = final_resources
            
            print(f"[EQUIPMENT ML] Predicted {len(predicted_equipment)} items based on:")
            print(f"  - {len(type_equipment_counts.get(event_type, {}))} patterns from {event_type} events")
            print(f"  - Equipment probabilities: {[(k, f'{v:.1%}') for k, v in sorted(equipment_probs.items(), key=lambda x: -x[1])[:5]]}")
            
        except Exception as e:
            print(f"[EQUIPMENT ML] Error: {e}, using fallback")
            defaults = {
                'Academic': [{'name': 'Projector', 'quantity': 1}, {'name': 'Microphone', 'quantity': 1}, {'name': 'Whiteboard', 'quantity': 1}],
                'Sports': [{'name': 'Scoreboard', 'quantity': 1}, {'name': 'First Aid Kit', 'quantity': 1}, {'name': 'Sound System', 'quantity': 1}],
                'Cultural': [{'name': 'Stage', 'quantity': 1}, {'name': 'Sound System', 'quantity': 1}, {'name': 'Microphone', 'quantity': 2}, {'name': 'Lighting', 'quantity': 4}]
            }
            predictions['resources'] = defaults.get(event_type, [{'name': 'Projector', 'quantity': 1}])

        # ========================================================================
        # STEP 2.5: ADDITIONAL RESOURCES PREDICTION - Learn from ALL events
        # ========================================================================
        print(f"\n[ADDITIONAL RL] Learning additional resource patterns...")
        
        try:
            # Collect ALL additional resources
            all_additional_counts = {}
            type_additional_counts = {}
            
            for idx, row in df.iterrows():
                res_list = row.get('additional_resources_list', [])
                event_type_row = row.get('event_type', '')
                
                for item in res_list:
                    # Count frequency
                    all_additional_counts[item] = all_additional_counts.get(item, 0) + 1
                    
                    if event_type_row not in type_additional_counts:
                        type_additional_counts[event_type_row] = {}
                    type_additional_counts[event_type_row][item] = type_additional_counts[event_type_row].get(item, 0) + 1
            
            # Calculate probability
            additional_probs = {}
            if event_type in type_additional_counts:
                type_total_events = len(df[df['event_type'] == event_type])
                for item, count in type_additional_counts[event_type].items():
                    probability = count / type_total_events
                    additional_probs[item] = probability
            
            # Select items with >20% probability (lower threshold for extras)
            predicted_additional = [item for item, prob in additional_probs.items() if prob > 0.2]
            
            # Add high-frequency items from ALL events (>40%)
            for item, count in all_additional_counts.items():
                if count / len(df) > 0.4 and item not in predicted_additional:
                    predicted_additional.append(item)
            
            predictions['additionalResources'] = predicted_additional
            print(f"[ADDITIONAL RL] Predicted {len(predicted_additional)} items")
            
        except Exception as e:
            print(f"[ADDITIONAL RL] Error: {e}")
            predictions['additionalResources'] = []

        # ========================================================================
        # STEP 3: BUDGET BREAKDOWN - Learn from TOP 3 similar events ONLY
        # ========================================================================
        print(f"\n[BREAKDOWN ML] Finding similar events for budget breakdown...")
        
        # We'll find top similar events first, then use them for breakdown
        top_similar_events = []
        top_similarities = []
        
        if event_name and len(event_name) > 3:
            try:
                type_df = df[df['event_type'] == event_type]
                
                if not type_df.empty and 'event_name' in type_df.columns:
                    vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
                    training_names = type_df['event_name'].tolist()
                    all_names = training_names + [event_name]
                    
                    vectors = vectorizer.fit_transform(all_names)
                    input_vector = vectors[-1]
                    training_vectors = vectors[:-1]
                    
                    similarities = cosine_similarity(input_vector, training_vectors)[0]
                    
                    # Get TOP 3 similar events
                    top_indices = similarities.argsort()[-3:][::-1]
                    top_similarities = similarities[top_indices]
                    
                    print(f"[BREAKDOWN ML] Top 3 similar events for budget:")
                    for idx, sim in zip(top_indices, top_similarities):
                        if sim > 0.01:  # Very low threshold - even weak matches are useful
                            similar_evt = type_df.iloc[idx]
                            top_similar_events.append(similar_evt)
                            print(f"  - {similar_evt['event_name']} (similarity: {sim:.2%})")
                    
                    # If no matches found, use most similar event anyway
                    if len(top_similar_events) == 0 and len(top_indices) > 0:
                        print(f"[BREAKDOWN ML] No strong matches, using top event anyway")
                        top_similar_events.append(type_df.iloc[top_indices[0]])
            except Exception as e:
                print(f"[BREAKDOWN ML] Similarity error: {e}")
        
        # Use ONLY top similar events for breakdown
        if len(top_similar_events) > 0:
            try:
                breakdown_patterns = {}
                
                # Collect categories ONLY from top similar events
                for similar_evt in top_similar_events:
                    breakdown_list = similar_evt.get('budget_breakdown_list', [])
                    total_budget = similar_evt.get('total_budget', 1)
                    
                    for item in breakdown_list:
                        category = item.get('name', 'Misc')
                        amount = item.get('amount', 0)
                        percentage = (amount / total_budget) * 100 if total_budget > 0 else 0
                        
                        if category not in breakdown_patterns:
                            breakdown_patterns[category] = []
                        breakdown_patterns[category].append(percentage)
                
                # Calculate AVERAGE percentage for each category
                avg_percentages = {}
                for category, percentages in breakdown_patterns.items():
                    avg_percentages[category] = sum(percentages) / len(percentages)
                
                # Apply learned percentages to predicted budget
                total_budget = predictions['estimatedBudget']
                learned_breakdown = {}
                
                for category, avg_pct in avg_percentages.items():
                    learned_breakdown[category] = int((avg_pct / 100) * total_budget)
                
                # Normalize to ensure sum equals total budget
                breakdown_sum = sum(learned_breakdown.values())
                if breakdown_sum > 0:
                    for category in learned_breakdown:
                        learned_breakdown[category] = int((learned_breakdown[category] / breakdown_sum) * total_budget)
                
                predictions['budgetBreakdown'] = learned_breakdown
                
                print(f"[BREAKDOWN ML] Learned from TOP {len(top_similar_events)} similar events only")
                print(f"  - Categories used: {list(learned_breakdown.keys())}")
                
            except Exception as e:
                print(f"[BREAKDOWN ML] Error: {e}, using default allocation")
                predictions['budgetBreakdown'] = {
                    "Equipment": int(predictions['estimatedBudget'] * 0.35),
                    "Venue": int(predictions['estimatedBudget'] * 0.25),
                    "Materials": int(predictions['estimatedBudget'] * 0.20),
                    "Marketing": int(predictions['estimatedBudget'] * 0.10),
                    "Miscellaneous": int(predictions['estimatedBudget'] * 0.10)
                }
        else:
            # Fallback if no similar events found
            predictions['budgetBreakdown'] = {
                "Equipment": int(predictions['estimatedBudget'] * 0.35),
                "Venue": int(predictions['estimatedBudget'] * 0.25),
                "Materials": int(predictions['estimatedBudget'] * 0.20),
                "Marketing": int(predictions['estimatedBudget'] * 0.10),
                "Miscellaneous": int(predictions['estimatedBudget'] * 0.10)
            }

        # ========================================================================
        # STEP 4: TIMELINE - Reuse top similar events already found
        # ========================================================================
        print(f"\n[TIMELINE ML] Using top similar events for timeline generation...")
        
        if len(top_similar_events) > 0:
            try:
                combined_phases = []
                phase_occurrences = {}
                
                print(f"[TIMELINE ML] Combining timelines from {len(top_similar_events)} similar events")
                
                # Analyze phases from top similar events
                for similar_event in top_similar_events:
                    activities = similar_event.get('activities_list', [])
                    
                    if isinstance(activities, list):
                        for activity in activities:
                            if isinstance(activity, dict) and activity.get('phase'):
                                phase_name = activity.get('phase')
                                
                                if phase_name not in phase_occurrences:
                                    phase_occurrences[phase_name] = {
                                        'count': 0,
                                        'start_times': [],
                                        'end_times': []
                                    }
                                
                                phase_occurrences[phase_name]['count'] += 1
                                phase_occurrences[phase_name]['start_times'].append(
                                    activity.get('startTime', activity.get('start_time', '09:00'))
                                )
                                phase_occurrences[phase_name]['end_times'].append(
                                    activity.get('endTime', activity.get('end_time', '10:00'))
                                )
                
                # Use phases that appear in majority of similar events
                min_occurrences = max(1, len(top_similar_events) // 2)  # At least half
                for phase_name, data in phase_occurrences.items():
                    if data['count'] >= min_occurrences:
                        # Use most common time (mode)
                        start_time = max(set(data['start_times']), key=data['start_times'].count)
                        end_time = max(set(data['end_times']), key=data['end_times'].count)
                        
                        combined_phases.append({
                            'phase': phase_name,
                            'startTime': convert_to_24hour(start_time),
                            'endTime': convert_to_24hour(end_time)
                        })
                
                if combined_phases:
                    # Sort by start time
                    combined_phases.sort(key=lambda x: x['startTime'])
                    predictions['timeline'] = combined_phases
                    
                    # Get description and attendees from most similar event
                    predictions['description'] = top_similar_events[0].get('description', '')
                    predictions['suggestedAttendees'] = int(top_similar_events[0].get('attendees', attendees))
                    
                    print(f"[TIMELINE ML] Generated {len(combined_phases)} phases")
                    
            except Exception as e:
                print(f"[TIMELINE ML] Error: {e}")
                import traceback
                traceback.print_exc()

        # Fallback timeline if none generated
        if not predictions.get('timeline'):
            predictions['timeline'] = [
                {'phase': 'Registration', 'startTime': '08:00', 'endTime': '08:30'},
                {'phase': 'Opening Ceremony', 'startTime': '08:30', 'endTime': '09:00'},
                {'phase': 'Main Activities', 'startTime': '09:00', 'endTime': '12:00'},
                {'phase': 'Lunch Break', 'startTime': '12:00', 'endTime': '13:00'},
                {'phase': 'Afternoon Session', 'startTime': '13:00', 'endTime': '16:00'},
                {'phase': 'Closing Ceremony', 'startTime': '16:00', 'endTime': '17:00'}
            ]

        print(f"\n{'='*60}")
        print(f"[ML SUMMARY] Prediction complete!")
        print(f"  Budget: ₱{predictions['estimatedBudget']:,}")
        print(f"  Equipment: {len(predictions['resources'])} items")
        print(f"  Timeline: {len(predictions['timeline'])} phases")
        print(f"  Confidence: {predictions['confidence']:.1%}")
        print(f"{'='*60}\n")
        
        return jsonify({'success': True, **predictions})

    except Exception as e:
        import traceback
        print(f"[ML ERROR] {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


def generate_fallback_predictions(event_type, attendees, duration):
    """Fallback when no training data exists"""
    rate = {'Academic': 200, 'Sports': 250, 'Cultural': 300, 'Workshop': 220, 'Seminar': 180}.get(event_type, 200)
    budget = attendees * rate
    
    equipment_defaults = {
        'Academic': ['Projector', 'Microphone', 'Whiteboard', 'Chairs', 'Tables'],
        'Sports': ['Scoreboard', 'First Aid Kit', 'Sound System', 'Timer'],
        'Cultural': ['Stage', 'Sound System', 'Microphone', 'Lighting', 'Decorations']
    }
    
    return jsonify({
        'success': True,
        'estimatedBudget': budget,
        'resources': equipment_defaults.get(event_type, ['Projector']),
        'timeline': [
            {'phase': 'Registration', 'startTime': '08:00', 'endTime': '08:30'},
            {'phase': 'Main Event', 'startTime': '08:30', 'endTime': '17:00'}
        ],
        'budgetBreakdown': {
            'Equipment': int(budget * 0.4),
            'Venue': int(budget * 0.3),
            'Other': int(budget * 0.3)
        },
        'confidence': 0.5
    })

@ml_bp.route('/classify-event-type', methods=['POST'])
def classify_event_type():
    try:
        data = request.json
        text = data.get('text', '')
        
        print(f'[CLASSIFY] Input text: "{text}"')
        
        if not text or len(text) < 3:
            return jsonify({'success': False, 'error': 'Text too short'})

        if not os.path.exists(EVENT_CLASSIFIER_PATH) or not os.path.exists(EVENT_VECTORIZER_PATH):
            print(f'[CLASSIFY] Models not found! Classifier: {os.path.exists(EVENT_CLASSIFIER_PATH)}, Vectorizer: {os.path.exists(EVENT_VECTORIZER_PATH)}')
            return jsonify({'success': False, 'message': 'Models not initialized'})

        classifier = joblib.load(EVENT_CLASSIFIER_PATH)
        vectorizer = joblib.load(EVENT_VECTORIZER_PATH)
        
        print(f'[CLASSIFY] Loaded models. Classes: {classifier.classes_}')

        text_vec = vectorizer.transform([text])
        prediction = classifier.predict(text_vec)[0]
        
        probs = classifier.predict_proba(text_vec)[0]
        confidence = max(probs) * 100
        
        print(f'[CLASSIFY] Prediction: {prediction}, Confidence: {confidence:.1f}%')

        return jsonify({
            'success': True,
            'eventType': prediction,
            'confidence': round(confidence, 1)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/model-status', methods=['GET'])
def model_status():
    """
    Check if ML models are trained and ready to use.
    Returns model availability, metadata, and training status.
    """
    try:
        # Check if all critical models exist
        models_exist = {
            'budget': os.path.exists(BUDGET_MODEL_PATH),
            'equipment': os.path.exists(EQUIPMENT_MODEL_PATH),
            'classifier': os.path.exists(EVENT_CLASSIFIER_PATH),
            'breakdown': os.path.exists(BREAKDOWN_PROFILE_PATH)
        }
        
        all_ready = all(models_exist.values())
        
        # Load metadata if available
        metadata = None
        if os.path.exists(METADATA_PATH):
            try:
                metadata = joblib.load(METADATA_PATH)
            except:
                metadata = None
        
        # Get training data count
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as total FROM ai_training_data WHERE is_validated = 1")
            training_samples = cursor.fetchone()['total']
            conn.close()
        except:
            training_samples = 0
        
        return jsonify({
            'success': True,
            'ready': all_ready,
            'models': models_exist,
            'metadata': metadata,
            'training_samples': training_samples,
            'needs_training': training_samples >= 5 and not all_ready
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/quick-estimate', methods=['POST'])
def quick_estimate():
    """
    Lightweight budget estimation for inline hints.
    Only requires event type (and optionally attendees).
    """
    try:
        data = request.json
        event_type = data.get('eventType', 'Academic')
        attendees = int(data.get('attendees', 100)) if data.get('attendees') else 100
        
        type_mapping = {'Academic': 0, 'Sports': 1, 'Cultural': 2, 'Workshop': 3, 'Seminar': 4}
        event_type_encoded = type_mapping.get(event_type, 0)
        
        # Try using trained model first
        if os.path.exists(BUDGET_MODEL_PATH):
            budget_model = joblib.load(BUDGET_MODEL_PATH)
            estimated = budget_model.predict([[event_type_encoded, attendees]])[0]
            estimated_budget = max(1000, int(estimated))
            using_model = True
        else:
            # Fallback to simple calculation
            base_rates = {'Academic': 150, 'Sports': 200, 'Cultural': 300, 'Workshop': 180, 'Seminar': 160}
            rate = base_rates.get(event_type, 150)
            estimated_budget = attendees * rate
            using_model = False
        
        return jsonify({
            'success': True,
            'estimatedBudget': estimated_budget,
            'usingModel': using_model
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@ml_bp.route('/suggest-reschedule', methods=['POST'])
def suggest_reschedule():
    """
    AI-powered reschedule date suggestions using scikit-learn
    Pattern: 1 suggestion BEFORE conflict, 4 suggestions AFTER conflict
    Uses ml_scheduler.py for intelligent, data-driven recommendations
    """
    try:
        from backend.ml_scheduler import suggest_reschedule_dates_ai
        from datetime import datetime
        
        data = request.get_json()
        event_id = data.get('eventId')
        venue = data.get('venue')
        original_date = data.get('originalDate')  # ISO format
        
        if not all([event_id, venue, original_date]):
            return jsonify({'success': False, 'error': 'Missing required parameters'})
        
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # Fetch the event to get its details
        cursor.execute("""
            SELECT id, event_type, start_datetime, end_datetime
            FROM events 
            WHERE id = %s
        """, (event_id,))
        current_event = cursor.fetchone()
        
        if not current_event:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Event not found'})
        
        cursor.close()
        conn.close()
        
        # Get event details
        event_start = current_event['start_datetime']
        event_end = current_event['end_datetime']
        event_type = current_event.get('event_type', 'Academic')
        
        # Use our new AI-powered scheduler with error handling (Bug #10)
        try:
            ai_suggestions = suggest_reschedule_dates_ai(
                venue=venue,
                requested_start=event_start,
                requested_end=event_end,
                event_type=event_type,
                exclude_event_id=event_id
            )
        except Exception as ai_error:
            # Graceful fallback if AI scheduler fails
            import logging
            logging.error(f"AI scheduler failed: {ai_error}, using fallback")
            ai_suggestions = []
            # Could add simple fallback logic here if needed
        
        # Format suggestions for frontend
        formatted_suggestions = []
        for suggestion in ai_suggestions:
            # Parse the dates from AI scheduler format
            start_date_str = suggestion['start']  # Format: "YYYY-MM-DD HH:MM"
            end_date_str = suggestion['end']
            
            # Extract just the date part for single-day events
            date_only = start_date_str.split(' ')[0] if ' ' in start_date_str else start_date_str
            
            # Calculate days from original
            orig_date = event_start.date() if hasattr(event_start, 'date') else event_start
            sugg_date = datetime.strptime(date_only, '%Y-%m-%d').date()
            days_diff = (sugg_date - orig_date).days
            
            formatted_suggestions.append({
                'date': date_only,
                'endDate': date_only,  # Single day for most events
                'displayDate': suggestion['day'],
                'score': suggestion.get('confidence', 0.5),
                'dayOfWeek': suggestion['day'].split(',')[0],  # e.g., "Monday"
                'daysFromOriginal': days_diff,
                'confidence': suggestion.get('confidence', 0.5),
                'ai_recommended': suggestion.get('ai_recommended', False)
            })
        
        return jsonify({
            'success': True,
            'suggestions': formatted_suggestions,
            'totalChecked': len(formatted_suggestions),
            'usedML': True,  # Always true now
            'pattern': '1 before, 4 after (AI-powered)'
        })
    
    except Exception as e:
        import traceback
        print(f"Error in suggest_reschedule: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

