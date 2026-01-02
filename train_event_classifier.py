#!/usr/bin/env python3
"""
Compact Event Type Classifier using Scikit-learn
Trains a text classifier to automatically categorize events by name/description
"""

import os
import joblib
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import mysql.connector
from config import Config
DB_CONFIG = Config.DB_CONFIG

def get_training_data():
    """Fetch training data from database + use base samples for stable foundation"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)

        # Get validated training data from ai_training_data table
        cursor.execute("""
            SELECT 
                event_name as name,
                description,
                event_type
            FROM ai_training_data
            WHERE is_validated = 1 
            AND total_budget > 0
            AND event_type IS NOT NULL
        """)
        training_data = cursor.fetchall()
        
        # Get completed events from events table
        cursor.execute("""
            SELECT 
                name,
                description,
                event_type
            FROM events
            WHERE status = 'Completed'
            AND budget > 0
            AND deleted_at IS NULL
            AND event_type IS NOT NULL
            AND name IS NOT NULL
        """)
        completed_events = cursor.fetchall()
        
        cursor.close()
        conn.close()

        # Combine database training + completed events
        all_events = training_data + completed_events
        
        print(f"📚 Loaded {len(training_data)} validated training samples from database")
        print(f"✅ Loaded {len(completed_events)} completed events")
        print(f"📊 Total: {len(all_events)} training samples")

        return all_events

    except Exception as e:
        print(f"Database error: {e}")
        return []

def prepare_features(events):
    """Prepare text features and labels"""
    texts = []
    labels = []

    for event in events:
        # Combine name and description for better classification
        text = f"{event['name']} {event.get('description', '')}".strip()
        texts.append(text)
        labels.append(event['event_type'])

    return texts, labels

def train_classifier():
    """Train and save the event type classifier"""
    print("🔍 Fetching training data...")

    events = get_training_data()
    if not events:
        print("❌ No training data found!")
        return False

    print(f"📊 Found {len(events)} training samples")

    texts, labels = prepare_features(events)

    # Check label distribution
    label_counts = Counter(labels)
    print(f"🏷️  Label distribution:\n{label_counts}")

    # Filter out classes with too few samples (minimum 2)
    valid_labels = [label for label, count in label_counts.items() if count >= 2]
    filtered_texts = []
    filtered_labels = []

    for text, label in zip(texts, labels):
        if label in valid_labels:
            filtered_texts.append(text)
            filtered_labels.append(label)

    if len(set(filtered_labels)) < 2:
        print("❌ Need at least 2 different event types for classification!")
        return False

    print(f"✅ Using {len(filtered_texts)} samples with {len(set(filtered_labels))} classes")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        filtered_texts, filtered_labels, test_size=0.2, random_state=42, stratify=filtered_labels
    )

    # Create TF-IDF vectorizer
    vectorizer = TfidfVectorizer(
        max_features=1000,  # Limit features for efficiency
        ngram_range=(1, 2),  # Include bigrams
        stop_words='english',
        min_df=1  # Include all terms since we have limited data
    )

    # Transform text data
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Train Logistic Regression classifier
    classifier = LogisticRegression(
        random_state=42,
        max_iter=1000,
        C=1.0  # Regularization strength
    )

    print("🚀 Training classifier...")
    classifier.fit(X_train_vec, y_train)

    # Evaluate
    y_pred = classifier.predict(X_test_vec)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"✅ Accuracy: {accuracy:.1f}")
    print("📋 Classification Report:")
    print(classification_report(y_test, y_pred))

    # Save model and vectorizer
    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, 'event_classifier.pkl')
    vectorizer_path = os.path.join(model_dir, 'event_vectorizer.pkl')

    joblib.dump(classifier, model_path)
    joblib.dump(vectorizer, vectorizer_path)

    print(f"💾 Model saved to: {model_path}")
    print(f"💾 Vectorizer saved to: {vectorizer_path}")

    return True

if __name__ == "__main__":
    success = train_classifier()
    if success:
        print("✅ Event type classifier training completed!")
    else:
        print("❌ Training failed!")
