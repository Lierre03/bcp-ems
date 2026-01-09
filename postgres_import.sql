
-- Table: roles
DROP TABLE IF EXISTS roles CASCADE;
CREATE TABLE roles (
    id SERIAL PRIMARY KEY SERIAL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    hierarchy_level INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, name, description, hierarchy_level, created_at) VALUES (1, 'Super Admin', 'Full system access, AI training, user management', 1, '2025-12-16 04:46:53');
INSERT INTO roles (id, name, description, hierarchy_level, created_at) VALUES (2, 'Admin', 'Event approval, budget oversight, analytics', 2, '2025-12-16 04:46:53');
INSERT INTO roles (id, name, description, hierarchy_level, created_at) VALUES (3, 'Staff', 'Venue/equipment management, conflict resolution', 3, '2025-12-16 04:46:53');
INSERT INTO roles (id, name, description, hierarchy_level, created_at) VALUES (4, 'Requestor', 'Event creation, expense logging', 4, '2025-12-16 04:46:53');
INSERT INTO roles (id, name, description, hierarchy_level, created_at) VALUES (5, 'Participant', 'Event registration, attendance, feedback', 5, '2025-12-16 04:46:53');


-- Table: users
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY SERIAL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

INSERT INTO users (id, username, email, password_hash, role_id, first_name, last_name, is_active, created_at, updated_at) VALUES (1, 'admin', 'admin@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqGOZPXlOq', 1, 'System', 'Administrator', 1, '2025-12-16 04:46:53', '2025-12-16 04:46:53');


-- Table: events
DROP TABLE IF EXISTS events CASCADE;
CREATE TABLE events (
    id SERIAL PRIMARY KEY SERIAL,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    expected_attendees INTEGER DEFAULT 0,
    max_attendees INTEGER,
    status TEXT DEFAULT 'Draft',
    venue TEXT,
    organizer TEXT,
    requestor_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (requestor_id) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (end_datetime > start_datetime)
);


-- Table: event_status_history
DROP TABLE IF EXISTS event_status_history CASCADE;
CREATE TABLE event_status_history (
    id SERIAL PRIMARY KEY SERIAL,
    event_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    reason TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
);


-- Table: budgets
DROP TABLE IF EXISTS budgets CASCADE;
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY SERIAL,
    event_id INTEGER NOT NULL,
    total_budget REAL DEFAULT 0.0,
    venue_cost REAL DEFAULT 0.0,
    equipment_cost REAL DEFAULT 0.0,
    catering_cost REAL DEFAULT 0.0,
    other_cost REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);


-- Table: ai_training_data
DROP TABLE IF EXISTS ai_training_data CASCADE;
CREATE TABLE ai_training_data (
    id SERIAL PRIMARY KEY SERIAL,
    event_type TEXT,
    venue_type TEXT,
    expected_attendees INTEGER,
    equipment_count INTEGER,
    total_budget REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

