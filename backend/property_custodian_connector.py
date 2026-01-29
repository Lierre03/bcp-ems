import mysql.connector
from mysql.connector import Error
import logging
from config import Config
import datetime

logger = logging.getLogger(__name__)

class PropertyCustodianConnector:
    """
    Handles read-only and limited write operations (tagging) to the Property Custodian Database.
    Target DB: bcp_sms4_pcm
    """
    
    def __init__(self):
        # reuse config but switch database name
        self.db_config = Config.DB_CONFIG.copy()
        self.db_config['database'] = 'bcp_sms4_pcm'
        # ensure password is correct for xampp
        if self.db_config['password'] == 'root':
             self.db_config['password'] = 'root' # verify this matches connection.php
        
        # Remove unsupported 'type' key if present
        if 'type' in self.db_config:
            del self.db_config['type']

    def get_connection(self):
        """Create a new database connection"""
        try:
            connection = mysql.connector.connect(**self.db_config)
            if connection.is_connected():
                return connection
        except Error as e:
            logger.error(f"Error connecting to Property Custodian DB: {e}")
            return None

    def get_catalog(self):
        """
        Fetch unified catalog of Assets and Consumables.
        Returns: List of dicts {name, category, total_quantity, type}
        """
        conn = self.get_connection()
        if not conn:
            return []
            
        catalog = []
        try:
            cursor = conn.cursor(dictionary=True)
            
            # 1. Fetch Non-Consumables (Assets)
            # Count distinct assets that are NOT Disposed
            query_assets = """
                SELECT 
                    i.item_name as name,
                    i.category,
                    COUNT(a.asset_id) as total_quantity,
                    'Asset' as type
                FROM bcp_sms4_items i
                JOIN bcp_sms4_asset a ON i.item_id = a.item_id
                WHERE i.item_type = 'Non-Consumable' AND a.status != 'Disposed'
                GROUP BY i.item_name, i.category
            """
            cursor.execute(query_assets)
            catalog.extend(cursor.fetchall())
            
            # 2. Fetch Consumables
            # Sum quantity
            query_consumables = """
                SELECT 
                    i.item_name as name,
                    i.category,
                    SUM(c.quantity) as total_quantity,
                    'Consumable' as type
                FROM bcp_sms4_items i
                JOIN bcp_sms4_consumable c ON i.item_id = c.item_id
                WHERE i.item_type = 'Consumable' AND c.status = 'Available'
                GROUP BY i.item_name, i.category
            """
            cursor.execute(query_consumables)
            catalog.extend(cursor.fetchall())
            
            return catalog
            
        except Error as e:
            logger.error(f"Error fetching catalog: {e}")
            return []
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def get_available_asset_count(self, item_name):
        """
        Get real-time 'In-Storage' count for a specific item (Non-consumable only).
        Exclude items that are 'Reserved' in event_asset_reservations.
        """
        conn = self.get_connection()
        if not conn:
            return 0
            
        try:
            cursor = conn.cursor()
            # UPDATED LOGIC: Subtract reserved items from In-Storage count
            # We filter for items that are In-Storage AND do not have an active 'Reserved' status in reservations table
            query = """
                SELECT COUNT(a.asset_id)
                FROM bcp_sms4_asset a
                JOIN bcp_sms4_items i ON a.item_id = i.item_id
                LEFT JOIN event_asset_reservations r ON a.asset_id = r.asset_id AND r.status = 'Reserved'
                WHERE i.item_name = %s 
                AND a.status = 'In-Storage' 
                AND r.asset_id IS NULL
            """
            cursor.execute(query, (item_name,))
            result = cursor.fetchone()
            return result[0] if result else 0
            
        except Error as e:
            logger.error(f"Error checking availability for {item_name}: {e}")
            return 0
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def get_inventory_view(self):
        """
        Fetch all INDIVIDUAL assets for the Inventory Tab.
        Includes User info if assigned.
        """
        conn = self.get_connection()
        if not conn:
            return []
            
        try:
            cursor = conn.cursor(dictionary=True)
            # 1. Fetch Assets (Individual Items) - Filtered for Active Inventory
            query_assets = """
                SELECT 
                    a.asset_id as id_val,
                    'asset' as type,
                    a.property_tag,
                    i.item_name,
                    i.category,
                    a.status,
                    u.fullname as current_user_name,
                    (SELECT remarks FROM bcp_sms4_issuance iss WHERE iss.asset_id = a.asset_id ORDER BY iss.assigned_date DESC LIMIT 1) as last_remarks
                FROM bcp_sms4_asset a
                JOIN bcp_sms4_items i ON a.item_id = i.item_id
                LEFT JOIN bcp_sms4_admins u ON a.assigned_to = u.id
                WHERE a.status IN ('In-Storage', 'In-Use')
            """
            
            # 2. Fetch Consumables (Bulk Items)
            query_consumables = """
                SELECT 
                    c.id as id_val,
                    'consumable' as type,
                    CONCAT('Bulk / ', c.unit) as property_tag,
                    i.item_name,
                    i.category,
                    c.status,
                    CONCAT('Qty: ', c.quantity) as current_user_name,
                    NULL as last_remarks
                FROM bcp_sms4_consumable c
                JOIN bcp_sms4_items i ON c.item_id = i.item_id
                WHERE c.status != 'Expired'
            """

            # Combine queries
            final_query = f"{query_assets} UNION ALL {query_consumables} ORDER BY item_name, property_tag"
            
            cursor.execute(final_query)
            items = cursor.fetchall()
            
            inventory_list = []
            for item in items:
                # Create a unique ID for the frontend key
                unique_id = f"{item['type']}_{item['id_val']}"
                
                inventory_list.append({
                    'asset_id': unique_id, # Frontend uses this as key
                    'original_id': item['id_val'],
                    'type': item['type'],
                    'property_tag': item['property_tag'],
                    'item_name': item['item_name'],
                    'category': item['category'],
                    'status': item['status'],
                    'current_user_name': item['current_user_name'],
                    'last_remarks': item['last_remarks']
                })
            
            return inventory_list
            
        except Error as e:
            logger.error(f"Error fetching inventory view: {e}")
            return []
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def get_inventory_summary(self):
        """
        Returns a dictionary of item_name -> {total, available, in_use}
        Used for checking availability against event requests.
        """
        conn = self.get_connection()
        if not conn:
            return {}
            
        try:
            cursor = conn.cursor(dictionary=True)
            
            # Group by Item Name to match with Event Requests (which use name)
            # EXCLUDE Reserved items from available count
            # We join with event_asset_reservations to find items that are 'Reserved'
            query = """
                SELECT 
                    i.item_name,
                    i.category,
                    COUNT(a.asset_id) as total_assets,
                    SUM(CASE 
                        WHEN a.status = 'In-Storage' AND (r.status IS NULL OR r.status != 'Reserved') 
                        THEN 1 
                        ELSE 0 
                    END) as available_assets,
                    SUM(CASE WHEN a.status = 'In-Use' OR r.status = 'Reserved' THEN 1 ELSE 0 END) as in_use_assets
                FROM bcp_sms4_items i
                LEFT JOIN bcp_sms4_asset a ON i.item_id = a.item_id
                LEFT JOIN event_asset_reservations r ON a.asset_id = r.asset_id AND r.status = 'Reserved'
                GROUP BY i.item_name, i.category
            """
            cursor.execute(query)
            assets = cursor.fetchall()
            
            # Also get Consumables
            query_consum = """
                SELECT 
                    i.item_name,
                    i.category,
                    SUM(c.quantity) as total_qty
                FROM bcp_sms4_items i
                JOIN bcp_sms4_consumable c ON i.item_id = c.item_id
                WHERE c.status != 'Expired'
                GROUP BY i.item_name, i.category
            """
            cursor.execute(query_consum)
            consumables = cursor.fetchall()
            
            summary = {}
            
            # Process Assets
            for row in assets:
                summary[row['item_name']] = {
                    'total': row['total_assets'],
                    'available': row['available_assets'] if row['available_assets'] else 0,
                    'in_use': row['in_use_assets'] if row['in_use_assets'] else 0,
                    'type': 'Asset',
                    'category': row['category']
                }
                
            # Process Consumables (Merge if name exists, else new)
            for row in consumables:
                name = row['item_name']
                qty = int(row['total_qty']) if row['total_qty'] else 0
                category = row['category']
                
                if name in summary:
                    # Rare case: Item defined as both? Just add to available for simplicity
                    summary[name]['total'] += qty
                    summary[name]['available'] += qty
                else:
                    summary[name] = {
                        'total': qty,
                        'available': qty,
                        'in_use': 0, # We don't track in-use for consumables effectively here
                        'type': 'Consumable',
                        'category': category
                    }
                    
            return summary

        except Error as e:
            logger.error(f"Error fetching inventory summary: {e}")
            return {}
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def get_all_event_reservations(self):
        """
        Fetch all active reservations grouped by Event ID and Item Name.
        Returns: { event_id: { item_name: count } }
        """
        conn = self.get_connection()
        if not conn: return {}
        
        try:
            cursor = conn.cursor(dictionary=True)
            # Join with Asset and Items to get the Name
            query = """
                SELECT 
                    r.event_id,
                    i.item_name,
                    COUNT(r.asset_id) as reserved_count
                FROM event_asset_reservations r
                JOIN bcp_sms4_asset a ON r.asset_id = a.asset_id
                JOIN bcp_sms4_items i ON a.item_id = i.item_id
                WHERE r.status = 'Reserved'
                GROUP BY r.event_id, i.item_name
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            
            reservations = {}
            for row in rows:
                eid = row['event_id']
                if eid not in reservations:
                    reservations[eid] = {}
                reservations[eid][row['item_name']] = row['reserved_count']
                
            return reservations
            
        except Error as e:
            logger.error(f"Error fetching event reservations: {e}")
            return {}
            return reservations
            
        except Error as e:
            logger.error(f"Error fetching event reservations: {e}")
            return {}
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def get_calendar_reservations(self):
        """
        Fetch ALL active reservations (Reserved OR Issued) for Calendar.
        Returns: { event_id: { 'status': 'Reserved'|'Issued', 'count': N } }
        """
        conn = self.get_connection()
        if not conn: return {}
        
        try:
            cursor = conn.cursor(dictionary=True)
            # Group by Event, determine overall status
            # If ANY item is Issued, we treat the batch as 'Issued' (Green) or maybe mixed?
            # For simplicity: If count(Reserved) > 0 -> Reserved (Needs Action). Else Issued.
            query = """
                SELECT 
                    event_id,
                    SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved_count,
                    SUM(CASE WHEN status = 'Issued' THEN 1 ELSE 0 END) as issued_count,
                    COUNT(*) as total
                FROM event_asset_reservations
                GROUP BY event_id
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            
            calendar_data = {}
            for row in rows:
                status = 'Issued'
                if row['reserved_count'] > 0:
                    status = 'Reserved' # Still has items to issue
                
                calendar_data[row['event_id']] = {
                    'status': status,
                    'count': row['total'],
                    'reserved': row['reserved_count'],
                    'issued': row['issued_count']
                }
                
            return calendar_data
            
        except Error as e:
            logger.error(f"Error fetching calendar data: {e}")
            return {}
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def reserve_event_items(self, event_id, title, items):
        """
        Reserve items for an event - saves to event_asset_reservations table
        items: [{ 'name': 'Chair', 'qty': 10 }, ...]
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            reserved_count = 0
            
            for item in items:
                item_name = item.get('name')
                qty_needed = item.get('qty', 0)
                
                if qty_needed <= 0:
                    continue
                
                # Get available assets for this item
                cursor.execute("""
                    SELECT a.asset_id
                    FROM bcp_sms4_asset a
                    JOIN bcp_sms4_items i ON a.item_id = i.item_id
                    WHERE i.item_name = %s 
                    AND a.status = 'In-Storage'
                    LIMIT %s
                """, (item_name, qty_needed))
                
                available_assets = cursor.fetchall()
                
                # Reserve each available asset
                for asset in available_assets:
                    cursor.execute("""
                        INSERT INTO event_asset_reservations 
                        (event_id, asset_id, status, reserved_at)
                        VALUES (%s, %s, 'Reserved', NOW())
                    """, (event_id, asset['asset_id']))
                    reserved_count += 1
            
            conn.commit()
            
            if reserved_count > 0:
                return True, f"Successfully reserved {reserved_count} items for {title}"
            else:
                return False, "No items were available to reserve"
                
        except Error as e:
            logger.error(f"Error reserving items: {e}")
            if conn:
                conn.rollback()
            return False, f"Database error: {str(e)}"
        finally:
            if conn and conn.is_connected():
                cursor.close()
                conn.close()

    def get_event_manifest(self, event_id):
        """
        Fetch detailed manifest of items for an event.
        """
        conn = self.get_connection()
        if not conn: return []
        
        try:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT 
                    i.item_name,
                    i.category,
                    a.property_tag,
                    r.status
                FROM event_asset_reservations r
                JOIN bcp_sms4_asset a ON r.asset_id = a.asset_id
                JOIN bcp_sms4_items i ON a.item_id = i.item_id
                WHERE r.event_id = %s
                ORDER BY i.item_name, a.property_tag
            """
            cursor.execute(query, (event_id,))
            return cursor.fetchall()
            
        except Error as e:
            logger.error(f"Error fetching event manifest: {e}")
            return []
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def reserve_event_items(self, user_id, event_id, event_name, required_items):
        """
        RESERVATION (Step 1):
        1. Access Legacy DB: Find 'In-Storage' items.
        2. Locking: Mark them 'In-Use' (Assigned to User/Event) to prevent theft.
        3. Tracking: Insert into 'event_asset_reservations' as 'Reserved'.
        """
        conn = self.get_connection()
        if not conn:
            return False, "Database connection failed"
            
        try:
            cursor = conn.cursor(dictionary=True)
            conn.start_transaction()
            
            reserved_log = []
            
            for req in required_items:
                item_name = req['name']
                qty_needed = int(req['qty'])
                
                # Check Item
                cursor.execute("SELECT item_id FROM bcp_sms4_items WHERE item_name = %s LIMIT 1", (item_name,))
                item_res = cursor.fetchone()
                if not item_res: continue
                item_id = item_res['item_id']
                
                # Find Checked-in Assets that are NOT reserved
                cursor.execute("""
                    SELECT a.asset_id, a.property_tag 
                    FROM bcp_sms4_asset a
                    LEFT JOIN event_asset_reservations r ON a.asset_id = r.asset_id AND r.status = 'Reserved'
                    WHERE a.item_id = %s AND a.status = 'In-Storage' AND r.asset_id IS NULL
                    LIMIT %s
                """, (item_id, qty_needed))
                available = cursor.fetchall()
                
                # ALLOW PARTIAL RESERVATIONS
                # Instead of rollback, we reserve what we can
                reserved_count = 0
                
                for asset in available:
                    # 1. DO NOT UPDATE LEGACY DB YET (Keep 'In-Storage' until Issuance)
                    # We rely on event_asset_reservations to Lock it.
                    
                    # 2. TRACK in New DB (Mark as Reserved)
                    cursor.execute("""
                        INSERT INTO event_asset_reservations (event_id, asset_id, status)
                        VALUES (%s, %s, 'Reserved')
                    """, (event_id, asset['asset_id']))
                    
                    reserved_count += 1
                
                reserved_log.append({
                    'name': item_name,
                    'requested': qty_needed,
                    'reserved': reserved_count
                })

            conn.commit()
            return True, {"message": "Reservation successful", "details": reserved_log}

            
        except Error as e:
            conn.rollback()
            logger.error(f"Reservation Error: {e}")
            return False, str(e)
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def release_event_items(self, event_id):
        """
        Releases (deletes) all reservations for a specific event.
        Used when event is Rejected, Cancelled, or Completed (since this system is view-only for outcome).
        """
        conn = self.get_connection()
        if not conn: return False
        
        try:
            cursor = conn.cursor()
            query = "DELETE FROM event_asset_reservations WHERE event_id = %s"
            cursor.execute(query, (event_id,))
            conn.commit()
            return True
            
        except Error as e:
            logger.error(f"Error releasing items for event {event_id}: {e}")
            if conn: conn.rollback()
            return False
        finally:
            if conn and conn.is_connected():
                cursor.close()
                conn.close()

connector = PropertyCustodianConnector()
