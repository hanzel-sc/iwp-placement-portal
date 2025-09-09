//backend/routes/jobs.js
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create job posting (protected route)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            jobTitle, department, jobType, location, experience,
            salary, skills, jobDescription, eligibility, applicationDeadline
        } = req.body;

        // Validation
        if (!jobTitle || !department || !jobType || !location || !jobDescription || !applicationDeadline) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are missing'
            });
        }

        // Insert job posting
        const [result] = await db.execute(
            `INSERT INTO job_postings (
                companyId, jobTitle, department, jobType, location, 
                experience, salary, skills, jobDescription, eligibility, 
                applicationDeadline, status, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
            [
                req.user.id, jobTitle, department, jobType, location,
                experience, salary, skills, jobDescription, eligibility,
                applicationDeadline
            ]
        );

        // Notify faculty about new job posting (insert notification)
        await db.execute(
            `INSERT INTO notifications (type, message, targetRole, jobId, createdAt) 
             VALUES ('new_job', ?, 'faculty', ?, NOW())`,
            [`New job posting: ${jobTitle} by ${req.user.companyName}`, result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Job posted successfully',
            jobId: result.insertId
        });

    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create job posting'
        });
    }
});

// Get all active job postings (public route for students/faculty)
router.get('/', async (req, res) => {
    try {
        const [jobs] = await db.execute(
            `SELECT j.*, c.companyName, c.industry, c.location as companyLocation,
                    COUNT(a.id) as applicationsCount
             FROM job_postings j
             JOIN companies c ON j.companyId = c.id
             LEFT JOIN applications a ON j.id = a.jobId
             WHERE j.status = 'active' AND j.applicationDeadline >= CURDATE()
             GROUP BY j.id
             ORDER BY j.createdAt DESC`
        );

        res.json(jobs);

    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch jobs'
        });
    }
});

// Get specific job posting
// Get company's job postings (no limit)
// Get company's job postings (with optional limit)
router.get('/jobs', authMiddleware, async (req, res) => {
    try {
        let limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
        if (isNaN(limit) || limit <= 0) {
            limit = 0; // no limit applied
        }

        console.log(`Fetching jobs for company: ${req.user.id} with limit: ${limit}`);

        let query = `
            SELECT * FROM job_postings
            WHERE companyId = ? AND status = 'active'
            ORDER BY createdAt DESC
        `;

        if (limit > 0) {
            query += ` LIMIT ${limit}`;  // ✅ directly inject integer
        }

        console.log('Executing job query:', query);

        const [jobs] = await db.execute(query, [req.user.id]);

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


// Update job posting (protected route)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        // Verify job belongs to company
        const [jobs] = await db.execute(
            'SELECT id FROM job_postings WHERE id = ? AND companyId = ?',
            [req.params.id, req.user.id]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or unauthorized'
            });
        }

        const {
            jobTitle, department, jobType, location, experience,
            salary, skills, jobDescription, eligibility, applicationDeadline
        } = req.body;

        await db.execute(
            `UPDATE job_postings SET 
                jobTitle = ?, department = ?, jobType = ?, location = ?,
                experience = ?, salary = ?, skills = ?, jobDescription = ?,
                eligibility = ?, applicationDeadline = ?, updatedAt = NOW()
             WHERE id = ?`,
            [
                jobTitle, department, jobType, location, experience,
                salary, skills, jobDescription, eligibility, applicationDeadline,
                req.params.id
            ]
        );

        res.json({
            success: true,
            message: 'Job updated successfully'
        });

    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update job'
        });
    }
});

// Delete job posting (protected route)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        // Verify job belongs to company
        const [jobs] = await db.execute(
            'SELECT id FROM job_postings WHERE id = ? AND companyId = ?',
            [req.params.id, req.user.id]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or unauthorized'
            });
        }

        // Soft delete - update status to 'deleted'
        await db.execute(
            'UPDATE job_postings SET status = "deleted", updatedAt = NOW() WHERE id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Job posting deleted successfully'
        });

    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete job'
        });
    }
});

module.exports = router;
