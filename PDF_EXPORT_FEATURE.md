# Event PDF Export Feature

## 📄 Overview
Added professional PDF export functionality that generates event planning guidelines and checklists from event data.

## ✨ Features Implemented

### 1. Backend API Endpoint
**File**: `rebuild/backend/api_events.py`
- **Route**: `GET /api/events/<id>/export-pdf`
- **Access**: Super Admin, Admin, Staff, Requestor roles
- **Library**: ReportLab for PDF generation

### 2. PDF Content Structure

#### Header
- Event Planning Guideline title
- Comprehensive Checklist & Resource Guide subtitle

#### Event Information Section
- Event Name, Type, Date, Time
- Venue, Expected Attendees
- Status, Organizer, Contact
- Total Budget

#### Event Description
- Full event description text

#### Budget Breakdown Checklist ✅
- Checkbox for each budget category
- Category name
- Amount (PHP formatted for universal compatibility)
- Status field for tracking
- Total budget summary

#### Equipment & Resources Checklist ✅
- Checkbox for each equipment item
- Item name
- Quantity required
- Status field
- Notes field for additional comments

#### Event Timeline & Activity Checklist ✅
- Checkbox for each activity/phase
- Time scheduled
- Activity/Phase name
- Duration
- Status tracking field

#### Pre-Event Preparation Checklist ✅
- 10 standard preparation items:
  - Venue booking confirmed
  - All equipment reserved
  - Budget approved
  - Participants notified
  - Marketing materials prepared
  - Staff/volunteers briefed
  - Emergency contacts ready
  - Backup plans documented
  - Technical rehearsal completed
  - Final walkthrough done

#### Post-Event Checklist ✅
- 10 standard completion items:
  - Equipment returned
  - Venue cleaned/restored
  - Attendance recorded
  - Feedback collected
  - Documentation archived
  - Thank you notes sent
  - Expense report submitted
  - Lessons learned documented
  - Event report completed
  - System status updated

#### Footer
- Generation timestamp
- "School Event Management System" branding

### 3. Frontend Integration
**File**: `rebuild/static/js/AdminEventsManager.js`

#### Export Button
- Added to Actions column in events table
- Icon: 📄 PDF
- Color: Indigo theme
- Position: Between "Edit" and "History" buttons

#### Export Functionality
- Triggers PDF generation via API call
- Automatically downloads generated PDF
- Filename format: `Event_Guideline_{EventName}_{Date}.pdf`
- Error handling with user alerts

### 4. PDF Styling

#### Professional Design
- Letter size (8.5" x 11")
- 0.75" margins
- Blue color scheme (#1e40af)
- Clean typography (Helvetica)

#### Visual Elements
- Emoji icons for section headers (📋 📝 💰 🔧 ⏰ ✅ 📊)
- Color-coded tables with backgrounds
- Grid borders for checkbox sections
- Proper spacing and alignment

#### Table Formatting
- Budget: Light blue header (#e0e7ff)
- Equipment: Sky blue header (#dbeafe)
- Timeline: Amber header (#fef3c7)
- All with gray grid lines (#cbd5e1)

## 📦 Dependencies Added
**File**: `rebuild/requirements.txt`
```
reportlab
```

## 🎯 Use Cases

1. **Event Organizers**: Print comprehensive checklist for execution
2. **Department Heads**: Review event plans offline
3. **Approval Process**: Physical documentation for signatures
4. **Archive**: PDF records of historical events
5. **Stakeholders**: Share event details in standardized format

## 🔍 How to Use

### In the Admin Dashboard:
1. Navigate to Events Management
2. Find the event you want to export
3. Click the **📄 PDF** button in the Actions column
4. PDF automatically downloads to your device
5. Open and print for event planning reference

### Expected Output:
- Professional multi-page PDF document
- Formatted as an event guideline and checklist
- Includes all event details, budget, equipment, timeline
- Pre-event and post-event checklists
- Ready for printing and distribution

## 🧪 Testing

1. ✅ ReportLab installed successfully
2. ✅ Backend endpoint created
3. ✅ Frontend button added
4. ✅ Download functionality implemented
5. ⏳ Ready for manual testing via browser

## 📝 Example PDF Structure

```
═══════════════════════════════════════
    EVENT PLANNING GUIDELINE
    Comprehensive Checklist & Resource Guide
═══════════════════════════════════════

📋 EVENT INFORMATION
┌────────────────────────────────────┐
│ Event Name:    Christmas Party 2025│
│ Event Type:    Cultural            │
│ Date:          December 20, 2025   │
│ Time:          1:00 PM - 6:00 PM   │
│ Venue:         Plaza               │
│ Attendees:     500                 │
│ Budget:        ₱45,000.00          │
└────────────────────────────────────┘

💰 BUDGET BREAKDOWN CHECKLIST
┌───┬──────────────┬────────┬────────┐
│ ☐ │ Category     │ Amount │ Status │
├───┼──────────────┼────────┼────────┤
│ ☐ │ Equipment    │ ₱15,000│ _____  │
│ ☐ │ Decorations  │ ₱10,000│ _____  │
│ ☐ │ Catering     │ ₱20,000│ _____  │
└───┴──────────────┴────────┴────────┘

...and more sections
```

## 🎨 Professional Features

- **Checkboxes**: Physical checkmarks during event execution
- **Status Fields**: Track progress for each item
- **Notes Fields**: Document issues or special requirements
- **Timestamp**: Know when the guideline was generated
- **Complete Data**: All information from database in one document

## 🚀 Future Enhancements

Potential improvements:
- [ ] Add QR code linking back to event in system
- [ ] Include event photos/graphics
- [ ] Customizable templates by event type
- [ ] Digital signature fields for approvals
- [ ] Export to Word/Excel formats
- [ ] Batch export multiple events
- [ ] Email PDF directly to stakeholders
