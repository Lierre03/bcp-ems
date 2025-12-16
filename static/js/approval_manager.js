// Event approval actions component and handlers
class ApprovalActionsManager {
    constructor() {
        this.loadingDetails = false;
        this.fullEventData = null;
    }

    async fetchEventDetails(eventId) {
        this.loadingDetails = true;
        try {
            const res = await fetch(`/api/events/${eventId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                this.fullEventData = data.event;
            }
        } catch (err) {
            console.error('Failed to load event details:', err);
        } finally {
            this.loadingDetails = false;
        }
        return this.fullEventData;
    }

    async handleApproval(eventId, action) {
        try {
            const response = await fetch(`/api/events/${eventId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Approval failed' };
            }
        } catch (error) {
            console.error('Error:', error);
            return { success: false, error: 'An error occurred' };
        }
    }

    async handleRejection(eventId, reason, notes) {
        const message = notes ? `${reason}: ${notes}` : reason;
        
        try {
            const response = await fetch(`/api/events/${eventId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: message })
            });
            
            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Rejection failed' };
            }
        } catch (error) {
            console.error('Error:', error);
            return { success: false, error: 'An error occurred' };
        }
    }

    getAvailableActions(event, userRole) {
        const actions = [];
        const status = event.status;
        const isSuperAdmin = userRole === 'Super Admin';
        const isAdmin = userRole === 'Admin';
        const isStaffOnly = userRole === 'Staff';
        const isRequestorOnly = userRole === 'Requestor';
        
        if (isSuperAdmin) {
            if (status === 'Pending') actions.push({ action: 'review', label: 'Review & Approve', variant: 'success' });
            if (status === 'Under Review') actions.push({ action: 'approve', label: 'Approve Event', variant: 'success' });
            if (['Pending', 'Under Review', 'Approved', 'Ongoing'].includes(status)) {
                actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
            }
        } else {
            if (status === 'Pending' && isStaffOnly) {
                actions.push({ action: 'review', label: 'Approve & Forward', variant: 'primary' });
            }
            if (status === 'Approved' && isStaffOnly) {
                actions.push({ action: 'start', label: 'Start Event', variant: 'info' });
            }
            if (status === 'Ongoing' && isStaffOnly) {
                actions.push({ action: 'complete', label: 'Mark Complete', variant: 'success' });
            }
            if (status === 'Under Review' && isAdmin) {
                actions.push({ action: 'approve', label: 'Approve Event', variant: 'success' });
            }
            if (isStaffOnly && ['Pending', 'Under Review', 'Approved'].includes(status)) {
                actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
            }
            if (isAdmin && ['Under Review', 'Approved'].includes(status)) {
                actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
            }
        }
        return actions;
    }
}

export default ApprovalActionsManager;
