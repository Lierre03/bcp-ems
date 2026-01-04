# Student Organization Officer Implementation

## Overview
Student organization officers are student leaders who can create and manage events on behalf of their organizations.

## Important Clarification

**"Requestor" is NOT a role!**

The term "requestor" appears in the `events` table as the column name `requestor_id`, which simply refers to **whoever created/requested the event** - regardless of their actual role.

- `events.requestor_id` → References the user who created the event
- Could be a Super Admin, Admin, Student Organization Officer, etc.

## Role Hierarchy

1. **Super Admin** (hierarchy 1) - Full system access
2. **Admin** (hierarchy 2) - Event approval, department management  
3. **Staff** (hierarchy 3) - Venue/equipment management
4. **Student Organization Officer** (hierarchy 4, role_id 6) - **Can create events**
5. **Participant** (hierarchy 5) - Can view, register, and attend events

## User Registration Workflow

### For Student Organization Officers:
1. **Student Self-Registration**: Student creates account via registration page
   - Initial role: `Participant`
   - Initial status: `Pending` (awaiting admin approval)
   - System sends email notification to admin

2. **Admin Approval**: Super Admin/Admin reviews and approves account
   - Changes `account_status` from `Pending` to `Approved`
   - Sets `is_active` to `1`
   - System sends **account activation email** to student

3. **Student Requests Upgrade**: Student contacts admin to request org officer role
   - Via email, in-person, or through organization documentation

4. **Admin Grants Role**: Super Admin upgrades role via User Management panel
   - Changes role from `Participant` to `Student Organization Officer`
   - System sends **role upgrade email** notification
   - Email includes list of new permissions and capabilities

5. **Student Creates Events**: Student can now create events
   - Events still require Admin/Staff approval
   - Events are associated with student's department/organization

## Database Implementation

### Roles Table
```sql
-- Role ID 6: Student Organization Officer
INSERT INTO roles (name, description, hierarchy_level) VALUES
('Student Organization Officer', 
 'Student organization leaders who can create and manage events for their organizations', 
 4);
```

### Checking User Role
```sql
-- Find all student organization officers
SELECT u.id, u.username, u.first_name, u.last_name, u.email, r.name as role_name
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'Student Organization Officer';
```

## Backend Implementation

### Email Notification Trigger
Location: `backend/api_users.py` - `update_user()` function

Conditions for sending role upgrade email:
1. Current role is `Participant`
2. New role is `Student Organization Officer`
3. Account status is `Approved`
4. User is active (`is_active = 1`)

```python
# Detect role upgrade
is_participant_to_org_officer = (
    current_user['current_role'] == 'Participant' and 
    role == 'Student Organization Officer' and
    current_user['account_status'] == 'Approved' and
    current_user['is_active']
)

# Send email if conditions met
if is_participant_to_org_officer:
    send_role_upgrade_email(user_email, name, role)
```

### Email Service
Location: `backend/email_service.py`

Function: `send_role_upgrade_email(to_email, name, new_role)`
- HTML template with gradient design
- Lists new permissions:
  - Create and submit event proposals
  - Manage event details and timelines
  - Track event budgets and expenses
  - View approval status and notifications
  - Register participants and track attendance

## Frontend Implementation

### User Management Component
Location: `static/js/components/UserManagement.js`

Available roles in dropdown:
- Super Admin
- Admin
- Staff
- Requestor
- **Student Organization Officer** (new role added)
- Participant

Role descriptions:
- **Student Organization Officer**: "Student org leaders can create and manage events for their organizations"
- **Requestor**: "Requestors can create and manage events (requires Admin approval)"
- **Participant**: "Participants can view, register, and attend events"

## Testing Workflow

### Test User 10
1. **Approve Account**:
   ```
   Navigate to: Admin Dashboard > Account Approvals
   Click "Approve" on user 10 (Test/ivyrivera1103@gmail.com)
   ✓ Account activation email sent
   ```

2. **Upgrade Role**:
   ```
   Navigate to: Admin Dashboard > User Management
   Edit user 10
   Change role: Participant → Student Organization Officer
   Save
   ✓ Role upgrade email sent
   ```

3. **Verify Email**:
   - Check inbox: ivyrivera1103@gmail.com
   - Should receive:
     - Account activation email (step 1)
     - Role upgrade email (step 2)

4. **Login as Student**:
   ```
   Username: Test
   Password: [user's password]
   ✓ Should now see "Create Event" options
   ```

## Who Can Create Events?

Anyone with the **Student Organization Officer** role can create events.

When they create an event:
- The `events.requestor_id` field stores their user ID
- "Requestor" is just a column name, not their role
- The event still requires Admin/Staff approval

Example:
```sql
-- User with Student Organization Officer role creates event
INSERT INTO events (name, requestor_id, ...) VALUES 
('Science Fair', 10, ...);
-- requestor_id = 10 (the user who created it)
-- User 10's actual role = 'Student Organization Officer'
```

## Important Notes

1. **"Requestor" is NOT a role** - It's the `events.requestor_id` column
2. **"Student Organization Officer" IS the role** - For people who can create events
3. **Different onboarding paths**:
   - Student Org Officers: Self-register → Approval → Role upgrade
4. **Email notifications only for Student Org Officers** - To welcome them to the role
5. **Events require approval** - All events created by Student Org Officers need Admin/Staff approval

## Email Configuration

Email service uses:
- SMTP: smtp.gmail.com:587
- From: events.campus.team@gmail.com
- TLS encryption enabled

Email templates match the account activation design for consistency.

## Files Modified

### Database:
- ✅ Added new role: `Student Organization Officer` (role_id 6)

### Backend:
- ✅ `backend/api_users.py` - Updated role upgrade detection
- ✅ `backend/email_service.py` - Role upgrade email template

### Frontend:
- ✅ `static/js/components/UserManagement.js` - Added new role to dropdown and descriptions

### Documentation:
- ✅ This file - Complete implementation guide
