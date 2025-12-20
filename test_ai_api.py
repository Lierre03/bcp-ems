#!/usr/bin/env python3
"""
Test script for AI training API endpoints
"""
import requests
import json

def test_ai_api():
    """Test the AI training API endpoints"""
    base_url = "http://localhost:5001"

    print("Testing AI Training API Endpoints")
    print("=" * 50)

    # Test training stats
    print("\n1. Testing /api/ml/training-stats")
    try:
        response = requests.get(f"{base_url}/api/ml/training-stats")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

    # Test training data
    print("\n2. Testing /api/ml/training-data")
    try:
        response = requests.get(f"{base_url}/api/ml/training-data")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

    # Test adding training data
    print("\n3. Testing POST /api/ml/training-data")
    try:
        test_data = {
            "event_name": "Test Event",
            "event_type": "Academic",
            "attendees": 100,
            "actual_budget": 50000
        }
        response = requests.post(
            f"{base_url}/api/ml/training-data",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ai_api()
