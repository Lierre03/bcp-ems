#!/bin/bash

PORT=12345
PID=$(lsof -t -i:$PORT)

echo "--------------------------------------------------"
echo ">> Stopping old server..."

if [ -z "$PID" ]; then
    echo "No process running on port $PORT"
else
    echo "Killing process $PID"
    kill -9 $PID
fi

echo ">> Starting new server on port $PORT..."
# Run in background, redirect output to log
nohup python3 app.py > flask.log 2>&1 &

NEW_PID=$!
echo ">> Server started! PID: $NEW_PID"
echo "--------------------------------------------------"
echo "RESTART COMPLETE!"
echo "--------------------------------------------------"
