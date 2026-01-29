from flask import Blueprint, jsonify
from backend.auth import require_role
from backend.property_custodian_connector import connector
import logging

equipment_bp = Blueprint('equipment', __name__, url_prefix='/api/equipment')
logger = logging.getLogger(__name__)

@equipment_bp.route('', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Student Organization Officer'])
def get_catalog():
    """
    Get equipment catalog (Categories & Types) with quantities.
    Replaces the old static equipment table usage.
    """
    try:
        catalog = connector.get_catalog()
        return jsonify({
            'success': True,
            'data': catalog
        }), 200
    except Exception as e:
        logger.error(f"Equipment Catalog Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
