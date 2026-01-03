-- Add account approval workflow columns
ALTER TABLE users 
ADD COLUMN account_status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending' AFTER is_active,
ADD COLUMN approved_by INT NULL AFTER account_status,
ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
ADD FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_account_status ON users(account_status);
