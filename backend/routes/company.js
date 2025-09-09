//backend/routes/company.js
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get company profile
router.get('/profile', async (req, res) => {
    try {
        const [companies] = await db.execute(
            `SELECT id, email, companyName, industry, website, location, 
                    companySize, description, contactPerson, contactEmail, 
                    contactPhone, status, createdAt, updatedAt 
             FROM companies WHERE id = ?`,
            [req.user.id]
        );

        if (companies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.json({
            success: true,
            ...companies[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update company profile
router.put('/profile', async (req, res) => {
    try {
        const {
            companyName, industry, website, location, companySize,
            description, contactPerson, contactEmail, contactPhone
        } = req.body;

        // Validation
        if (!companyName || !contactPerson) {
            return res.status(400).json({
                success: false,
                message: 'Company name and contact person are required'
            });
        }

        await db.execute(
            `UPDATE companies SET 
                companyName = ?, industry = ?, website = ?, location = ?,
                companySize = ?, description = ?, contactPerson = ?,
                contactEmail = ?, contactPhone = ?, updatedAt = NOW()
             WHERE id = ?`,
            [
                companyName, industry, website, location, companySize,
                description, contactPerson, contactEmail, contactPhone,
                req.user.id
            ]
        );

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

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
    try {
        // Get total jobs
        const [jobsCount] = await db.execute(
            'SELECT COUNT(*) as count FROM job_postings WHERE companyId = ? AND status = "active"',
            [req.user.id]
        );

        // Get total applications
        const [applicationsCount] = await db.execute(
            `SELECT COUNT(*) as count FROM applications a 
             JOIN job_postings j ON a.jobId = j.id 
             WHERE j.companyId = ?`,
            [req.user.id]
        );

        // Get total hired
        const [hiredCount] = await db.execute(
            `SELECT COUNT(*) as count FROM applications a 
             JOIN job_postings j ON a.jobId = j.id 
             WHERE j.companyId = ? AND a.status = 'hired'`,
            [req.user.id]
        );

        res.json({
            success: true,
            totalJobs: jobsCount[0].count,
            totalApplications: applicationsCount[0].count,
            totalHired: hiredCount[0].count
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

// Get company's job postings - FIXED VERSION
router.get('/jobs', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0; // parseInt base 10
        console.log('Fetching jobs for company:', req.user.id, 'with limit:', limit);

        // Base query
        let jobQuery = `
            SELECT * FROM job_postings 
            WHERE companyId = ? AND status = 'active' 
            ORDER BY createdAt DESC
        `;

        // Append LIMIT if applicable
        if (limit > 0) {
            jobQuery += ` LIMIT ${limit}`; // inject directly, NOT as a placeholder
        }

        console.log('Executing job query:', jobQuery);
        console.log('With params:', [req.user.id]);

        const [jobs] = await db.execute(jobQuery, [req.user.id]);

        console.log('Found', jobs.length, 'jobs');

        // Add application counts
        for (let job of jobs) {
            try {
                const [appCount] = await db.execute(
                    'SELECT COUNT(*) as count FROM applications WHERE jobId = ?',
                    [job.id]
                );
                job.applicationsCount = appCount[0].count;
            } catch (countError) {
                console.error('Error counting applications for job', job.id, ':', countError);
                job.applicationsCount = 0;
            }
        }

        console.log('Jobs with application counts:', jobs);
        res.json(jobs);

    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch jobs',
            error: error.message
        });
    }
});


// Get applications for company's jobs
router.get('/applications', async (req, res) => {
    try {
        const jobId = req.query.jobId;
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        
        let query = `
            SELECT a.*, j.jobTitle, j.department,
                   s.firstName, s.lastName, s.email as studentEmail, 
                   s.phone as studentPhone, s.resumeUrl,
                   CONCAT(s.firstName, ' ', s.lastName) as studentName
            FROM applications a
            JOIN job_postings j ON a.jobId = j.id
            JOIN students s ON a.studentId = s.id
            WHERE j.companyId = ?
        `;
        
        const params = [req.user.id];
        
        if (jobId) {
            query += ' AND a.jobId = ?';
            params.push(jobId);
        }
        
        query += ' ORDER BY a.appliedAt DESC';
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(limit);
        }

        const [applications] = await db.execute(query, params);

        res.json(applications);

    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications'
        });
    }
});

// Delete job posting - ADD THIS ROUTE to your company.js file
router.delete('/jobs/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        
        console.log('Attempting to delete job:', jobId, 'for company:', req.user.id);
        
        // First verify the job belongs to this company
        const [jobs] = await db.execute(
            'SELECT id, jobTitle FROM job_postings WHERE id = ? AND companyId = ?',
            [jobId, req.user.id]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or you do not have permission to delete this job'
            });
        }

        const jobTitle = jobs[0].jobTitle;

        // Check if there are any applications for this job
        const [applications] = await db.execute(
            'SELECT COUNT(*) as count FROM applications WHERE jobId = ?',
            [jobId]
        );

        const applicationCount = applications[0].count;

        // Soft delete - update status to 'deleted' instead of actually deleting
        // This preserves data integrity and allows for potential recovery
        await db.execute(
            'UPDATE job_postings SET status = "deleted", updatedAt = NOW() WHERE id = ?',
            [jobId]
        );

        console.log(`Job "${jobTitle}" (ID: ${jobId}) marked as deleted. Had ${applicationCount} applications.`);

        res.json({
            success: true,
            message: `Job "${jobTitle}" has been deleted successfully`,
            applicationCount: applicationCount
        });

    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete job posting',
            error: error.message
        });
    }
});

// Alternative hard delete route (use with caution)
router.delete('/jobs/:id/permanent', async (req, res) => {
    try {
        const jobId = req.params.id;
        
        console.log('Attempting to permanently delete job:', jobId, 'for company:', req.user.id);
        
        // First verify the job belongs to this company
        const [jobs] = await db.execute(
            'SELECT id, jobTitle FROM job_postings WHERE id = ? AND companyId = ?',
            [jobId, req.user.id]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or you do not have permission to delete this job'
            });
        }

        const jobTitle = jobs[0].jobTitle;

        // Check for applications - warn if there are any
        const [applications] = await db.execute(
            'SELECT COUNT(*) as count FROM applications WHERE jobId = ?',
            [jobId]
        );

        const applicationCount = applications[0].count;

        if (applicationCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot permanently delete job "${jobTitle}" because it has ${applicationCount} applications. Use soft delete instead.`,
                applicationCount: applicationCount
            });
        }

        // Hard delete - actually remove from database
        await db.execute('DELETE FROM job_postings WHERE id = ?', [jobId]);

        console.log(`Job "${jobTitle}" (ID: ${jobId}) permanently deleted.`);

        res.json({
            success: true,
            message: `Job "${jobTitle}" has been permanently deleted`
        });

    } catch (error) {
        console.error('Permanent delete job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to permanently delete job posting',
            error: error.message
        });
    }
});

module.exports = router;
