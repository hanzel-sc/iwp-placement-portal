//frontend/js/app.js
// Global variables
let currentUser = null;
const API_BASE_URL = "https://iwp-placement-portal-production.up.railway.app/api";

// Get the base path for the application
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/frontend/')) {
        return path.substring(0, path.indexOf('/frontend/')) + '/frontend/';
    }
    return '/';
}

// Authentication check - FIXED for Vercel
function checkAuth() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token || userType !== 'company') {
        // Use relative path for Vercel deployment
        const currentPath = window.location.pathname;
        const basePath = getBasePath();
        
        // Navigate to index.html relative to current location
        if (currentPath.includes('/company/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = basePath + 'index.html';
        }
        return false;
    }
   
    return true;
}

// Initialize auth check on page load
if (!window.location.pathname.includes('index.html')) {
    checkAuth();
}

// Logout function - FIXED for Vercel
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
    
    // Navigate to index.html
    window.location.href = '/index.html';
}

// API utility functions
async function makeAPICall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    };
    
    if (data) {
        config.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Show alert messages
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Load company profile for header
async function loadCompanyProfile() {
    try {
        const profile = await makeAPICall('/company/profile');
        const companyNameElement = document.getElementById('companyName');
        if (companyNameElement) {
            companyNameElement.textContent = profile.companyName || 'Company';
        }
        currentUser = profile;
    } catch (error) {
        console.error('Error loading company profile:', error);
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        const stats = await makeAPICall('/company/dashboard-stats');
        
        document.getElementById('totalJobs').textContent = stats.totalJobs || 0;
        document.getElementById('totalApplications').textContent = stats.totalApplications || 0;
        document.getElementById('totalHired').textContent = stats.totalHired || 0;
        
        // Load recent jobs
        const jobs = await makeAPICall('/company/jobs?limit=5');
        displayRecentJobs(jobs);
        
        // Load recent applications
        const applications = await makeAPICall('/company/applications?limit=5');
        displayRecentApplications(applications);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Error loading dashboard data', 'error');
    }
}

function displayRecentJobs(jobs) {
    const container = document.getElementById('recentJobs');
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p>No job postings yet. <a href="create-job.html">Create your first job posting</a></p>';
        return;
    }
    
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <h3 class="job-title">${job.jobTitle}</h3>
            <div class="job-meta">
                <span>📍 ${job.location}</span>
                <span>💼 ${job.jobType}</span>
                <span>📅 Posted: ${new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="job-description">${job.jobDescription.substring(0, 150)}...</p>
            <div class="job-actions">
                <span class="status-badge">${job.applicationsCount || 0} Applications</span>
            </div>
        </div>
    `).join('');
}

function displayRecentApplications(applications) {
    const container = document.getElementById('recentApplications');
    if (!applications || applications.length === 0) {
        container.innerHTML = '<p>No applications yet.</p>';
        return;
    }
    
    container.innerHTML = applications.map(app => `
        <div class="application-card">
            <div class="applicant-info">
                <div>
                    <div class="applicant-name">${app.studentName}</div>
                    <small>Applied for: ${app.jobTitle}</small>
                </div>
                <span class="application-status status-${app.status}">${app.status}</span>
            </div>
            <div class="job-actions">
                <button class="btn btn-outline" onclick="viewStudentDetails(${app.studentId})">View Details</button>
            </div>
        </div>
    `).join('');
}

// Profile functions - FIXED
async function loadProfileData() {
    try {
        const profile = await makeAPICall('/company/profile');
        
        // Updated field mapping to match the form structure
        const fieldMapping = {
            'companyName': 'companyNameInput', // Map to correct input ID
            'industry': 'industry',
            'website': 'website',
            'location': 'location',
            'companySize': 'companySize',
            'description': 'description',
            'contactPerson': 'contactPerson',
            'contactEmail': 'contactEmail',
            'contactPhone': 'contactPhone'
        };
        
        Object.entries(fieldMapping).forEach(([profileField, elementId]) => {
            const element = document.getElementById(elementId);
            if (element && profile[profileField]) {
                element.value = profile[profileField];
            }
        });
    } catch (error) {
        console.error('Error loading profile data:', error);
        showAlert('Error loading profile data', 'error');
    }
}

async function updateProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const profileData = {};
    
    // Convert FormData to regular object
    for (let [key, value] of formData.entries()) {
        profileData[key] = value;
    }
    
    console.log('Profile data being sent:', profileData); // Debug log
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loading');
    
    // Show loading state
    if (btnText && loader) {
        btnText.style.display = 'none';
        loader.style.display = 'inline-block';
    }
    submitBtn.disabled = true;
    
    try {
        await makeAPICall('/company/profile', 'PUT', profileData);
        showAlert('Profile updated successfully!', 'success');
        
        // Update company name in header if changed
        if (profileData.companyName) {
            const companyNameElement = document.getElementById('companyName');
            if (companyNameElement) {
                companyNameElement.textContent = profileData.companyName;
            }
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showAlert(error.message, 'error');
    } finally {
        // Hide loading state
        if (btnText && loader) {
            btnText.style.display = 'inline';
            loader.style.display = 'none';
        }
        submitBtn.disabled = false;
    }
}

// Job creation functions
async function createJob(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const jobData = {};
    
    for (let [key, value] of formData.entries()) {
        jobData[key] = value;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loading');
    
    if (btnText && loader) {
        btnText.style.display = 'none';
        loader.style.display = 'inline-block';
    }
    submitBtn.disabled = true;
    
    try {
        await makeAPICall('/jobs', 'POST', jobData);
        showAlert('Job posted successfully!', 'success');
        form.reset();
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
            window.location.href = 'company-dashboard.html';
        }, 2000);
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        if (btnText && loader) {
            btnText.style.display = 'inline';
            loader.style.display = 'none';
        }
        submitBtn.disabled = false;
    }
}

// Applications management
async function loadApplications(jobId = null) {
    try {
        const endpoint = jobId ? `/company/applications?jobId=${jobId}` : '/company/applications';
        const applications = await makeAPICall(endpoint);
        displayApplications(applications);
    } catch (error) {
        console.error('Error loading applications:', error);
        showAlert('Error loading applications', 'error');
    }
}

function displayApplications(applications) {
    const container = document.getElementById('applicationsContainer');
    
    if (!applications || applications.length === 0) {
        container.innerHTML = '<div class="card"><p>No applications found.</p></div>';
        return;
    }
    
    container.innerHTML = applications.map(app => `
        <div class="card">
            <div class="application-card">
                <div class="applicant-info">
                    <div>
                        <div class="applicant-name">${app.studentName}</div>
                        <small>📧 ${app.studentEmail} | 📱 ${app.studentPhone || 'Not provided'}</small>
                        <br><small>Applied for: <strong>${app.jobTitle}</strong></small>
                        <br><small>Applied on: ${new Date(app.appliedAt).toLocaleDateString()}</small>
                    </div>
                    <span class="application-status status-${app.status}">${app.status}</span>
                </div>
                <div class="job-actions">
                    <button class="btn btn-outline" onclick="viewStudentDetails(${app.studentId}, ${app.jobId})">
                        View Details
                    </button>
                    ${app.resumeUrl ? `<a href="${app.resumeUrl}" target="_blank" class="btn btn-outline">View Resume</a>` : ''}
                    ${app.status === 'pending' ? `
                        <button class="btn btn-success" onclick="updateApplicationStatus(${app.id}, 'hired')">
                            Hire
                        </button>
                        <button class="btn btn-danger" onclick="updateApplicationStatus(${app.id}, 'rejected')">
                            Reject
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function loadJobsForFilter() {
    try {
        const jobs = await makeAPICall('/company/jobs');
        const select = document.getElementById('jobFilter');
        
        select.innerHTML = '<option value="">All Jobs</option>';
        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.jobTitle;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading jobs for filter:', error);
    }
}

function filterApplications() {
    const jobId = document.getElementById('jobFilter').value;
    loadApplications(jobId || null);
}

async function updateApplicationStatus(applicationId, status) {
    try {
        await makeAPICall(`/applications/${applicationId}/status`, 'PUT', { status });
        showAlert(`Application ${status} successfully!`, 'success');
        loadApplications();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function viewStudentDetails(studentId, jobId = null) {
    try {
        const student = await makeAPICall(`/students/${studentId}`);
        
        const modalContent = document.getElementById('studentDetails');
        modalContent.innerHTML = `
            <h3>Student Details</h3>
            <div class="form-group">
                <strong>Name:</strong> ${student.firstName} ${student.lastName}
            </div>
            <div class="form-group">
                <strong>Email:</strong> ${student.email}
            </div>
            <div class="form-group">
                <strong>Phone:</strong> ${student.phone || 'Not provided'}
            </div>
            <div class="form-group">
                <strong>Course:</strong> ${student.course || 'Not specified'}
            </div>
            <div class="form-group">
                <strong>Year:</strong> ${student.year || 'Not specified'}
            </div>
            <div class="form-group">
                <strong>CGPA:</strong> ${student.cgpa || 'Not provided'}
            </div>
            <div class="form-group">
                <strong>Skills:</strong> ${student.skills || 'Not provided'}
            </div>
            ${student.resumeUrl ? `
                <div class="form-group">
                    <a href="${student.resumeUrl}" target="_blank" class="btn btn-primary">Download Resume</a>
                </div>
            ` : ''}
        `;
        
        document.getElementById('studentModal').style.display = 'block';
    } catch (error) {
        showAlert('Error loading student details', 'error');
    }
}

// Enhanced function to display recent jobs with full details
function displayRecentJobs(jobs) {
    const container = document.getElementById('recentJobs');
    
    console.log('Displaying jobs:', jobs); // Debug log
    
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No job postings yet</h3>
                <p>Start recruiting by creating your first job posting</p>
                <a href="create-job.html" class="btn btn-primary">Create Job Posting</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => {
        // Format salary display
        const salaryDisplay = job.salary ? 
            (job.salary.includes('-') ? `₹${job.salary}` : `₹${job.salary}`) : 
            'Salary not disclosed';
        
        // Format date
        const postedDate = job.createdAt ? 
            new Date(job.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'Date not available';
        
        // Format deadline
        const deadline = job.applicationDeadline ? 
            new Date(job.applicationDeadline).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'No deadline';
        
        // Check if deadline is approaching (within 7 days)
        const isDeadlineNear = job.applicationDeadline ? 
            (new Date(job.applicationDeadline) - new Date()) < (7 * 24 * 60 * 60 * 1000) : false;
        
        return `
            <div class="job-card detailed" id="job-card-${job.id}">
                <div class="job-header">
                    <div class="job-title-section">
                        <h3 class="job-title">${job.jobTitle || 'Untitled Job'}</h3>
                        <div class="job-department">${job.department || 'Department not specified'}</div>
                    </div>
                    <div class="job-status">
                        <span class="status-badge ${job.status || 'active'}">${job.status || 'active'}</span>
                        <span class="applications-count">${job.applicationsCount || 0} Applications</span>
                    </div>
                </div>
                
                <div class="job-meta-detailed">
                    <div class="meta-row">
                        <span class="meta-item">
                            <i>📍</i>
                            <strong>Location:</strong> ${job.location || 'Location not specified'}
                        </span>
                        <span class="meta-item">
                            <i>💼</i>
                            <strong>Type:</strong> ${job.jobType || 'Type not specified'}
                        </span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-item">
                            <i>💰</i>
                            <strong>Salary:</strong> ${salaryDisplay}
                        </span>
                        <span class="meta-item">
                            <i>🎓</i>
                            <strong>Experience:</strong> ${job.experience || 'Not specified'}
                        </span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-item">
                            <i>📅</i>
                            <strong>Posted:</strong> ${postedDate}
                        </span>
                        <span class="meta-item ${isDeadlineNear ? 'deadline-warning' : ''}">
                            <i>⏰</i>
                            <strong>Deadline:</strong> ${deadline}
                            ${isDeadlineNear ? '<span class="urgent-tag">Urgent</span>' : ''}
                        </span>
                    </div>
                </div>
                
                <div class="job-description-preview">
                    <strong>Job Description:</strong>
                    <p>${job.jobDescription ? 
                        (job.jobDescription.length > 200 ? 
                            job.jobDescription.substring(0, 200) + '...' : 
                            job.jobDescription) : 
                        'No description available'}</p>
                </div>
                
                ${job.skills ? `
                    <div class="job-skills">
                        <strong>Required Skills:</strong>
                        <div class="skills-tags">
                            ${job.skills.split(',').map(skill => 
                                `<span class="skill-tag">${skill.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${job.eligibility ? `
                    <div class="job-eligibility">
                        <strong>Eligibility:</strong>
                        <p>${job.eligibility.length > 150 ? 
                            job.eligibility.substring(0, 150) + '...' : 
                            job.eligibility}</p>
                    </div>
                ` : ''}
                
                <div class="job-actions">
                    <button class="btn btn-outline" onclick="viewJobDetails(${job.id})">
                        View Full Details
                    </button>
                    <button class="btn btn-outline" onclick="viewJobApplications(${job.id})">
                        View Applications (${job.applicationsCount || 0})
                    </button>
                    <button class="btn btn-secondary" onclick="editJob(${job.id})">
                        Edit Job
                    </button>
                    <button class="btn btn-danger" onclick="confirmDeleteJob(${job.id}, '${job.jobTitle?.replace(/'/g, "\\'")}', ${job.applicationsCount || 0})" title="Delete this job posting">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Function to view full job details (you can implement this)
function viewJobDetails(jobId) {
    // You can implement this to show a modal or navigate to a detailed view
    window.location.href = `job-details.html?id=${jobId}`;
}

// Function to view applications for a specific job
function viewJobApplications(jobId) {
    window.location.href = `view-applications.html?jobId=${jobId}`;
}

// Function to edit a job (you can implement this)
function editJob(jobId) {
    window.location.href = `edit-job.html?id=${jobId}`;
}

// Function to confirm job deletion
function confirmDeleteJob(jobId, jobTitle, applicationCount) {
    const message = applicationCount > 0 
        ? `Are you sure you want to delete "${jobTitle}"?\n\nThis job has ${applicationCount} application(s). The job will be marked as deleted but applications will be preserved.`
        : `Are you sure you want to delete "${jobTitle}"?\n\nThis action cannot be undone.`;
    
    if (confirm(message)) {
        deleteJob(jobId, jobTitle);
    }
}

// Function to delete a job
async function deleteJob(jobId, jobTitle) {
    try {
        // Show loading state (you can implement a loading indicator)
        const jobCard = document.getElementById(`job-card-${jobId}`);
        if (jobCard) {
            jobCard.style.opacity = '0.5';
            jobCard.style.pointerEvents = 'none';
        }

        console.log('Deleting job:', jobId, jobTitle);

        const response = await makeAPICall(`/company/jobs/${jobId}`, 'DELETE');
        
        console.log('Delete response:', response);

        // Show success message
        showAlert(`Job "${jobTitle}" has been deleted successfully!`, 'success');

        // Remove the job card from the UI with animation
        if (jobCard) {
            jobCard.style.transform = 'translateX(-100%)';
            jobCard.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                jobCard.remove();
                
                // Check if there are no more jobs and show empty state
                const remainingJobs = document.querySelectorAll('.job-card.detailed');
                if (remainingJobs.length === 0) {
                    document.getElementById('recentJobs').innerHTML = `
                        <div class="empty-state">
                            <h3>No job postings</h3>
                            <p>All jobs have been deleted or none exist yet</p>
                            <a href="create-job.html" class="btn btn-primary">Create Job Posting</a>
                        </div>
                    `;
                }
            }, 300);
        }

        // Refresh dashboard stats
        loadDashboardData();

    } catch (error) {
        console.error('Error deleting job:', error);
        
        // Restore the job card if there was an error
        const jobCard = document.getElementById(`job-card-${jobId}`);
        if (jobCard) {
            jobCard.style.opacity = '1';
            jobCard.style.pointerEvents = 'auto';
        }
        
        showAlert(`Failed to delete job: ${error.message}`, 'error');
    }
}

// Function for permanent deletion (optional - use with caution)
function confirmPermanentDeleteJob(jobId, jobTitle) {
    const message = `⚠️ PERMANENT DELETION ⚠️\n\nAre you absolutely sure you want to permanently delete "${jobTitle}"?\n\nThis will:\n- Completely remove the job from the database\n- Cannot be undone\n- Should only be used for jobs with no applications\n\nType "DELETE" to confirm:`;
    
    const confirmation = prompt(message);
    if (confirmation === 'DELETE') {
        permanentDeleteJob(jobId, jobTitle);
    }
}

// Function for permanent deletion
async function permanentDeleteJob(jobId, jobTitle) {
    try {
        const jobCard = document.getElementById(`job-card-${jobId}`);
        if (jobCard) {
            jobCard.style.opacity = '0.5';
            jobCard.style.pointerEvents = 'none';
        }

        await makeAPICall(`/company/jobs/${jobId}/permanent`, 'DELETE');
        
        showAlert(`Job "${jobTitle}" has been permanently deleted!`, 'success');
        
        // Remove from UI
        if (jobCard) {
            jobCard.remove();
        }
        
        // Refresh dashboard
        loadDashboardData();

    } catch (error) {
        console.error('Error permanently deleting job:', error);
        
        const jobCard = document.getElementById(`job-card-${jobId}`);
        if (jobCard) {
            jobCard.style.opacity = '1';
            jobCard.style.pointerEvents = 'auto';
        }
        
        showAlert(`Failed to permanently delete job: ${error.message}`, 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('studentModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
}