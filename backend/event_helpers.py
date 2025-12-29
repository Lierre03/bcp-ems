# ============================================================================
# EVENT DETAILS HELPERS
# Reusable functions for managing event equipment, activities, and budget
# ============================================================================

def save_event_equipment(db, event_id, equipment_list):
    """Save equipment items for an event"""
    if not equipment_list or not isinstance(equipment_list, list):
        return
    
    # First, clear existing equipment for this event (for updates)
    db.execute_update("DELETE FROM event_equipment WHERE event_id = %s", (event_id,))
    
    # Look up equipment IDs
    for item_name in equipment_list:
        # Handle both string names and objects
        name = item_name['name'] if isinstance(item_name, dict) else item_name
        quantity = item_name['quantity'] if isinstance(item_name, dict) else 1
        
        # Find equipment ID (Validation only)
        equip = db.execute_one("SELECT id FROM equipment WHERE name = %s", (name,))
        
        if equip:
            # Insert into linking table (using name as per schema)
            db.execute_insert(
                "INSERT INTO event_equipment (event_id, equipment_name, quantity) VALUES (%s, %s, %s)", 
                (event_id, name, quantity)
            )
        else:
            # Optional: Log warning that equipment was not found
            print(f"Warning: Equipment '{name}' not found in inventory.")


def save_event_activities(db, event_id, activities_list):
    """Save activities for an event"""
    if not activities_list or not isinstance(activities_list, list):
        return
    
    # First, clear existing activities for this event (for updates)
    db.execute_update("DELETE FROM event_activities WHERE event_id = %s", (event_id,))
    
    query = "INSERT INTO event_activities (event_id, activity_name, sequence_order) VALUES (%s, %s, %s)"
    for idx, activity in enumerate(activities_list):
        # Handle both string names and objects
        name = activity['activity_name'] if isinstance(activity, dict) else activity
        db.execute_insert(query, (event_id, name, idx))


def save_budget_breakdown(db, event_id, breakdown):
    """Save budget breakdown by category"""
    if not breakdown or not isinstance(breakdown, dict):
        return
    
    # First, clear existing breakdown for this event (for updates)
    db.execute_update("DELETE FROM budget_breakdown WHERE event_id = %s", (event_id,))
    
    query = "INSERT INTO budget_breakdown (event_id, category, amount, percentage) VALUES (%s, %s, %s, %s)"
    for category, details in breakdown.items():
        # Skip empty categories with no amount
        if not category and details.get('amount', 0) == 0:
            continue
        db.execute_insert(query, (
            event_id,
            category,
            details.get('amount', 0),
            details.get('percentage', 0)
        ))


def get_event_equipment(db, event_id):
    """Get equipment list for an event"""
    # Get equipment names directly from linking table
    query = """
        SELECT equipment_name, quantity 
        FROM event_equipment
        WHERE event_id = %s 
        ORDER BY equipment_name
    """
    rows = db.execute_query(query, (event_id,))
    
    if not rows:
        return []
    
    # Return objects with name and quantity to match frontend expectations
    return [{'name': row['equipment_name'], 'quantity': row['quantity']} for row in rows]


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
