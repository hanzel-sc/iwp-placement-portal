// frontend/js/student-app.js
const API_BASE_URL = 'http://localhost:3000/api';
//const API_BASE_URL = "https://iwp-placement-portal-production.up.railway.app/api"

// --- Common: Authentication & Logout ---
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
    
    if (!token || userType !== 'student') {
        // Use relative path for Vercel deployment
        const currentPath = window.location.pathname;
        const basePath = getBasePath();
        
        // Navigate to index.html relative to current location
        if (currentPath.includes('/student/')) {
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
    const basePath = getBasePath();
    window.location.href = basePath + 'index.html';
}

function showAlert(msg, type = 'success') {
  const alert = document.getElementById('alertContainer');
  if (!alert) return;
  alert.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { alert.innerHTML = ""; }, 4000);
}

// --- Profile: View, Update ---
async function loadStudentProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/students/profile`, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const profile = await res.json();
    const name = profile.firstName ? profile.firstName : 'Student';
    document.getElementById('studentName').innerText = name;
    const w = document.getElementById('studentWelcome');
    if(w) w.innerText = name;
    
    // Profile form data fill:
    if (document.getElementById('profileForm')) {
      Object.entries({
        firstName: profile.firstName, lastName: profile.lastName, email: profile.email,
        phone: profile.phone, course: profile.course, year: profile.year,
        cgpa: profile.cgpa, skills: profile.skills
      }).forEach(([k, v]) => {
        if(document.getElementById(k) && v) document.getElementById(k).value=v;
      });
      
      // Resume preview - FIX THE URL CONSTRUCTION
      if(profile.resumeUrl){
        // Convert API_BASE_URL from '/api' to base server URL
        const serverBaseUrl = API_BASE_URL.replace('/api', '');
        const fullResumeUrl = serverBaseUrl + profile.resumeUrl;
        
        document.getElementById('resumeLink').innerHTML = `<a href="${fullResumeUrl}" target="_blank" class="btn btn-outline">View Resume</a>`;
      }
    }
  } catch(e){console.error(e);}
}

// Enhanced profile update function with file size validation
// Enhanced profile update function with proper file size validation and messaging
async function updateProfile(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector("button[type=submit]");
  const loader = btn.querySelector('.loading'); 
  
  btn.disabled = true;
  if(loader) loader.style.display="inline-block";
  
  showAlert("Updating...", "success");
  
  try {
    let resumeUploadAttempted = false;
    let resumeUploadSuccessful = false;
    const resumeFile = fd.get('resume');
    
    if (resumeFile && resumeFile.size > 0) {
      const maxSizeMB = 2;
      const fileSizeMB = resumeFile.size / (1024 * 1024);
      
      if (fileSizeMB > maxSizeMB) {
        // Show immediate prompt for client-side validation
        const shouldContinue = confirm(
          `⚠️ FILE TOO LARGE!\n\n` +
          `Your file "${resumeFile.name}" is ${fileSizeMB.toFixed(2)}MB.\n` +
          `Maximum allowed size is ${maxSizeMB}MB.\n\n` +
          `Please choose a smaller file.\n\n` +
          `Click OK to select a different file, or Cancel to continue without uploading.`
        );
        
        if (shouldContinue) {
          // User wants to select a different file - stop the process
          document.getElementById('resume').focus();
          throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB exceeds ${maxSizeMB}MB limit. Please select a smaller file.`);
        } else {
          // User chose to continue without uploading resume
          fd.delete('resume');
          showAlert("⚠️ Profile will be updated without resume upload due to large file size.", "warning");
        }
      } else {
        // File size is acceptable - attempt upload
        resumeUploadAttempted = true;
        
        const up = new FormData(); 
        up.append("resume", resumeFile);
        
        const uploadResponse = await fetch(`${API_BASE_URL}/students/resume`, {
          method: "POST", 
          headers: { "Authorization": "Bearer " + localStorage.getItem("token") }, 
          body: up
        });
        
        const uploadRes = await uploadResponse.json();
        
        if (!uploadResponse.ok || !uploadRes.success) {
          // Handle server-side errors with prompts
          if (uploadRes.userPrompt) {
            const promptMessage = `${uploadRes.userPrompt.icon} ${uploadRes.userPrompt.title}\n\n${uploadRes.userPrompt.message}`;
            
            if (uploadRes.errorCode === 'FILE_TOO_LARGE') {
              alert(promptMessage + '\n\n💡 Suggestions:\n• ' + uploadRes.details.suggestions.join('\n• '));
            } else {
              alert(promptMessage);
            }
          }
          
          throw new Error(uploadRes.message || "Resume upload failed");
        }
        
        // Resume upload was successful
        resumeUploadSuccessful = true;
        
        // Show success message for resume upload
        if (uploadRes.userPrompt) {
          showAlert(`${uploadRes.userPrompt.icon} ${uploadRes.userPrompt.message}`, "success");
        } else {
          showAlert("📄 Resume uploaded successfully!", "success");
        }
      }
    }
    
    // Continue with profile update (other fields)
    const data = {};
    fd.forEach((v, k) => { 
      if (k !== "resume") data[k] = v;
    });
    
    const res = await fetch(`${API_BASE_URL}/students/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify(data)
    });
    
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.message || "Profile update failed");
    }
    
    // Show appropriate success message based on what was actually updated
    if (resumeUploadAttempted && resumeUploadSuccessful) {
      showAlert("✅ Profile and resume updated successfully!", "success");
    } else if (resumeUploadAttempted && !resumeUploadSuccessful) {
      showAlert("✅ Profile updated successfully! (Resume upload failed)", "warning");
    } else {
      showAlert("✅ Profile updated successfully!", "success");
    }
    
    // Reload profile to show updated information
    loadStudentProfile();
    
  } catch (err) {
    console.error('❌ Update error:', err);
    showAlert(`🚫 ${err.message}`, "error");
  } finally {
    btn.disabled = false; 
    if (loader) loader.style.display = "none";
  }
  
  return false;
}


// Enhanced profile loading with proper resume URL construction
async function loadStudentProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/students/profile`, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    
    if (!res.ok) {
      throw new Error('Failed to load profile');
    }
    
    const profile = await res.json();
    const name = profile.firstName ? profile.firstName : 'Student';
    
    document.getElementById('studentName').innerText = name;
    const w = document.getElementById('studentWelcome');
    if(w) w.innerText = name;
    
    // Profile form data fill
    if (document.getElementById('profileForm')) {
      Object.entries({
        firstName: profile.firstName, 
        lastName: profile.lastName, 
        email: profile.email,
        phone: profile.phone, 
        course: profile.course, 
        year: profile.year,
        cgpa: profile.cgpa, 
        skills: profile.skills
      }).forEach(([k, v]) => {
        if(document.getElementById(k) && v) {
          document.getElementById(k).value = v;
        }
      });
      
      // Enhanced resume preview with proper URL construction
      const resumeLinkEl = document.getElementById('resumeLink');
      if (profile.resumeUrl) {
        // Convert API_BASE_URL to server base URL
        const serverBaseUrl = API_BASE_URL.replace('/api', '');
        const fullResumeUrl = serverBaseUrl + profile.resumeUrl;
        
        resumeLinkEl.innerHTML = `
          <div style="margin-top: 0.5rem;">
            <a href="${fullResumeUrl}" target="_blank" class="btn btn-outline">
              📄 View Current Resume
            </a>
            
          </div>
        `;
      } else {
        resumeLinkEl.innerHTML = `
          <small style="color: #666;">No resume uploaded yet</small>
        `;
      }
    }
  } catch(e) {
    console.error('❌ Profile load error:', e);
    showAlert('Failed to load profile: ' + e.message, 'error');
  }
}


// --- Dashboard: Load Stats, Jobs, Applications ---
async function loadStudentDashboard() {
  try {
    // Load stats
    let stats = await fetch(`${API_BASE_URL}/students/dashboard-stats`, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    }).then(r=>r.json());
    document.getElementById('applicationsCount').innerText = stats.totalApplications || "0";
    document.getElementById('offersCount').innerText = stats.totalOffers || "0";
    document.getElementById('newJobsCount').innerText = stats.newJobs || "0";
    // Load jobs
    loadJobOpenings();
    // Load my applications
    loadMyApplications();
  } catch(e){console.error(e);}
}

async function loadJobOpenings() {
  const c = document.getElementById('jobsList');
  c.innerHTML = `<div class="loading"></div>`;
  try {
    const jobs = await fetch(`${API_BASE_URL}/jobs`).then(r=>r.json());
    if (!jobs.length) { c.innerHTML = `<p>No current job openings.</p>`; return;}
    c.innerHTML = jobs.map(job => `
      <div class="job-card">
        <div class="job-title">${job.jobTitle}</div>
        <div class="job-meta">
          <span>${job.companyName}</span>
          <span>📅 ${job.applicationDeadline}</span>
          <span>💼 ${job.jobType}</span>
          <span>📍 ${job.location}</span>
        </div>
        <p class="job-description">${job.jobDescription.substring(0,110)}...</p>
        <div class="job-actions">
          <button class="btn btn-outline" onclick="showJobModal(${job.id})">View</button>
          <button class="btn btn-primary" onclick="applyToJob(${job.id})">Apply</button>
        </div>
      </div>
    `).join('');
  } catch(e){c.innerHTML = `<p>Error loading jobs.</p>`;}
}


async function loadMyApplications(){
  const c = document.getElementById('applicationsList');
  try{
    const apps = await fetch(`${API_BASE_URL}/students/applications`, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    }).then(r=>r.json());
    if (!apps.length) { c.innerHTML = `<p>No applications yet.</p>`; return;}
    c.innerHTML = apps.map(app=>`
      <div class="application-card">
        <div class="applicant-info">
          <div>
            <div class="applicant-name">${app.jobTitle} @${app.companyName}</div>
            <small>Applied on: ${new Date(app.appliedAt).toLocaleDateString()}</small>
          </div>
          <span class="application-status status-${app.status}">${app.status}</span>
        </div>
      </div>
    `).join('');
  }catch(e){c.innerHTML = `<p>Error loading applications.</p>`;}
}

// --- Job Modal ---
// Fixed modal function with proper error handling
async function showJobModal(jobId) {
  const modal = document.getElementById('jobModal');
  const modalBody = document.getElementById('jobModalBody');
  
  if (!modal || !modalBody) {
    console.error('Modal elements not found');
    return;
  }
  
  // Show modal with loading
  modal.style.display = 'block';
  modalBody.innerHTML = '<div class="loading">Loading job details...</div>';
  
  try {
    console.log('Fetching job:', jobId); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      headers: { 
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status); // Debug log
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data); // Debug log
    
    // Handle both response formats: {job: {...}} or {...}
    const job = data.job || data;
    
    if (!job || !job.jobTitle) {
      throw new Error('Job data not found or invalid');
    }
    
    modalBody.innerHTML = `
      <h2>${job.jobTitle || 'Job Title'}</h2>
      <div class="job-meta mb-3">
        <p><strong>Company:</strong> ${job.companyName || 'N/A'}</p>
        <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
        <p><strong>Type:</strong> ${job.jobType || 'N/A'}</p>
        ${job.salary ? `<p><strong>Salary:</strong> ${job.salary}</p>` : ''}
      </div>
      
      <div class="mb-3">
        <strong>Job Description:</strong>
        <p>${job.jobDescription || 'No description available'}</p>
      </div>
      
      <div class="mb-3">
        <strong>Required Skills:</strong>
        <p>${job.skills || 'No skills specified'}</p>
      </div>
      
      <div class="mb-3">
        <strong>Eligibility:</strong>
        <p>${job.eligibility || 'No specific requirements'}</p>
      </div>
      
      <div class="mb-3">
        <strong>Application Deadline:</strong>
        <p>${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Not specified'}</p>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="applyToJob(${job.id}); closeJobModal();">
          Apply Now
        </button>
        <button class="btn btn-outline" onclick="closeJobModal();">
          Close
        </button>
      </div>
    `;
    
  } catch (error) {
    console.error('❌ Error loading job details:', error);
    modalBody.innerHTML = `
      <div class="error-message">
        <h3>Error Loading Job Details</h3>
        <p>${error.message}</p>
        <button class="btn btn-outline" onclick="closeJobModal();">Close</button>
      </div>
    `;
  }
}

// Improved close function
function closeJobModal() {
  const modal = document.getElementById('jobModal');
  if (modal) {
    modal.style.display = 'none';
  }
}



// --- Apply ---
async function applyToJob(jobId){
  try{
    let res = await fetch(`${API_BASE_URL}/students/apply/${jobId}`, {
      method:"POST",
      headers: { "Authorization": "Bearer " + localStorage.getItem("token"), "Content-Type":"application/json" }
    });
    let data = await res.json();
    if(!res.ok || !data.success) throw new Error(data.message || "Apply failed");
    showAlert("Applied successfully!", "success");
    loadMyApplications();
  }catch(e){showAlert(e.message,"error");}
}
