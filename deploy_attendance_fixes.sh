#!/bin/bash
# Quick deployment script for attendance system fixes

echo "════════════════════════════════════════════════════════════════"
echo "  ATTENDANCE SYSTEM - DEPLOYMENT SCRIPT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Database Migration
echo "Step 1: Database Migration"
echo "─────────────────────────────────────────────────────────────────"
echo "Run this SQL command (when database is available):"
echo ""
echo "  mysql -u root -p school_event_management < database/add_check_in_method.sql"
echo ""
read -p "Press Enter after running the SQL migration..."

# Step 2: Verify Python dependencies
echo ""
echo "Step 2: Verify Dependencies"
echo "─────────────────────────────────────────────────────────────────"
echo "Checking Python dependencies..."
python3 -c "import qrcode; import pymysql; import flask" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ All Python dependencies installed"
else
    echo "⚠️  Installing missing dependencies..."
    pip3 install qrcode pymysql flask flask-cors
fi

# Step 3: Verification
echo ""
echo "Step 3: Verify All Fixes"
echo "─────────────────────────────────────────────────────────────────"
python3 verify_fixes.py

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🚀 System is ready! Start the server and test:"
echo "   1. python3 app.py"
echo "   2. Login as Staff"
echo "   3. Navigate to QR Attendance Scanner"
echo "   4. Select an event and start scanning!"
echo ""
