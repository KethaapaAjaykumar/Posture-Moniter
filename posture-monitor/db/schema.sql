-- ============================================
-- Posture Monitoring System - Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS posture_monitor;
USE posture_monitor;

-- Users table (shared for patients and physiotherapists)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,           -- BCrypt hashed
    role ENUM('PATIENT', 'PHYSIOTHERAPIST') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extended patient profile
CREATE TABLE patients (
    patient_id BIGINT PRIMARY KEY,
    age INT,
    gender ENUM('MALE', 'FEMALE', 'OTHER'),
    medical_condition VARCHAR(255),
    assigned_physio_id BIGINT,
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (assigned_physio_id) REFERENCES users(id)
);

-- Exercise sessions
CREATE TABLE posture_sessions (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    exercise_type VARCHAR(50) NOT NULL,        -- SITTING, STANDING, SQUAT, PLANK, etc.
    average_score FLOAT DEFAULT 0,
    duration INT DEFAULT 0,                    -- seconds
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id)
);

-- Individual posture data points captured during session
CREATE TABLE posture_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,                 -- epoch milliseconds
    posture_score FLOAT NOT NULL,
    feedback TEXT,                             -- JSON array of feedback messages
    joint_angles TEXT,                         -- JSON object of angles
    FOREIGN KEY (session_id) REFERENCES posture_sessions(session_id)
);

-- Demo seed data
INSERT INTO users (name, email, password, role) VALUES
('Demo Patient', 'patient@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lZaK', 'PATIENT'),
('Dr. Sharma', 'physio@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lZaK', 'PHYSIOTHERAPIST');

INSERT INTO patients (patient_id, age, gender, medical_condition, assigned_physio_id)
VALUES (1, 32, 'MALE', 'Lower back pain', 2);
