const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get student details (protected route - for companies to view)
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
