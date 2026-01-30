#!/bin/bash
# Simple Deployment Script
echo "Starting deployment..."

# 1. Pull latest changes
git pull origin main

# 2. Fix permissions
chmod +x restart_app.sh

# 3. Restart Flask (Load new config/templates)
./restart_app.sh

echo "Deployment Done!"
