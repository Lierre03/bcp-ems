#!/usr/bin/env python3
"""
Test Analytics Dashboard API
Tests the new analytics endpoint with proper authentication
"""

import requests
import json

BASE_URL = 'http://localhost:5001'

def test_analytics():
    # Create session to maintain cookies
    session = requests.Session()
    
    # Step 1: Login
    print("🔐 Logging in...")
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    login_response = session.post(f'{BASE_URL}/api/auth/login', json=login_data)
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    print("✅ Login successful")
    
    # Step 2: Test Analytics Dashboard Endpoint
    print("\n📊 Testing Analytics Dashboard API...")
    analytics_response = session.get(f'{BASE_URL}/api/analytics/dashboard')
    
    if analytics_response.status_code != 200:
        print(f"❌ Analytics API failed: {analytics_response.status_code}")
        print(analytics_response.text)
        return
    
    # Parse and display data
    data = analytics_response.json()
    
    print("\n" + "="*70)
    print("📈 ANALYTICS DASHBOARD DATA")
    print("="*70)
    
    # KPI Metrics
    print("\n🔢 KEY METRICS:")
    print(f"  • Total Events: {data.get('total_events', 0)}")
    print(f"  • Upcoming Events: {data.get('upcoming_events', 0)}")
    
    # Budget Stats
    budget = data.get('budget_stats', {})
    print(f"\n💰 BUDGET STATISTICS:")
    print(f"  • Total Budget: ₱{budget.get('total_budget', 0):,.2f}")
    print(f"  • Average Budget: ₱{budget.get('avg_budget', 0):,.2f}")
    print(f"  • Min Budget: ₱{budget.get('min_budget', 0):,.2f}")
    print(f"  • Max Budget: ₱{budget.get('max_budget', 0):,.2f}")
    
    # Attendance Stats
    attendance = data.get('attendance_stats', {})
    print(f"\n👥 ATTENDANCE METRICS:")
    print(f"  • Total Registrations: {attendance.get('total_registrations', 0)}")
    print(f"  • Total Attendees: {attendance.get('total_attendees', 0)}")
    print(f"  • Present: {attendance.get('present_count', 0)}")
    print(f"  • Late: {attendance.get('late_count', 0)}")
    print(f"  • Attendance Rate: {attendance.get('attendance_rate', 0):.1f}%")
    
    # Feedback Stats
    feedback = data.get('feedback_stats', {})
    print(f"\n⭐ FEEDBACK RATINGS:")
    print(f"  • Average Overall: {feedback.get('avg_rating', 0):.2f}/5")
    print(f"  • Venue Rating: {feedback.get('avg_venue_rating', 0):.2f}/5")
    print(f"  • Activities Rating: {feedback.get('avg_activities_rating', 0):.2f}/5")
    print(f"  • Organization Rating: {feedback.get('avg_organization_rating', 0):.2f}/5")
    print(f"  • Total Responses: {feedback.get('total_responses', 0)}")
    
    # Status Distribution
    status_dist = data.get('status_distribution', {})
    print(f"\n📋 STATUS DISTRIBUTION:")
    for status, count in status_dist.items():
        print(f"  • {status}: {count}")
    
    # Type Distribution
    type_dist = data.get('type_distribution', {})
    print(f"\n🎯 EVENT TYPE DISTRIBUTION:")
    for event_type, count in type_dist.items():
        print(f"  • {event_type}: {count}")
    
    # Department Distribution (Super Admin only)
    dept_dist = data.get('department_distribution', {})
    if dept_dist:
        print(f"\n🏢 DEPARTMENT DISTRIBUTION:")
        for dept, count in dept_dist.items():
            print(f"  • {dept}: {count}")
    
    # Top Venues
    top_venues = data.get('top_venues', [])
    if top_venues:
        print(f"\n🏟️ TOP 5 VENUES:")
        for i, venue in enumerate(top_venues, 1):
            print(f"  {i}. {venue['venue_name']}: {venue['usage_count']} events")
    
    # Monthly Trends
    trends = data.get('monthly_trends', [])
    if trends:
        print(f"\n📅 MONTHLY TRENDS (Last 6 months):")
        for month_data in trends:
            print(f"  • {month_data['month']}: {month_data['count']} events")
    
    # Feedback by Type
    feedback_by_type = data.get('feedback_by_type', [])
    if feedback_by_type:
        print(f"\n📊 FEEDBACK BY EVENT TYPE:")
        for type_data in feedback_by_type:
            print(f"  • {type_data['event_type']}: {type_data['avg_rating']:.2f}/5 ({type_data['count']} responses)")
    
    print("\n" + "="*70)
    print("✅ Analytics Dashboard Test Completed Successfully!")
    print("="*70)

if __name__ == "__main__":
    try:
        test_analytics()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
