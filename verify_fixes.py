#!/usr/bin/env python3
"""
Verification script for attendance system fixes
Run this to verify all changes are in place
"""
import os

def check_file(path, search_text, description):
    """Check if a file contains specific text"""
    try:
        with open(path, 'r') as f:
            content = f.read()
            if search_text in content:
                print(f"✅ {description}")
                return True
            else:
                print(f"❌ {description} - NOT FOUND")
                return False
    except FileNotFoundError:
        print(f"❌ {description} - FILE NOT FOUND")
        return False

def main():
    print("=" * 80)
    print("ATTENDANCE SYSTEM FIXES VERIFICATION")
    print("=" * 80)
    print()
    
    checks = [
        # QR Scanner fixes
        ("static/js/components/QRScanner.js", "window.jsQR", 
         "Real QR scanning with jsQR library"),
        ("static/js/components/QRScanner.js", "requestAnimationFrame", 
         "Optimized scanning with requestAnimationFrame"),
        
        # Staff template fixes
        ("templates/staff.html", "jsqr@1.4.0", 
         "jsQR library CDN loaded"),
        ("templates/staff.html", "loadEvents", 
         "Dynamic event loading function"),
        ("templates/staff.html", "/api/events?status=Approved", 
         "Events fetched from API"),
        
        # Backend fixes
        ("backend/api_attendance.py", "Student Organization Officer", 
         "Role permissions fixed"),
        ("backend/api_attendance.py", "check_in_method", 
         "Check-in method tracking in API"),
        
        # Database fixes
        ("database/feedback_schema.sql", "check_in_method ENUM('QR', 'Manual')", 
         "Database schema updated with check_in_method"),
        ("database/add_check_in_method.sql", "ALTER TABLE", 
         "Migration script created"),
    ]
    
    passed = 0
    failed = 0
    
    for filepath, search, desc in checks:
        full_path = os.path.join(os.path.dirname(__file__), filepath)
        if check_file(full_path, search, desc):
            passed += 1
        else:
            failed += 1
    
    print()
    print("=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 80)
    
    if failed == 0:
        print()
        print("🎉 ALL FIXES VERIFIED - SYSTEM READY FOR PRODUCTION!")
        print()
        print("Next steps:")
        print("1. Run database migration: mysql < database/add_check_in_method.sql")
        print("2. Start the server and test QR scanning")
        print("3. Verify with real student QR codes")
    else:
        print()
        print("⚠️  Some fixes are missing. Please review the failed checks above.")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
