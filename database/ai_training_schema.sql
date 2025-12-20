-- ============================================================================
-- AI TRAINING DATABASE SCHEMA (REBUILT)
-- Simplified schema for a data-driven AI system.
-- ============================================================================

-- TABLE 1: AI_TRAINING_DATA
-- Stores validated, high-quality data from past events to be used for training.
CREATE TABLE IF NOT EXISTS `ai_training_data` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `event_name` VARCHAR(200) NOT NULL,
  `event_type` ENUM('Academic', 'Sports', 'Cultural', 'Workshop', 'Other') NOT NULL,
  `start_datetime` DATETIME NOT NULL,
  `end_datetime` DATETIME NOT NULL,
  `venue` VARCHAR(100) DEFAULT NULL,
  `organizer` VARCHAR(150) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `expected_attendees` INT NOT NULL,
  `actual_attendees` INT DEFAULT NULL,
  `total_budget` DECIMAL(10, 2) NOT NULL COMMENT 'The final, actual budget used',
  `equipment` JSON DEFAULT NULL,
  `activities` JSON DEFAULT NULL,
  `catering` JSON DEFAULT NULL,
  `additional_resources` JSON DEFAULT NULL,  
  `source` ENUM('Manual', 'Auto-Completed', 'Bulk-Import') DEFAULT 'Manual',
  `is_validated` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_is_validated` (`is_validated`)
) ENGINE=InnoDB;

-- TABLE 2: AI_MODEL_VERSIONS
-- Tracks trained models, their versions, and performance.
CREATE TABLE IF NOT EXISTS `ai_model_versions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `model_name` VARCHAR(50) NOT NULL COMMENT 'e.g., budget_predictor, resource_recommender',
  `version` VARCHAR(20) NOT NULL,
  `r2_score` DECIMAL(5, 4) DEFAULT NULL COMMENT 'R-squared score for regression models',
  `accuracy_score` DECIMAL(5, 4) DEFAULT NULL COMMENT 'Accuracy for classification models',
  `training_samples` INT DEFAULT 0,
  `file_path` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_model_version` (`model_name`, `version`),
  INDEX `idx_model_name` (`model_name`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB;

-- TABLE 3: AI_TRAINING_SESSIONS
-- Logs each training run for history and debugging.
CREATE TABLE IF NOT EXISTS `ai_training_sessions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `session_id` VARCHAR(50) UNIQUE NOT NULL,
  `model_name` VARCHAR(50) NOT NULL,
  `status` ENUM('running', 'completed', 'failed') DEFAULT 'running',
  `data_count` INT DEFAULT 0,
  `started_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `training_time_seconds` INT DEFAULT 0,
  `error_message` TEXT,
  INDEX `idx_status` (`status`),
  INDEX `idx_model_name` (`model_name`)
) ENGINE=InnoDB;

-- Insert a baseline version for the budget predictor.
-- This ensures the system has a model to use even before the first training.
INSERT INTO `ai_model_versions` (`model_name`, `version`, `r2_score`, `training_samples`, `file_path`, `is_active`) VALUES
('budget_predictor', '1.0.0-baseline', 0.7500, 20, 'models/budget_model_baseline.pkl', TRUE)
ON DUPLICATE KEY UPDATE `model_name` = `model_name`; -- Do nothing if it exists

COMMIT;
