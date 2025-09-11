const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for resume uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 2 * 1024 * 1024, // 2MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        console.log('File filter check:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
        }
    }
});

// Get logged-in student's profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const [students] = await db.execute(
            `SELECT id, firstName, lastName, email, phone, course, year, 
                    cgpa, skills, resumeUrl, profileCompleted
             FROM students WHERE id = ?`,
            [userId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found'
            });
        }

        res.json(students[0]);

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update logged-in student's profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            firstName,
            lastName,
            phone,
            course,
            year,
            cgpa,
            skills
        } = req.body;

        const [result] = await db.execute(
            `UPDATE students SET firstName=?, lastName=?, phone=?, course=?, year=?, cgpa=?, skills=? WHERE id=?`,
            [firstName, lastName, phone, course, year, cgpa, skills, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profile update failed or no changes'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Resume upload endpoint
// Enhanced resume upload with detailed error responses
router.post('/resume', authMiddleware, (req, res) => {
    upload.single('resume')(req, res, async (err) => {
        try {
            // Handle Multer errors with detailed prompts
            if (err instanceof multer.MulterError) {
                console.error('🚫 Multer Error:', err);
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = 2;
                    const errorResponse = {
                        success: false,
                        message: `File size exceeds the ${maxSizeMB}MB limit`,
                        errorCode: 'FILE_TOO_LARGE',
                        details: {
                            maxSize: maxSizeMB,
                            maxSizeBytes: 2 * 1024 * 1024,
                            field: err.field,
                            suggestions: [
                                'Compress your PDF using online compression tools',
                                'Reduce image quality in your document',
                                'Remove unnecessary pages or content',
                                'Save the document in a more efficient format'
                            ]
                        },
                        userPrompt: {
                            title: 'File Too Large',
                            message: `Your resume file is larger than the ${maxSizeMB}MB limit. Please choose a smaller file or compress your current resume.`,
                            icon: '🚫'
                        }
                    };
                    
                    return res.status(400).json(errorResponse);
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'File upload error: ' + err.message,
                    errorCode: 'UPLOAD_ERROR',
                    userPrompt: {
                        title: 'Upload Error',
                        message: 'There was a problem uploading your file. Please try again.',
                        icon: '⚠️'
                    }
                });
            }
            
            // Handle file type errors
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                    errorCode: 'INVALID_FILE_TYPE',
                    userPrompt: {
                        title: 'Invalid File Type',
                        message: 'Please upload only PDF, DOC, or DOCX files.',
                        icon: '📄'
                    }
                });
            }

            // Rest of your existing upload logic...
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                    errorCode: 'NO_FILE',
                    userPrompt: {
                        title: 'No File Selected',
                        message: 'Please select a resume file to upload.',
                        icon: '📁'
                    }
                });
            }

            // Success case - file uploaded
            const userId = req.user.id;
            const resumeUrl = `/uploads/${req.file.filename}`;
            
            await db.execute(
                'UPDATE students SET resumeUrl = ? WHERE id = ?',
                [resumeUrl, userId]
            );

            res.json({
                success: true,
                message: 'Resume uploaded successfully!',
                resumeUrl: resumeUrl,
                fileName: req.file.originalname,
                fileSize: (req.file.size / 1024).toFixed(2) + ' KB',
                userPrompt: {
                    title: 'Upload Successful',
                    message: `Your resume "${req.file.originalname}" has been uploaded successfully!`,
                    icon: '✅'
                }
            });

        } catch (error) {
            console.error('Resume upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during file upload',
                errorCode: 'SERVER_ERROR',
                userPrompt: {
                    title: 'Server Error',
                    message: 'Something went wrong on our end. Please try again in a moment.',
                    
                }
            });
        }
    });
});

// Get dashboard stats
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get application count
        const [appCount] = await db.execute(
            'SELECT COUNT(*) as count FROM applications WHERE studentId = ?',
            [userId]
        );
        
        // Get offers count (assuming status = 'selected' or 'offered')
        const [offerCount] = await db.execute(
            'SELECT COUNT(*) as count FROM applications WHERE studentId = ? AND status IN ("selected", "offered")',
            [userId]
        );
        
        // Get new jobs count (jobs posted in last 7 days)
        const [jobCount] = await db.execute(
            'SELECT COUNT(*) as count FROM job_postings WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = "active"'
        );

        res.json({
            totalApplications: appCount[0].count,
            totalOffers: offerCount[0].count,
            newJobs: jobCount[0].count
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats'
        });
    }
});

// Get student's applications
router.get('/applications', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [applications] = await db.execute(
            `SELECT a.id, a.status, a.appliedAt, j.jobTitle, c.companyName 
             FROM applications a 
             JOIN job_postings j ON a.jobId = j.id 
             JOIN companies c ON j.companyId = c.id 
             WHERE a.studentId = ? 
             ORDER BY a.appliedAt DESC`,
            [userId]
        );

        res.json(applications);

    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications'
        });
    }
});



// Apply to a job
router.post('/apply/:jobId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const jobId = req.params.jobId;

        // Check if job exists and is active
        const [jobs] = await db.execute(
            'SELECT id, status FROM job_postings WHERE id = ? and status = "active" ',
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        

        // Check if already applied
        const [existing] = await db.execute(
            'SELECT id FROM applications WHERE studentId = ? AND jobId = ?',
            [userId, jobId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Already applied to this job'
            });
        }

        // Create application
        await db.execute(
            'INSERT INTO applications (studentId, jobId, status, appliedAt) VALUES (?, ?, "pending", NOW())',
            [userId, jobId]
        );

        res.json({
            success: true,
            message: 'Application submitted successfully'
        });

    } catch (error) {
        console.error('Apply job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit application'
        });
    }
});

// Get student details by ID (for companies to view)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [students] = await db.execute(
            `SELECT id, firstName, lastName, email, phone, course, year, 
                    cgpa, skills, resumeUrl, profileCompleted
             FROM students WHERE id = ?`,
            [req.params.id]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json(students[0]);

    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student details'
        });
    }
});

module.exports = router;