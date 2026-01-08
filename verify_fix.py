import requests
import json
import time

def verify_prediction():
    url = "http://localhost:5001/api/ml/predict-resources"
    payload = {
        "eventType": "Academic",
        "attendees": 100,
        "eventName": "Test Event",
        "duration": 4
    }
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                resources = data.get('resources', [])
                print("\nPredicted Resources:")
                for item in resources:
                    print(f"  - {item.get('name')}: Quantity {item.get('quantity')}")
                
                # Check if any quantity > 1 (assuming training data has some)
                has_quantities = any(item.get('quantity', 1) > 1 for item in resources)
                print(f"\nHas multiple quantities: {has_quantities}")
                
            else:
                print("API returned success=False:", data)
        else:
            print(f"Failed with status {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Wait a moment in case server is restarting (though Python usually autoreloads)
    time.sleep(2) 
    verify_prediction()
