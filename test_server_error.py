
import requests
import sys

BASE_URL = "http://localhost:5001"

def test_error():
    session = requests.Session()
    
    # Login
    print("Logging in...")
    try:
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        print(f"Login status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
    except Exception as e:
        print(f"Login connection failed: {e}")
        return

    # Get Events
    print("\nGetting events...")
    try:
        resp = session.get(f"{BASE_URL}/api/events")
        print(f"Events status: {resp.status_code}")
        print(f"Events response: {resp.text}")
    except Exception as e:
        print(f"Events connection failed: {e}")

    # Get Equipment
    print("\nGetting equipment...")
    try:
        resp = session.get(f"{BASE_URL}/api/venues/equipment")
        print(f"Equipment status: {resp.status_code}")
        print(f"Equipment response: {resp.text}")
    except Exception as e:
        print(f"Equipment connection failed: {e}")

if __name__ == "__main__":
    test_error()
