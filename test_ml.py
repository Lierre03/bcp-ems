#!/usr/bin/env python3
"""
Test script for ML budget prediction
"""
import sys
sys.path.append('.')
from backend.api_ml import predict_budget, train_budget_model

def test_ml():
    print("Testing ML budget prediction...")

    # Test training
    print("Training model...")
    model, encoder = train_budget_model()
    print("Model trained successfully!")

    # Test predictions
    test_cases = [
        (100, 'Academic'),
        (200, 'Sports'),
        (300, 'Cultural'),
        (50, 'Academic'),
        (500, 'Sports')
    ]

    print("\nTesting predictions:")
    for attendees, event_type in test_cases:
        prediction = predict_budget(attendees, event_type)
        print(f"Attendees: {attendees}, Type: {event_type} -> Predicted Budget: ${prediction:,}")

if __name__ == "__main__":
    test_ml()
