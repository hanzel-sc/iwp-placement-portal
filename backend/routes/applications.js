const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Update application status (protected route - for companies)
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pending', 'hired', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Verify application belongs to company's job
        const [applications] = await db.execute(
            `SELECT a.id, a.studentId, j.jobTitle, j.companyId
             FROM applications a
             JOIN job_postings j ON a.jobId = j.id
             WHERE a.id = ? AND j.companyId = ?`,
            [req.params.id, req.user.id]
        );

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Application not found or unauthorized'
            });
        }

        const application = applications[0];

        // Update application status
        await db.execute(
            'UPDATE applications SET status = ?, updatedAt = NOW() WHERE id = ?',
            [status, req.params.id]
        );

        // Create notification for student
        const notificationMessage = status === 'hired' 
            ? `Congratulations! You have been hired for ${application.jobTitle}`
            : `Your application for ${application.jobTitle} has been ${status}`;

        await db.execute(
            `INSERT INTO notifications (type, message, targetRole, targetUserId, applicationId, createdAt)
             VALUES (?, ?, 'student', ?, ?, NOW())`,
            ['application_update', notificationMessage, application.studentId, req.params.id]
        );

        // If hired, notify faculty
        if (status === 'hired') {
            await db.execute(
                `INSERT INTO notifications (type, message, targetRole, applicationId, createdAt)
                 VALUES ('student_hired', ?, 'faculty', ?, NOW())`,
                [`Student hired for ${application.jobTitle}`, req.params.id]
            );
        }

        res.json({
            success: true,
            message: `Application ${status} successfully`
        });

    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update application status'
        });
    }
});

module.exports = router;
