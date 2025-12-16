
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    d = datetime(2025, 12, 16, 8, 0, 0)
    return jsonify({'date': d})

if __name__ == '__main__':
    app.run(port=5002)
