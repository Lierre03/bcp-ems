import requests
import json

def test_ml_prediction():
    url = 'http://localhost:5001/api/ml/predict-resources'
    data = {
        'eventType': 'Student Council Election',
        'attendees': 500,
        'eventName': 'Student Council Election 2026',
        'duration': 8
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\nFull Response Keys:", result.keys())
            
            if 'budgetBreakdown' in result:
                print("\nBudget Breakdown Type:", type(result['budgetBreakdown']))
                print("Budget Breakdown Content:", json.dumps(result['budgetBreakdown'], indent=2))
            else:
                print("\nNO 'budgetBreakdown' in response!")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ml_prediction()
