//backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ---------- COMPANY ----------
router.post('/company/register', async (req, res) => {
  try {
    const { email, password, companyName, contactPerson } = req.body;
    if (!email || !password || !companyName || !contactPerson)
      return res.status(400).json({ success:false, message: "All fields required" });

    const [existing] = await db.execute('SELECT id FROM companies WHERE email=?', [email]);
    if (existing.length)
      return res.status(409).json({ success:false, message: "Company already registered." });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      `INSERT INTO companies (email, password, companyName, contactPerson, status, createdAt)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [email, hash, companyName, contactPerson]
    );
    const token = jwt.sign(
      { id: result.insertId, email, type: 'company', companyName },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.status(201).json({
      success:true,
      message: 'Company registered successfully.',
      token, user: {
        id: result.insertId, email, companyName, contactPerson, type: 'company'
      }
    });
  } catch (err) {
    console.error('Company registration error:', err);
    res.status(500).json({ success:false, message:"Registration failed" });
  }
});

router.post('/company/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, message:"Email and password required" });
    
    const [companies] = await db.execute(
      'SELECT * FROM companies WHERE email=?', [email]);
    
    // FIXED: Differentiate between user not found vs wrong password
    if (!companies.length) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    const company = companies[0];
    if (!(await bcrypt.compare(password, company.password))) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid password" 
      });
    }
    
    //if (company.status !== "approved")
    //  return res.status(403).json({ success:false, message:"Account not approved by placement cell." }); //we shall take care of approval process later.
    
    const token = jwt.sign(
      { id: company.id, email, type: "company", companyName: company.companyName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    await db.execute('UPDATE companies SET lastLoginAt=NOW() WHERE id=?', [company.id]);
    res.json({ success:true, message: 'Login successful', token, user: {
      id: company.id, email: company.email, companyName: company.companyName, type: 'company'
    }});
  } catch (err) {
    console.error('Company login error', err);
    res.status(500).json({ success:false, message:"Login failed" });
  }
});

// ---------- STUDENT ----------
router.post('/student/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName)
      return res.status(400).json({ success:false, message:"All fields required" });
    
    const [existing] = await db.execute('SELECT id FROM students WHERE email=?', [email]);
    if (existing.length)
      return res.status(409).json({ success:false, message:"Student already registered." });

    const hash = await bcrypt.hash(password, 12);
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || '';
    const [result] = await db.execute(
      `INSERT INTO students (email, password, firstName, lastName, createdAt)
       VALUES (?, ?, ?, ?, NOW())`, [email, hash, firstName, lastName]
    );
    res.status(201).json({ success:true, message:"Student registered. Please login." });
  } catch (err) {
    res.status(500).json({ success:false, message:"Registration failed" });
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, message:"Email and password required" });
    
    const [users] = await db.execute("SELECT * FROM students WHERE email=?", [email]);
    
    // FIXED: Differentiate between user not found vs wrong password
    if (!users.length) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    const user = users[0];
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid password" 
      });
    }
    
    const token = jwt.sign(
      { id: user.id, email, type: 'student' },
      JWT_SECRET, { expiresIn: '7d' }
    );
    await db.execute('UPDATE students SET lastLoginAt=NOW() WHERE id=?', [user.id]);
    res.json({ success:true, message: 'Login successful', token, user: {
      id: user.id, email: user.email, firstName:user.firstName, lastName:user.lastName, type:'student'
    }});
  } catch (err) {
    res.status(500).json({ success:false, message:"Login failed" });
  }
});

// ---------- FACULTY ----------
router.post('/faculty/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName)
      return res.status(400).json({ success:false, message:"All fields required" });
    
    const [existing] = await db.execute('SELECT id FROM faculty WHERE email=?', [email]);
    if (existing.length)
      return res.status(409).json({ success:false, message:"Faculty already registered." });
    
    const hash = await bcrypt.hash(password, 12);
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || '';
    const [result] = await db.execute(
      `INSERT INTO faculty (email, password, firstName, lastName, status, createdAt)
       VALUES (?, ?, ?, ?, 'active', NOW())`, [email, hash, firstName, lastName]
    );
    res.status(201).json({ success:true, message:"Faculty registered. Please login." });
  } catch (err) {
    res.status(500).json({ success:false, message:"Registration failed" });
  }
});

router.post('/faculty/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, message:"Email and password required" });
    
    const [users] = await db.execute("SELECT * FROM faculty WHERE email=?", [email]);
    
    // FIXED: Differentiate between user not found vs wrong password
    if (!users.length) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    const user = users[0];
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid password" 
      });
    }
    
    const token = jwt.sign(
      { id: user.id, email, type: 'faculty' },
      JWT_SECRET, { expiresIn: '7d' }
    );
    await db.execute('UPDATE faculty SET lastLoginAt=NOW() WHERE id=?', [user.id]);
    res.json({ success:true, message: 'Login successful', token, user: {
      id: user.id, email: user.email, firstName:user.firstName, lastName:user.lastName, type:'faculty'
    }});
  } catch (err) {
    res.status(500).json({ success:false, message:"Login failed" });
  }
});

module.exports = router;