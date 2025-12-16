# School Event Management System - Rebuild

**Fresh rebuild with MySQL backend, Flask API, and extracted Admin Events Manager**

## 📋 Project Structure

```
rebuild/
├── app.py                      # Flask application factory
├── config.py                   # Configuration (Dev/Prod/Test)
├── requirements.txt            # Python dependencies
├── backend/
│   ├── __init__.py
│   ├── auth.py                # Authentication API + RBAC decorator
│   └── api_events.py          # Events CRUD operations
├── database/
│   ├── db.py                  # Database connection pool + utilities
│   └── schema.sql             # Fresh database schema (6 tables)
├── templates/
│   ├── login.html             # Login page with TailwindCSS
│   └── admin.html             # Admin dashboard with Events Manager
└── static/
    └── uploads/               # Event attachments (future)
```

## 🚀 Quick Start (5 Steps)

### 1. Install Python Dependencies
```powershell
cd C:\Users\ivyri\Documents\LMS\rebuild
pip install -r requirements.txt
```

### 2. Create MySQL Database
```powershell
# Start MySQL service (if not running)
net start MySQL80

# Create database and tables
mysql -u root -p
```

In MySQL prompt:
```sql
CREATE DATABASE IF NOT EXISTS school_event_manager;
USE school_event_manager;
SOURCE database/schema.sql;
EXIT;
```

### 3. Verify Database Setup
```powershell
mysql -u root -p -e "USE school_event_manager; SELECT username, role_name FROM users JOIN roles ON users.role_id = roles.role_id;"
```

Expected output:
```
+----------+-------------+
| username | role_name   |
+----------+-------------+
| admin    | Super Admin |
+----------+-------------+
```

### 4. Start Flask Server
```powershell
python app.py
```

Expected output:
```
 * Running on http://127.0.0.1:5000
 * Database initialized successfully
```

### 5. Test in Browser
1. Navigate to: **http://localhost:5000**
2. Login with demo credentials:
   - **Username:** `admin`
   - **Password:** `admin123`
3. You should see the Admin Dashboard with Events Manager

## ✅ Testing Checklist

### Authentication Flow
- [ ] Login page loads at http://localhost:5000
- [ ] Demo credentials displayed on login page
- [ ] Successful login redirects to /admin
- [ ] Invalid credentials show error message
- [ ] Logout button clears session
- [ ] Accessing /admin without login redirects to /

### Events CRUD Operations
- [ ] Create new event:
  - Click "Create Event" button
  - Fill form (Name, Type, Dates, Venue, Organizer, Budget)
  - Click "Save Event"
  - Event appears in table
- [ ] Edit existing event:
  - Click "Edit" button on any event
  - Modal shows pre-filled data
  - Modify fields, click "Update Event"
  - Table reflects changes
- [ ] Delete event:
  - Click "Delete" button
  - Confirm deletion
  - Event removed from table
- [ ] Filters work:
  - Status dropdown filters events
  - Type dropdown filters events
  - Search box filters by name/organizer
- [ ] Sorting works:
  - Sort by Date (ascending)
  - Sort by Name (alphabetical)
  - Sort by Budget (descending)

### Database Verification
```sql
-- Check events table
USE school_event_manager;
SELECT event_id, event_name, status, start_datetime FROM events WHERE deleted_at IS NULL;

-- Check status history
SELECT * FROM event_status_history ORDER BY changed_at DESC LIMIT 5;

-- Check budgets
SELECT * FROM budgets ORDER BY created_at DESC;
```

## 🗄️ Database Schema (MVP - 6 Tables)

1. **`roles`** - 5 predefined roles (Super Admin, Admin, Staff, Requestor, Participant)
2. **`users`** - User accounts with bcrypt passwords
3. **`events`** - Event records (Draft → Pending → Approved → Ongoing → Completed)
4. **`event_status_history`** - Audit trail for status changes
5. **`budgets`** - Budget tracking with AI prediction flags
6. **`ai_training_data`** - ML training dataset (for future AI features)

## 🔐 Default Credentials

| Username | Password  | Role        |
|----------|-----------|-------------|
| admin    | admin123  | Super Admin |

**⚠️ Change password after first login!**

## 🛠️ API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/session` - Check if authenticated
- `POST /api/auth/logout` - Clear session
- `POST /api/auth/change-password` - Update password

### Events (`/api/events`)
- `GET /api/events` - List all events (with filters)
- `GET /api/events/<id>` - Get single event
- `POST /api/events` - Create new event
- `PUT /api/events/<id>` - Update event
- `DELETE /api/events/<id>` - Soft delete event
- `GET /api/events/<id>/history` - Status change history

## 📁 Configuration

Edit `config.py` to change:
- **Database credentials** (default: localhost, root, no password)
- **Secret key** (default: dev_secret_key_change_in_production)
- **Session timeout** (default: 30 minutes)
- **CORS origins** (default: localhost:5000)

## 🐛 Troubleshooting

### "Can't connect to MySQL server"
```powershell
# Check MySQL service running
Get-Service MySQL80

# Start if stopped
net start MySQL80
```

### "Access denied for user 'root'@'localhost'"
Edit `config.py`:
```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'YOUR_MYSQL_PASSWORD',  # <-- Add your MySQL password
    'database': 'school_event_manager',
    'cursorclass': DictCursor
}
```

### "ModuleNotFoundError: No module named 'flask'"
```powershell
pip install -r requirements.txt
```

### "Session cookie not persisting"
- Check browser allows cookies
- Verify `SESSION_COOKIE_HTTPONLY = True` in config
- Clear browser cache/cookies
- Try incognito/private window

### Events not showing after creation
- Check browser console for fetch errors
- Verify MySQL database has event record:
  ```sql
  SELECT * FROM events ORDER BY created_at DESC LIMIT 1;
  ```
- Check Flask logs in terminal

## 📝 Next Steps (Days 2-10 from Roadmap)

- [ ] Add Equipment Management (CRUD for event equipment)
- [ ] Implement Venue Scheduling (calendar view, conflict detection)
- [ ] Build Participant Registration (QR code generation)
- [ ] Add AI Budget Prediction (ML model integration)
- [ ] Create Attendance Tracking (QR scanner)
- [ ] Implement Feedback System (post-event surveys)
- [ ] Add PDF Report Generation (event summaries)
- [ ] Multi-role dashboards (Staff, Requestor, Participant)

## 🔗 Documentation

- **System Requirements:** `../project_blueprint/01_SYSTEM_REQUIREMENTS_SPECIFICATION.md`
- **Database Design:** `../project_blueprint/02_DATABASE_SCHEMA_DESIGN.md`
- **Development Roadmap:** `../project_blueprint/03_DEVELOPMENT_ROADMAP.md`
- **UI/UX Wireframes:** `../project_blueprint/04_UI_UX_WIREFRAMES.md`

## 📞 Support

For questions about implementation, refer to the planning documents in `project_blueprint/` folder.

---

**Version:** 1.0.0-rebuild  
**Last Updated:** 2025-01-09  
**Status:** Day 1 Foundation Complete ✅
