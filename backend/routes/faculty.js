const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all faculty routes
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.type !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Faculty access required' });
  }
  next();
});

// GET /api/faculty/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM students WHERE status = 'active') AS totalStudents,
        (SELECT COUNT(*) FROM companies WHERE status = 'approved') AS activeCompanies,
        (SELECT COUNT(*) FROM job_postings WHERE status = 'pending') AS pendingJobs,
        (SELECT COUNT(*) FROM applications) AS totalApplications
    `);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// GET /api/faculty/jobs - All job postings with company info
router.get('/jobs', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT jp.*, c.companyName, c.contactPerson,
             COUNT(a.id) as applicationCount
      FROM job_postings jp 
      JOIN companies c ON jp.companyId = c.id
      LEFT JOIN applications a ON jp.id = a.jobId
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE jp.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY jp.id ORDER BY jp.createdAt DESC';
    
    const [jobs] = await db.execute(query, params);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
});

// POST /api/faculty/jobs/:id/approve
router.post('/jobs/:id/approve', async (req, res) => {
  try {
    await db.execute('UPDATE job_postings SET status = ? WHERE id = ?', ['approved', req.params.id]);
    res.json({ success: true, message: 'Job approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve job' });
  }
});

// POST /api/faculty/jobs/:id/reject
router.post('/jobs/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    await db.execute('UPDATE job_postings SET status = ? WHERE id = ?', ['rejected', req.params.id]);
    
    // Add notification for company
    if (reason) {
      await db.execute(`
        INSERT INTO notifications (type, message, targetRole, targetUserId, jobId, createdAt)
        SELECT 'application_update', ?, 'company', companyId, ?, NOW() 
        FROM job_postings WHERE id = ?
      `, [`Job rejected: ${reason}`, req.params.id, req.params.id]);
    }
    
    res.json({ success: true, message: 'Job rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject job' });
  }
});

// POST /api/faculty/notify-students
router.post('/notify-students', async (req, res) => {
  try {
    const { jobId, year, courses, message } = req.body;
    
    // Find students matching criteria
    const placeholders = courses.map(() => '?').join(',');
    const [students] = await db.execute(`
      SELECT id FROM students 
      WHERE year = ? AND course IN (${placeholders}) AND status = 'active'
    `, [year, ...courses]);

    if (students.length === 0) {
      return res.json({ success: true, message: 'No students found matching criteria' });
    }

    // Insert notifications for all matching students
    const values = students.map(() => '(?, ?, ?, ?, ?, NOW())').join(',');
    const params = students.flatMap(s => [
      'new_job', 
      message || 'New job opportunity available',
      'student', 
      s.id, 
      jobId
    ]);

    await db.execute(`
      INSERT INTO notifications (type, message, targetRole, targetUserId, jobId, createdAt)
      VALUES ${values}
    `, params);

    res.json({ success: true, message: `Notified ${students.length} students successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to notify students' });
  }
});

// GET /api/faculty/applications
router.get('/applications', async (req, res) => {
  try {
    const { jobId, status } = req.query;
    
    let query = `
      SELECT a.*, 
             s.firstName, s.lastName, s.email, s.phone, s.course, s.year, s.cgpa, s.resumeUrl,
             jp.jobTitle, jp.department, jp.location,
             c.companyName
      FROM applications a
      JOIN students s ON a.studentId = s.id
      JOIN job_postings jp ON a.jobId = jp.id
      JOIN companies c ON jp.companyId = c.id
      WHERE 1=1
    `;
    
    const params = [];
    if (jobId) {
      query += ' AND a.jobId = ?';
      params.push(jobId);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.appliedAt DESC';
    
    const [applications] = await db.execute(query, params);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

// GET /api/faculty/students
router.get('/students', async (req, res) => {
  try {
    const { year, course } = req.query;
    
    let query = `
      SELECT s.*,
             COUNT(a.id) as totalApplications,
             SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) as totalOffers
      FROM students s
      LEFT JOIN applications a ON s.id = a.studentId
      WHERE s.status = 'active'
    `;
    
    const params = [];
    if (year) {
      query += ' AND s.year = ?';
      params.push(year);
    }
    if (course) {
      query += ' AND s.course = ?';
      params.push(course);
    }
    
    query += ' GROUP BY s.id ORDER BY s.lastName, s.firstName LIMIT 100';
    
    const [students] = await db.execute(query, params);
    res.json(students);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

// GET /api/faculty/students/:id - Individual student details
router.get('/students/:id', async (req, res) => {
  try {
    // Get student info with stats
    const [[student]] = await db.execute(`
      SELECT s.*,
             COUNT(a.id) as totalApplications,
             SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) as totalOffers
      FROM students s
      LEFT JOIN applications a ON s.id = a.studentId
      WHERE s.id = ?
      GROUP BY s.id
    `, [req.params.id]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get student's applications
    const [applications] = await db.execute(`
      SELECT a.*, jp.jobTitle, jp.department, c.companyName
      FROM applications a
      JOIN job_postings jp ON a.jobId = jp.id
      JOIN companies c ON jp.companyId = c.id
      WHERE a.studentId = ?
      ORDER BY a.appliedAt DESC
    `, [req.params.id]);

    res.json({ success: true, student, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch student details' });
  }
});

module.exports = router;
