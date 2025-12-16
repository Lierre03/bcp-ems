# ============================================================================
# EVENT DETAILS HELPERS
# Reusable functions for managing event equipment, activities, and budget
# ============================================================================

def save_event_equipment(db, event_id, equipment_list):
    """Save equipment items for an event"""
    if not equipment_list or not isinstance(equipment_list, list):
        return
    
    query = "INSERT INTO event_equipment (event_id, equipment_name) VALUES (%s, %s)"
    for equipment in equipment_list:
        db.execute_insert(query, (event_id, equipment))


def save_event_activities(db, event_id, activities_list):
    """Save activities for an event"""
    if not activities_list or not isinstance(activities_list, list):
        return
    
    query = "INSERT INTO event_activities (event_id, activity_name, sequence_order) VALUES (%s, %s, %s)"
    for idx, activity in enumerate(activities_list):
        db.execute_insert(query, (event_id, activity, idx))


def save_budget_breakdown(db, event_id, breakdown):
    """Save budget breakdown by category"""
    if not breakdown or not isinstance(breakdown, dict):
        return
    
    query = "INSERT INTO budget_breakdown (event_id, category, amount, percentage) VALUES (%s, %s, %s, %s)"
    for category, details in breakdown.items():
        db.execute_insert(query, (
            event_id,
            category,
            details.get('amount', 0),
            details.get('percentage', 0)
        ))


def get_event_equipment(db, event_id):
    """Get equipment list for an event"""
    rows = db.execute_query(
        "SELECT equipment_name, quantity FROM event_equipment WHERE event_id = %s ORDER BY id",
        (event_id,)
    )
    if not rows:
        return []
    # Return objects with equipment_name and quantity
    return [{"equipment_name": row['equipment_name'], "quantity": row.get('quantity', 1)} for row in rows]


def get_event_activities(db, event_id):
    """Get activities list for an event"""
    rows = db.execute_query(
        "SELECT activity_name, sequence_order FROM event_activities WHERE event_id = %s ORDER BY sequence_order",
        (event_id,)
    )
    if not rows:
        return []
    # Return objects with activity_name and sequence_order properties
    return [{"activity_name": row['activity_name'], "sequence_order": row['sequence_order']} for row in rows]


def get_budget_breakdown(db, event_id):
    """Get budget breakdown for an event"""
    rows = db.execute_query(
        "SELECT category, amount, percentage FROM budget_breakdown WHERE event_id = %s",
        (event_id,)
    )
    if not rows:
        return []
    # Return array of objects with category, amount, and percentage
    return [{"category": row['category'], "amount": float(row['amount']), "percentage": float(row['percentage'])} for row in rows]
