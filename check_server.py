import urllib.request
import json

def check_server():
    base_url = "http://localhost:5001"
    
    print(f"Checking {base_url}...")
    
    try:
        # Check equipment
        print("\nChecking /api/venues/equipment...")
        try:
            with urllib.request.urlopen(f"{base_url}/api/venues/equipment") as response:
                print(f"Status: {response.getcode()}")
                data = json.loads(response.read().decode())
                print("Success!")
        except urllib.error.HTTPError as e:
            print(f"Error: {e.code} {e.reason}")
            print(e.read().decode())
            
        # Check events
        print("\nChecking /api/events...")
        try:
            with urllib.request.urlopen(f"{base_url}/api/events") as response:
                print(f"Status: {response.getcode()}")
                data = json.loads(response.read().decode())
                print("Success!")
        except urllib.error.HTTPError as e:
            print(f"Error: {e.code} {e.reason}")
            print(e.read().decode())
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    check_server()
