from flask import Blueprint, jsonify, request, session
from backend.auth import require_role
from backend.property_custodian_connector import connector
from database.db import get_db
import logging
import json

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')
logger = logging.getLogger(__name__)

@inventory_bp.route('', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_inventory():
    """
    Get full inventory view (Individual Assets)
    """
    try:
        inventory = connector.get_inventory_view()
        return jsonify({
            'success': True,
            'data': inventory,
            'count': len(inventory)
        }), 200
    except Exception as e:
        logger.error(f"Inventory API Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@inventory_bp.route('/tag', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def tag_asset():
    """
    Tag an asset for an event (Shadow Issuance)
    Body: { "asset_id": 123, "event_name": "Science Fair" }
    """
    try:
        data = request.get_json()
        asset_id = data.get('asset_id')
        event_name = data.get('event_name')
        
        if not asset_id or not event_name:
            return jsonify({'error': 'Missing asset_id or event_name'}), 400
            
        # User performing the action (Admin/Staff)
        admin_id = session.get('user_id')
        
        # Determining "Requestor ID" - ideal if we passed the event's requestor_id
        # For now, we reuse admin_id or a generic system ID if available?
        # Let's use admin_id as the 'assigned_to' for now (Admin taking custody for the event)
        # Or ideally, the frontend passes the event requestor id.
        # Let's assume the frontend passes 'requestor_id' if possible, else default to admin.
        event_requestor_id = data.get('requestor_id') or admin_id
        
        success, message = connector.tag_asset_for_event(asset_id, event_requestor_id, event_name, admin_id)
        
        if success:
            return jsonify({'success': True, 'message': message}), 200
        else:
            return jsonify({'success': False, 'message': message}), 400
            
    except Exception as e:
        logger.error(f"Tag Asset Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@inventory_bp.route('/fulfillment', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_fulfillment_dashboard():
    try:
        # 1. Get Inventory Summary from Property Custodian
        inventory = connector.get_inventory_summary()
        
        # 1.5 Get Active Reservations per Event
        all_reservations = connector.get_all_event_reservations()
        
        # 2. Get Pending/Approved events from Local DB
        db = get_db()
        # Fetch events that are Pending OR Approved OR Completed and include organizer info
        query = """
            SELECT 
                e.id as event_id, 
                e.name as title, 
                e.start_datetime as start_date, 
                e.equipment, 
                e.status,
                e.organizer,
                CONCAT(u.first_name, ' ', u.last_name) as requestor_name,
                u.username as requestor_username
            FROM events e
            LEFT JOIN users u ON e.requestor_id = u.id
            WHERE e.status IN ('Pending', 'Approved', 'Completed') 
            AND e.equipment IS NOT NULL 
            AND e.equipment != '[]'
            ORDER BY e.start_datetime ASC
        """
        events = db.execute_query(query)
        
        dashboard_data = []
        
        for event in events:
            try:
                equipment_needed = json.loads(event['equipment']) if isinstance(event['equipment'], str) else event['equipment']
            except:
                equipment_needed = []
                
            if not equipment_needed:
                continue
                
            # Check availability for this event
            fulfillment_status = 'Ready' # Default to Ready
            items_status = []
            
            # Reservations for this specfic event
            event_res = all_reservations.get(event['event_id'], {})
            
            for item in equipment_needed:
                name = item.get('name')
                qty_needed = int(item.get('qty', item.get('quantity', 0)))
                
                # Check New Stock Logic
                # 1. Total available in storage
                stock = inventory.get(name, {'available': 0, 'total': 0})
                available_in_storage = stock['available']
                
                # 2. Already Reserved for this event
                qty_reserved = event_res.get(name, 0)
                
                # 3. Calculate Logic
                # Remaining need
                remaining_needed = max(0, qty_needed - qty_reserved)
                
                # Status Determination
                status = 'Available'
                
                if qty_reserved >= qty_needed:
                     status = 'Fulfilled'
                elif available_in_storage < remaining_needed:
                     status = 'Shortage'
                     fulfillment_status = 'Shortage'
                
                items_status.append({
                    'name': name,
                    'qty_needed': qty_needed,
                    'qty_available': available_in_storage,
                    'qty_reserved': qty_reserved,
                    'status': status,
                    'category': stock.get('category', 'Equipment')
                })
            
            dashboard_data.append({
                'event_id': event['event_id'],
                'title': event['title'],
                'start_date': event['start_date'],
                'status': fulfillment_status, 
                'event_status': event['status'], 
                'items': items_status,
                'organizer': event['organizer'],
                'requestor_name': event['requestor_name'],
                'requestor_username': event['requestor_username']
            })
            
        return jsonify({'success': True, 'data': dashboard_data})

    except Exception as e:
        logger.error(f"Fulfillment API Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@inventory_bp.route('/reserve', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def reserve_items():
    try:
        data = request.json
        event_id = data.get('event_id')
        event_title = data.get('title')
        required_items = data.get('items')
        user_id = session.get('user_id') or 1
        
        success, result = connector.reserve_event_items(user_id, event_id, event_title, required_items)
        
        if success:
             details = result.get('details', []) if isinstance(result, dict) else []
             message_text = result.get('message', 'Reservation successful') if isinstance(result, dict) else str(result)
             
             # Generate Notification mimicking Resource Approval logic
             if details:
                 db = get_db()
                 # Get Requestor
                 event_row = db.execute_one("SELECT requestor_id, name FROM events WHERE id = %s", (event_id,))
                 
                 if event_row:
                     lines = []
                     any_partial = False
                     
                     # Create a lookup for details from connector
                     details_map = {d.get('name'): d for d in details}

                     for req_item in required_items:
                         r_name = req_item.get('name')
                         r_qty = req_item.get('qty', 0)
                         
                         # Case A: Explicitly sending 0 to acknowledge unavailable/rejection
                         if r_qty == 0:
                             # Retrieve original needed count from event if possible, or just default message
                             lines.append(f"• {r_name}: 0/0 available (Rejected: Unavailable)")
                             any_partial = True # TRIGGER ACTION REQUIRED MODAL
                             continue

                         # Case B: Processed by connector
                         if r_name in details_map:
                             det = details_map[r_name]
                             name = det.get('name')
                             req = det.get('requested', 0)
                             res = det.get('reserved', 0)
                             
                             if res == 0:
                                  lines.append(f"• {name}: 0/{req} available (Rejected: Unavailable)")
                                  any_partial = True # TRIGGER ACTION REQUIRED MODAL
                             elif res < req:
                                  lines.append(f"• {name}: {res}/{req} available (Partially Approved)")
                                  any_partial = True
                             else:
                                  lines.append(f"• {name}: {res}/{req} available (Approved)")
                     
                     if any_partial:
                         notification_msg = "Your equipment reservation has been processed. Some adjustments were made based on availability:\n\n" + "\n".join(lines)
                         notif_title = f"Action Required: Equipment Status Update for {event_row['name']}"
                         notif_type = 'equipment_adjusted'
                     else:
                         notification_msg = "Your equipment reservation has been processed. Items reserved:\n\n" + "\n".join(lines)
                         notif_title = f"Equipment Reserved: {event_row['name']}"
                         notif_type = 'status_update'
                     
                     # UPDATE EVENTS TABLE JSON to match reservation (Key for resolution page to work)
                     try:
                         # Fetch current equipment JSON
                         current_event = db.execute_one("SELECT equipment FROM events WHERE id = %s", (event_id,))
                         if current_event and current_event['equipment']:
                             eq_list = json.loads(current_event['equipment'])
                             
                             # Update statuses based on reservation details
                             for det in details:
                                 d_name = det.get('name')
                                 d_req = det.get('requested', 0)
                                 d_res = det.get('reserved', 0)
                                 
                                 for item in eq_list:
                                     if item.get('name') == d_name:
                                         if d_res == 0:
                                             item['status'] = 'Rejected'
                                             item['rejection_reason'] = 'Maintenance/Repair (Unavailable)' # Default reason for 0 avail
                                             item['approved_quantity'] = 0
                                         elif d_res < d_req:
                                             item['status'] = 'Approved' # Partial is technically Approved with lower qty in this system
                                             item['approved_quantity'] = d_res
                                         else:
                                              item['status'] = 'Approved'
                                              item['approved_quantity'] = d_res
                                         break
                             
                             # Save back to DB
                             # Also set equipment_approval_status
                             new_status = 'Approved'
                             if any_partial: # Triggers resolution flow
                                 # We keep status as Approved but maybe notify? 
                                 # Actually if any_partial, we usually want 'Pending' or similar if we want them to click?
                                 # The api_venues logic sets it to 'Approved' but notification triggers the flow.
                                 # However, to be safe, let's keep it Approved as the base status, notifications drive the UI.
                                 pass
                                 
                             db.execute_update(
                                 "UPDATE events SET equipment = %s WHERE id = %s",
                                 (json.dumps(eq_list), event_id)
                             )
                     except Exception as e:
                         logger.error(f"Failed to update event JSON: {e}")

                     db.execute_insert(
                        """INSERT INTO notifications (user_id, event_id, type, title, message, created_at, is_read)
                           VALUES (%s, %s, %s, %s, %s, NOW(), 0)""",
                        (event_row['requestor_id'], event_id, notif_type, notif_title, notification_msg)
                     )

             return jsonify({'success': True, 'message': message_text})
        return jsonify({'success': False, 'message': str(result)}), 400
    except Exception as e:
        logger.error(f"Reservation Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@inventory_bp.route('/issue', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def issue_items():
    # REMOVED: Issuance logic is handled externally by Property Custodian System
    return jsonify({'success': False, 'message': 'Endpoint disabled in School Event System. Please issue via Property Custodian.'}), 403



@inventory_bp.route('/calendar', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_inventory_calendar():
    try:
        # 1. Get Events with active reservations (Status/Counts)
        reservations = connector.get_calendar_reservations()
        
        if not reservations:
            return jsonify({'success': True, 'events': []})
            
        event_ids = list(reservations.keys())
        
        # 2. Get Event Details from Local DB
        db = get_db()
        if not event_ids:
             return jsonify({'success': True, 'events': []})
             
        # Format IDs for SQL IN clause
        placeholders = ','.join(['%s'] * len(event_ids))
        query = f"""
            SELECT id, name as title, start_datetime as start, end_datetime as end, venue
            FROM events 
            WHERE id IN ({placeholders})
        """
        events_details = db.execute_query(query, tuple(event_ids))
        
        calendar_events = []
        for evt in events_details:
            eid = evt['id']
            res_data = reservations.get(eid, {})
            
            status = res_data.get('status', 'Reserved')
            count = res_data.get('count', 0)
            
            # Determine Color
            color_class = 'bg-blue-100 text-blue-800 border-blue-200'
            if status == 'Issued':
                color_class = 'bg-green-100 text-green-800 border-green-200'
            
            calendar_events.append({
                'id': eid,
                'title': f"{evt['title']} ({count} Items)",
                'start': evt['start'].isoformat() if evt['start'] else None,
                'end': evt['end'].isoformat() if evt['end'] else None,
                'venue': evt['venue'],
                'status': status,
                'item_count': count,
                'colorClass': color_class
            })
            
        return jsonify({'success': True, 'events': calendar_events})
        
    except Exception as e:
        logger.error(f"Calendar API Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@inventory_bp.route('/manifest/<int:event_id>', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_event_manifest_endpoint(event_id):
    try:
        manifest = connector.get_event_manifest(event_id)
        return jsonify({'success': True, 'manifest': manifest})
    except Exception as e:
        logger.error(f"Manifest API Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


