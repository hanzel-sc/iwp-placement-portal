// backend/routes/faculty.js
const express = require('express');
const db = require('../config/database'); // mysql2/promise pool expected
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all faculty routes
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!req.user || req.user.type !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Faculty access required' });
  }
  next();
});

/**
 * Dashboard stats
 * Note: job_postings.status uses ('active','inactive','deleted') in your schema.
 * We consider "pending validation" to be job postings whose company.status = 'pending'.
 */
// GET /api/faculty/dashboard-stats
// GET /api/faculty/dashboard-stats
// GET /api/faculty/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM students WHERE status = 'active') AS totalStudents,
        (SELECT COUNT(*) FROM companies WHERE status = 'approved') AS activeCompanies,
        (SELECT COUNT(*) FROM companies WHERE status = 'pending') AS pendingJobs,
        (SELECT COUNT(*) FROM applications) AS totalApplications
    `;
    const [rows] = await db.execute(sql);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching dashboard stats', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});


// GET /api/faculty/profile
// GET /api/faculty/profile
router.get('/profile', async (req, res) => {
  try {
    const [[faculty]] = await db.execute(
      `SELECT id, firstName, lastName, email, department, role 
       FROM faculty WHERE id = ?`,
      [req.user.id]
    );

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    res.json(faculty);
  } catch (error) {
    console.error('Error fetching faculty profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculty profile' });
  }
});



/**
 * GET /api/faculty/jobs
 * Returns job_postings joined with company info (companyId, companyName, companyStatus)
 * Optional query params:
 *  - status  => filter by jp.status (active/inactive/deleted)
 *  - companyStatus => filter by c.status (pending/approved/rejected/suspended)
 *  - q => search in jp.jobTitle or c.companyName
 */
// Replace existing /jobs handler with this corrected version
router.get('/jobs', async (req, res) => {
  try {
    const { status, companyStatus, q, page = 1, limit = 100 } = req.query;

    // Build WHERE clauses and params only for those filters
    const whereClauses = [];
    const params = [];

    if (status) {
      whereClauses.push('jp.status = ?');
      params.push(status);
    }
    if (companyStatus) {
      whereClauses.push('c.status = ?');
      params.push(companyStatus);
    }
    if (q) {
      whereClauses.push('(jp.jobTitle LIKE ? OR c.companyName LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Pagination: validate and coerce to integers
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    // IMPORTANT: do NOT use '?' placeholders for LIMIT/OFFSET here — append them directly
    const sql = `
      SELECT
        jp.id,
        jp.jobTitle,
        jp.department,
        jp.jobType,
        jp.location,
        jp.experience,
        jp.salary,
        jp.skills,
        jp.jobDescription,
        jp.eligibility,
        jp.applicationDeadline,
        jp.status AS jobStatus,
        jp.createdAt,
        c.id AS companyId,
        c.companyName,
        c.status AS companyStatus,
        IFNULL(a.applicationCount, 0) AS applicationCount
      FROM job_postings jp
      JOIN companies c ON jp.companyId = c.id
      LEFT JOIN (
        SELECT jobId, COUNT(*) AS applicationCount
        FROM applications
        GROUP BY jobId
      ) a ON a.jobId = jp.id
      ${whereSql}
      GROUP BY jp.id
      ORDER BY jp.createdAt DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    // Execute with only the WHERE params
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (error) {
    // helpful debug log for future issues
    console.error('GET /api/faculty/jobs error', error);
    // If available, include query + params in logs (avoid printing sensitive data in prod)
    res.status(500).json({ success: false, message: 'Failed to fetch jobs', error: error.message });
  }
});


/**
 * Approve a job posting (set job_postings.status = 'active')
 */
router.post('/jobs/:id/approve', async (req, res) => {
  try {
    const jobId = req.params.id;
    await db.execute('UPDATE job_postings SET status = ? WHERE id = ?', ['active', jobId]);
    res.json({ success: true, message: 'Job activated successfully' });
  } catch (error) {
    console.error('POST /api/faculty/jobs/:id/approve error', error);
    res.status(500).json({ success: false, message: 'Failed to approve job' });
  }
});

/**
 * Reject a job posting (set job_postings.status = 'inactive')
 * optional reason: will be used to insert a notification for the company
 */
router.post('/jobs/:id/reject', async (req, res) => {
  try {
    const jobId = req.params.id;
    const { reason } = req.body;

    await db.execute('UPDATE job_postings SET status = ? WHERE id = ?', ['inactive', jobId]);

    if (reason) {
      // Insert notification for company (targetRole='company', targetUserId left NULL)
      await db.execute(`
        INSERT INTO notifications (type, message, targetRole, targetUserId, jobId, applicationId, isRead, createdAt)
        SELECT 'application_update', ?, 'company', NULL, id, NULL, 0, NOW()
        FROM job_postings WHERE id = ?
      `, [`Job rejected: ${reason}`, jobId]);
    }

    res.json({ success: true, message: 'Job rejected successfully' });
  } catch (error) {
    console.error('POST /api/faculty/jobs/:id/reject error', error);
    res.status(500).json({ success: false, message: 'Failed to reject job' });
  }
});

/**
 * NOTIFICATION: notify students for a job (keeps your original route but safer)
 * body: { jobId, year, courses: [..], message }
 */
router.post('/notify-students', async (req, res) => {
  try {
    const { jobId, year, courses, message } = req.body;
    if (!jobId || !year || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ success: false, message: 'jobId, year and courses array required' });
    }

    // Find students
    const placeholders = courses.map(() => '?').join(',');
    const params = [year, ...courses];
    const [students] = await db.execute(`
      SELECT id FROM students WHERE year = ? AND course IN (${placeholders}) AND status = 'active'
    `, params);

    if (!students.length) {
      return res.json({ success: true, message: 'No students matched criteria' });
    }

    // Bulk insert notifications (type, message, targetRole, targetUserId, jobId, applicationId, isRead)
    const values = [];
    const insertParams = [];
    students.forEach(s => {
      values.push('(?, ?, ?, ?, ?, ?, ?)');
      insertParams.push('new_job', message || 'New job opportunity available', 'student', s.id, jobId, null, 0);
    });

    const insertSql = `
      INSERT INTO notifications (type, message, targetRole, targetUserId, jobId, applicationId, isRead)
      VALUES ${values.join(',')}
    `;
    await db.execute(insertSql, insertParams);

    res.json({ success: true, message: `Notified ${students.length} students` });
  } catch (error) {
    console.error('POST /api/faculty/notify-students error', error);
    res.status(500).json({ success: false, message: 'Failed to notify students' });
  }
});

/**
 * GET applications (same as before)
 */
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
    console.error('GET /api/faculty/applications error', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

/**
 * Students listing (same but robust)
 */
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
    console.error('GET /api/faculty/students error', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

/**
 * Student details
 */
router.get('/students/:id', async (req, res) => {
  try {
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
    console.error('GET /api/faculty/students/:id error', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student details' });
  }
});

module.exports = router;
