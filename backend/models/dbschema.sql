-- Christ University Placement Portal Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS christ_placement_portal;
USE christ_placement_portal;

-- Companies table
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    companyName VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    website VARCHAR(255),
    location VARCHAR(255),
    companySize ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
    description TEXT,
    contactPerson VARCHAR(255) NOT NULL,
    contactEmail VARCHAR(255),
    contactPhone VARCHAR(20),
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLoginAt TIMESTAMP NULL
);

-- Students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    course VARCHAR(255),
    year ENUM('1', '2', '3', '4', 'PG1', 'PG2'),
    cgpa DECIMAL(3,2),
    skills TEXT,
    resumeUrl VARCHAR(500),
    profileCompleted BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLoginAt TIMESTAMP NULL
);

-- Faculty table
CREATE TABLE faculty (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    phone VARCHAR(20),
    role ENUM('admin', 'coordinator', 'faculty') DEFAULT 'faculty',
    status ENUM('active', 'inactive') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLoginAt TIMESTAMP NULL
);

-- Job postings table
CREATE TABLE job_postings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    companyId INT NOT NULL,
    jobTitle VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    jobType ENUM('Full-time', 'Part-time', 'Internship', 'Contract') NOT NULL,
    location VARCHAR(255) NOT NULL,
    experience VARCHAR(100),
    salary VARCHAR(100),
    skills TEXT NOT NULL,
    jobDescription TEXT NOT NULL,
    eligibility TEXT,
    applicationDeadline DATE NOT NULL,
    status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- Applications table
CREATE TABLE applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    studentId INT NOT NULL,
    jobId INT NOT NULL,
    status ENUM('pending', 'hired', 'rejected') DEFAULT 'pending',
    appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (jobId) REFERENCES job_postings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application (studentId, jobId)
);

-- Notifications table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('new_job', 'application_update', 'student_hired', 'general') NOT NULL,
    message TEXT NOT NULL,
    targetRole ENUM('student', 'faculty', 'company', 'all') NOT NULL,
    targetUserId INT NULL,
    jobId INT NULL,
    applicationId INT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jobId) REFERENCES job_postings(id) ON DELETE CASCADE,
    FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_companies_email ON companies(email);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_course_year ON students(course, year);
CREATE INDEX idx_faculty_email ON faculty(email);
CREATE INDEX idx_job_postings_company ON job_postings(companyId);
CREATE INDEX idx_job_postings_status_deadline ON job_postings(status, applicationDeadline);
CREATE INDEX idx_applications_student_job ON applications(studentId, jobId);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_notifications_target ON notifications(targetRole, targetUserId);
