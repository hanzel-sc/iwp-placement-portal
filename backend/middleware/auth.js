//backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const JWT_SECRET = process.env.JWT_SECRET || 'christ_university_placement_secret_key_2024';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
       
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token required'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
       
        // Get user data from database
        let user = null;
       
        if (decoded.type === 'company') {
            const [companies] = await db.execute(
                'SELECT id, email, companyName, status FROM companies WHERE id = ?',
                [decoded.id]
            );
            user = companies[0];
           
            // TEMPORARILY COMMENT OUT STATUS CHECK - uncomment when approval process is implemented
            // if (user && user.status !== 'approved') {
            //     return res.status(403).json({
            //         success: false,
            //         message: 'Account not approved by placement cell'
            //     });
            // }
        } else if (decoded.type === 'student') {
            const [students] = await db.execute(
                'SELECT id, email, firstName, lastName FROM students WHERE id = ?',
                [decoded.id]
            );
            user = students[0];
        } else if (decoded.type === 'faculty') {
            const [faculty] = await db.execute(
                'SELECT id, email, firstName, lastName FROM faculty WHERE id = ?',
                [decoded.id]
            );
            user = faculty[0];
        }
       
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }
        
        // Attach user info to request
        req.user = {
            ...user,
            type: decoded.type
        };
       
        next();
       
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }
        
        res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

module.exports = authMiddleware;