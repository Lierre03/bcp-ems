
USE school_event_management;

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0,
    status ENUM('Available', 'Maintenance', 'Retired') DEFAULT 'Available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create event_equipment table (linking table)
CREATE TABLE IF NOT EXISTS event_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    equipment_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status ENUM('Requested', 'Approved', 'Rejected', 'Returned') DEFAULT 'Requested',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insert initial data from the hardcoded list
INSERT INTO equipment (name, category, total_quantity) VALUES
('Projector', 'AV', 5),
('Sound System', 'AV', 3),
('Microphone', 'AV', 10),
('Whiteboard', 'Furniture', 20),
('Chairs (Stack of 50)', 'Furniture', 10),
('Tables (Round)', 'Furniture', 15),
('Laptop', 'IT', 8);
