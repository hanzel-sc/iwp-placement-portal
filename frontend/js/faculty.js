// Simple global configuration
//const API_BASE = 'http://localhost:3000/api';

const API_BASE = "https://iwp-placement-portal-production.up.railway.app/api";
// Get the base path for the application
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/frontend/')) {
        return path.substring(0, path.indexOf('/frontend/')) + '/frontend/';
    }
    return '/';
}

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token || userType !== 'faculty') {
        const currentPath = window.location.pathname;
        const basePath = getBasePath();
        
        if (currentPath.includes('/faculty/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = basePath + 'index.html';
        }
        return false;
    }
    return true;
}

// ✅ FIXED: Add missing toggleSidebar function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    const body = document.body;
    
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
    
    if (overlay) {
        overlay.classList.toggle('active');
    }
    
    body.classList.toggle('sidebar-open');
    
    console.log('Sidebar toggled'); // Debug log
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
    window.location.href = '../index.html';
}

// ✅ FIXED: Safe API helper with proper error handling
async function api(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API Error');
        }
        
        return response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ✅ FIXED: Safe alert function
function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        padding: 15px 20px; border-radius: 5px; color: white;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(alert);
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 4000);
}

// ✅ FIXED: Safe element update helper
function updateElementSafely(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = value;
        return true;
    } else {
        console.warn(`Element not found: ${selector}`);
        return false;
    }
}

// ✅ FIXED: Dashboard loading with proper selectors
async function loadDashboard() {
    try {
        console.log('Loading dashboard...');
        
        // Load faculty profile
        const profile = await api('/faculty/profile');
        console.log('Profile loaded:', profile);
        
        // Update profile name safely
        updateElementSafely('.profile-name', profile.firstName || 'Faculty Member');
        
        // Load dashboard stats
        const stats = await api('/faculty/dashboard-stats');
        console.log('Stats loaded:', stats);
        
        // ✅ FIXED: Use correct selectors that match your HTML
        const statCards = document.querySelectorAll('.stat-card .stat-value');
        
        if (statCards.length >= 4) {
            statCards[0].textContent = stats.totalStudents || 0;
            statCards[1].textContent = stats.activeCompanies || 0;
            statCards[2].textContent = stats.pendingJobs || 0;
            statCards[3].textContent = stats.totalApplications || 0;
        } else {
            console.warn('Not all stat cards found. Expected 4, found:', statCards.length);
        }
        
        console.log('Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Failed to load dashboard: ' + error.message, 'error');
    }
}

// Simple navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Activate nav item
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Load page data
    loadPageData(pageId);
}

async function loadPageData(page) {
    try {
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'validate':
                await loadJobs();
                break;
            case 'notify':
                await loadNotifyData();
                break;
            case 'track':
                await loadApplications();
                break;
            case 'students':
                await loadStudents();
                break;
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Jobs management
let allJobs = [];

async function loadJobs() {
    try {
        const filter = document.getElementById('status-filter')?.value || '';
        allJobs = await api(`/faculty/jobs${filter ? `?status=${filter}` : ''}`);
        
        const tbody = document.getElementById('job-table-body');
        if (tbody) {
            tbody.innerHTML = allJobs.map(job => `
                <tr>
                    <td>
                        <div><strong>${job.companyName}</strong></div>
                        <div>${job.jobTitle}</div>
                    </td>
                    <td>
                        <div>₹${job.salary || 'Not specified'}</div>
                        <div>${job.location} • ${job.jobType}</div>
                    </td>
                    <td>${new Date(job.createdAt).toLocaleDateString()}</td>
                    <td><span class="badge ${job.status}">${job.status}</span></td>
                    <td>
                        ${job.status === 'pending' ? `
                            <button onclick="approveJob(${job.id})" class="btn btn-success">Approve</button>
                            <button onclick="rejectJob(${job.id})" class="btn btn-danger">Reject</button>
                        ` : `<span>${job.status}</span>`}
                    </td>
                </tr>
            `).join('');
        }
        
        updateJobStats();
    } catch (error) {
        console.error('Load jobs error:', error);
        showAlert('Failed to load jobs', 'error');
    }
}

async function approveJob(jobId) {
    try {
        await api(`/faculty/jobs/${jobId}/approve`, { method: 'POST' });
        showAlert('Job approved successfully');
        loadJobs();
    } catch (error) {
        showAlert('Failed to approve job', 'error');
    }
}

async function rejectJob(jobId) {
    try {
        const reason = prompt('Rejection reason (optional):');
        await api(`/faculty/jobs/${jobId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        showAlert('Job rejected successfully');
        loadJobs();
    } catch (error) {
        showAlert('Failed to reject job', 'error');
    }
}

function updateJobStats() {
    const pending = allJobs.filter(j => j.status === 'pending').length;
    const approved = allJobs.filter(j => j.status === 'approved').length;
    const rejected = allJobs.filter(j => j.status === 'rejected').length;
    
    const statsContainer = document.querySelector('.validation-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat"><span class="stat-number">${pending}</span><span class="stat-label">Pending</span></div>
            <div class="stat"><span class="stat-number">${approved}</span><span class="stat-label">Approved</span></div>
            <div class="stat"><span class="stat-number">${rejected}</span><span class="stat-label">Rejected</span></div>
        `;
    }
}

// Notifications
async function loadNotifyData() {
    try {
        const jobs = await api('/faculty/jobs?status=approved');
        const jobSelect = document.getElementById('job-select');
        
        if (jobSelect) {
            jobSelect.innerHTML = '<option value="">Select Job</option>' +
                jobs.map(job => `<option value="${job.id}">${job.companyName} - ${job.jobTitle}</option>`).join('');
        }
    } catch (error) {
        showAlert('Failed to load jobs for notification', 'error');
    }
}

// Applications tracking
async function loadApplications() {
    try {
        const applications = await api('/faculty/applications');
        const tbody = document.getElementById('applications-table-body');
        
        if (tbody) {
            tbody.innerHTML = applications.map(app => `
                <tr>
                    <td>${app.firstName} ${app.lastName}<br><small>${app.email}</small></td>
                    <td>${app.jobTitle}<br><small>${app.companyName}</small></td>
                    <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td><span class="badge ${app.status}">${app.status}</span></td>
                    <td>
                        <button onclick="viewStudent(${app.studentId})" class="btn">View Details</button>
                        ${app.resumeUrl ? `<a href="${app.resumeUrl}" target="_blank" class="btn">Resume</a>` : ''}
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        showAlert('Failed to load applications', 'error');
    }
}

// Students management
async function loadStudents() {
    try {
        const students = await api('/faculty/students');
        const tbody = document.getElementById('students-table-body');
        
        if (tbody) {
            tbody.innerHTML = students.map(student => `
                <tr>
                    <td>
                        ${student.firstName} ${student.lastName}<br>
                        <small>${student.email}</small>
                    </td>
                    <td>${student.course} - Year ${student.year}</td>
                    <td>${student.cgpa || 'N/A'}</td>
                    <td>${student.totalApplications || 0} applications</td>
                    <td>
                        <button onclick="viewStudent(${student.id})" class="btn">View Details</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        showAlert('Failed to load students', 'error');
    }
}

// View student details
async function viewStudent(studentId) {
    try {
        const data = await api(`/faculty/students/${studentId}`);
        
        alert(`Student: ${data.student.firstName} ${data.student.lastName}
Email: ${data.student.email}
CGPA: ${data.student.cgpa}
Applications: ${data.student.totalApplications}
Offers: ${data.student.totalOffers}`);
    } catch (error) {
        showAlert('Failed to load student details', 'error');
    }
}

// ✅ FIXED: Proper event listeners setup
function setupEventListeners() {
    // Navigation items
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(link.dataset.page);
        });
    });
    
    // Action cards
    document.querySelectorAll('.action-card[data-page]').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(card.dataset.page);
        });
    });
    
    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadJobs);
    }
    
    // Notify form
    const notifyForm = document.getElementById('notify-form');
    if (notifyForm) {
        notifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                jobId: formData.get('jobId'),
                year: formData.get('year'),
                courses: formData.getAll('courses'),
                message: formData.get('message')
            };
            
            try {
                const result = await api('/faculty/notify-students', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                showAlert(result.message);
                e.target.reset();
            } catch (error) {
                showAlert('Failed to send notification', 'error');
            }
        });
    }
    
    // Mobile overlay click
    const mobileOverlay = document.querySelector('.mobile-overlay');
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', toggleSidebar);
    }
    
    console.log('Event listeners setup complete');
}

// ✅ FIXED: Proper initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing faculty dashboard...');
    
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboard();
    
    // Initialize Lucide icons if available
    if (typeof lucide !== 'undefined') {
        try {
            lucide.createIcons();
            console.log('Lucide icons initialized');
        } catch (error) {
            console.warn('Failed to initialize Lucide icons:', error);
        }
    }
    
    console.log('Faculty dashboard initialized successfully');
});

// ✅ FIXED: Make functions globally available for inline handlers
window.toggleSidebar = toggleSidebar;
window.logout = logout;
window.approveJob = approveJob;
window.rejectJob = rejectJob;
window.viewStudent = viewStudent;
