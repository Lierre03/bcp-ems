
import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE_URL = "http://localhost:5001"

def test_error():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    # Login
    print("Logging in...")
    login_data = json.dumps({
        "username": "admin",
        "password": "admin123"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login", 
        data=login_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with opener.open(req) as resp:
            print(f"Login status: {resp.status}")
            print(f"Login response: {resp.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Login failed: {e.code} {e.read().decode('utf-8')}")
        return
    except Exception as e:
        print(f"Login connection failed: {e}")
        return

    # Get Events
    print("\nGetting events...")
    req = urllib.request.Request(f"{BASE_URL}/api/events")
    try:
        with opener.open(req) as resp:
            print(f"Events status: {resp.status}")
            print(f"Events response: {resp.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Events failed: {e.code}")
        print(f"Events response: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Events connection failed: {e}")

    # Get Equipment
    print("\nGetting equipment...")
    req = urllib.request.Request(f"{BASE_URL}/api/venues/equipment")
    try:
        with opener.open(req) as resp:
            print(f"Equipment status: {resp.status}")
            print(f"Equipment response: {resp.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Equipment failed: {e.code}")
        print(f"Equipment response: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Equipment connection failed: {e}")

if __name__ == "__main__":
    test_error()
