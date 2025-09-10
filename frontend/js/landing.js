const API_BASE_URL = "https://iwp-placement-portal-production.up.railway.app/api";

// UI state
let currentRole = 'company';
let mode = 'login';

// DOM Elements
const formAlert = document.getElementById('formAlert');
const tabs = document.querySelectorAll('.tab-btn');
const authForms = document.getElementById('authForms');
const switchBtn = document.getElementById('toggleModeBtn');
const switchText = document.getElementById('switchText');
const modalOverlay = document.getElementById('modalOverlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Mobile elements (will be created dynamically)
let hamburger = null;
let mobileNav = null;
let mobileNavOverlay = null;
let mobileCTABtn = null;

// Utility: Render the form for current role and mode
function renderAuthForm(container) {
  let html = `<form id="authForm" class="form-inner">`;
  if (mode === 'register') {
    if (currentRole === 'company') {
      html += `
        <label>Full Name*</label>
        <input required type="text" name="contactPerson" placeholder="Your Name">
        <label>Company Name*</label>
        <input required type="text" name="companyName" placeholder="Company Name">
        <label>Email*</label>
        <input required type="email" name="email" placeholder="Company Email">
        <label>Password*</label>
        <input required type="password" name="password" placeholder="Password">
      `;
    } else if (currentRole === 'student') {
      html += `
        <label>Full Name*</label>
        <input required type="text" name="fullName" placeholder="Your Name">
        <label>Email*</label>
        <input required type="email" name="email" placeholder="Student Email">
        <label>Password*</label>
        <input required type="password" name="password" placeholder="Password">
      `;
    } else if (currentRole === 'faculty') {
      html += `
        <label>Full Name*</label>
        <input required type="text" name="fullName" placeholder="Your Name">
        <label>Email*</label>
        <input required type="email" name="email" placeholder="Faculty Email">
        <label>Password*</label>
        <input required type="password" name="password" placeholder="Password">
      `;
    }
    html += `<button type="submit">Register</button></form>`;
  } else {
    html += `
      <label>Email</label>
      <input required type="email" name="email" placeholder="Email">
      <label>Password</label>
      <input required type="password" name="password" placeholder="Password">
      <button type="submit">Login</button>
    </form>`;
  }
  container.innerHTML = html;
}

// Utility: Render tabs in modal
function renderModalTabs(container) {
  const tabsHtml = `
    <div class="tabs">
      <button type="button" class="tab-btn ${currentRole === 'company' ? 'active' : ''}" data-role="company">Company</button>
      <button type="button" class="tab-btn ${currentRole === 'student' ? 'active' : ''}" data-role="student">Student</button>
      <button type="button" class="tab-btn ${currentRole === 'faculty' ? 'active' : ''}" data-role="faculty">Faculty</button>
    </div>
    <div id="modalAuthForms"></div>
    <div class="switch-mode">
      <span id="modalSwitchText">${mode === 'register' ? 'Already have an account?' : 'New here?'}</span>
      <button type="button" id="modalToggleModeBtn">${mode === 'register' ? 'Back to Login' : 'Register'}</button>
    </div>
    <div id="modalFormAlert"></div>
  `;
  container.innerHTML = tabsHtml;
}

// Role Tab Switching (Desktop)
tabs.forEach(btn => {
  btn.onclick = () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRole = btn.dataset.role;
    renderAuthForm(authForms);
    attachFormHandler();
  }
});

// Switch Login/Register Mode (Desktop)
if (switchBtn) {
  switchBtn.onclick = function() {
    mode = (mode === 'login') ? 'register' : 'login';
    switchBtn.textContent = mode === 'register' ? 'Back to Login' : 'Register';
    if (switchText) {
      switchText.textContent = mode === 'register' ? 'Already have an account?' : 'New here?';
    }
    renderAuthForm(authForms);
    attachFormHandler();
    if (formAlert) {
      formAlert.innerHTML = '';
    }
  };
}

// Auth form submit handler
function attachFormHandler(isModal = false) {
  const form = document.getElementById('authForm');
  if (!form) return;

  const alertElement = isModal ? 
    document.getElementById('modalFormAlert') || formAlert : 
    formAlert;

  form.onsubmit = async function(e) {
    e.preventDefault();
    if (alertElement) {
      alertElement.className = '';
      alertElement.innerHTML = 'Processing...';
    }

    let endpoint, payload = {};
    if (mode === 'login') {
      endpoint = `/auth/${currentRole}/login`;
      payload.email = form.email.value.trim();
      payload.password = form.password.value;
    } else {
      endpoint = `/auth/${currentRole}/register`;
      if (currentRole === 'company') {
        payload.companyName = form.companyName.value.trim();
        payload.contactPerson = form.contactPerson.value.trim();
        payload.email = form.email.value.trim();
        payload.password = form.password.value;
      } else {
        payload.fullName = form.fullName.value.trim();
        payload.email = form.email.value.trim();
        payload.password = form.password.value;
      }
    }

    try {
      const resp = await fetch(API_BASE_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.message || "Auth failed");
      }
      if (mode === 'login') {
        // Save token, role, user id
        localStorage.setItem("token", data.token);
        localStorage.setItem("userType", currentRole);
        localStorage.setItem("userId", data.user.id);
        
        // Redirect based on role
        if (currentRole === "company") {
          location.href = "/company/company-dashboard.html";
        } else if (currentRole === "student") {
          location.href = "/student/student-dashboard.html";
        } else if (currentRole === "faculty") {
          location.href = "/faculty/faculty-dashboard.html";
        }
      } else {
        if (alertElement) {
          alertElement.className = 'success';
          alertElement.innerHTML = "Registration successful. Please login!";
        }
        mode = "login";
        
        // Update UI for login mode
        updateModeUI(isModal);
      }
    } catch (err) {
      if (alertElement) {
        alertElement.className = 'error';
        alertElement.innerHTML = err.message;
      }
    }
  };
}

// Update UI when switching between login/register modes
function updateModeUI(isModal = false) {
  if (isModal) {
    const modalSwitchBtn = document.getElementById('modalToggleModeBtn');
    const modalSwitchText = document.getElementById('modalSwitchText');
    const modalAuthForms = document.getElementById('modalAuthForms');
    
    if (modalSwitchBtn) {
      modalSwitchBtn.textContent = mode === 'register' ? 'Back to Login' : 'Register';
    }
    if (modalSwitchText) {
      modalSwitchText.textContent = mode === 'register' ? 'Already have an account?' : 'New here?';
    }
    if (modalAuthForms) {
      renderAuthForm(modalAuthForms);
      attachFormHandler(true);
    }
  } else {
    if (switchBtn) {
      switchBtn.textContent = mode === 'register' ? 'Back to Login' : 'Register';
    }
    if (switchText) {
      switchText.textContent = mode === 'register' ? 'Already have an account?' : 'New here?';
    }
    if (authForms) {
      renderAuthForm(authForms);
      attachFormHandler(false);
    }
  }
}

// Initialize Mobile Navigation and Modal
function initializeMobileFeatures() {
  // Only initialize on mobile
  if (window.innerWidth > 480) return;
  
  // Create hamburger menu
  createHamburgerMenu();
  
  // Create mobile CTA button
  createMobileCTAButton();
  
  // Setup mobile modal
  setupMobileModal();
}

// Create hamburger menu
function createHamburgerMenu() {
  if (hamburger) return; // Already created
  
  const nav = document.querySelector('.top-nav');
  if (!nav) return;
  
  // Create hamburger button
  const hamburgerBtn = document.createElement('button');
  hamburgerBtn.className = 'hamburger-menu';
  hamburgerBtn.innerHTML = '<span></span><span></span><span></span>';
  
  // Create mobile nav overlay
  const overlay = document.createElement('div');
  overlay.className = 'mobile-nav-overlay';
  
  // Create mobile nav sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'mobile-nav';
  
  // Create navigation content for mobile
  const navContent = `
    <div class="mobile-nav-header">
      <div class="logo">
        <img src="/assets/logo.png" alt="Logo">
        <span class="logo-text">Placement Portal</span>
      </div>
    </div>
    <ul>
      <li><a href="#" onclick="openAuthModal('student')">Student Login</a></li>
      <li><a href="#" onclick="openAuthModal('faculty')">Faculty Login</a></li>
      <li><a href="#" onclick="openAuthModal('company')">Company Login</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  `;
  
  sidebar.innerHTML = navContent;
  
  nav.appendChild(hamburgerBtn);
  document.body.appendChild(overlay);
  document.body.appendChild(sidebar);
  
  // Set up references
  hamburger = hamburgerBtn;
  mobileNav = sidebar;
  mobileNavOverlay = overlay;
  
  // Add event listeners
  hamburger.addEventListener('click', toggleMobileMenu);
  mobileNavOverlay.addEventListener('click', closeMobileMenu);
  
  // Close mobile menu when clicking nav links
  const mobileNavLinks = mobileNav.querySelectorAll('a');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

// Create mobile CTA button
function createMobileCTAButton() {
  if (mobileCTABtn) return; // Already created
  
  const infoLeft = document.querySelector('.info-left');
  if (!infoLeft) return;
  
  const ctaDiv = document.createElement('div');
  ctaDiv.className = 'mobile-cta';
  
  const ctaBtn = document.createElement('button');
  ctaBtn.className = 'mobile-cta-btn';
  ctaBtn.textContent = 'Get Started';
  
  ctaDiv.appendChild(ctaBtn);
  infoLeft.appendChild(ctaDiv);
  
  mobileCTABtn = ctaBtn;
  
  // Add event listener
  mobileCTABtn.addEventListener('click', function() {
    openAuthModal();
    closeMobileMenu();
  });
}

// Setup mobile modal
function setupMobileModal() {
  if (!modalOverlay) return;
  
  // Ensure modal has proper structure
  const modalCentered = modalOverlay.querySelector('.modal-centered');
  if (!modalCentered) return;
  
  // Add close button if it doesn't exist
  if (!modalCentered.querySelector('.modal-close')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', closeAuthModal);
    modalCentered.appendChild(closeBtn);
  }
  
  // Add event listeners
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeAuthModal();
    }
  });
}

// Mobile menu functions
function toggleMobileMenu() {
  const isOpen = mobileNav?.classList.contains('active');
  
  if (isOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function openMobileMenu() {
  if (!hamburger || !mobileNav || !mobileNavOverlay) return;
  
  hamburger.classList.add('active');
  mobileNav.classList.add('active');
  mobileNavOverlay.classList.add('active');
  document.body.classList.add('mobile-menu-open');
}

function closeMobileMenu() {
  if (!hamburger || !mobileNav || !mobileNavOverlay) return;
  
  hamburger.classList.remove('active');
  mobileNav.classList.remove('active');
  mobileNavOverlay.classList.remove('active');
  document.body.classList.remove('mobile-menu-open');
}

// Modal functions
function openAuthModal(role = currentRole) {
  if (!modalOverlay) return;
  
  currentRole = role;
  
  const modalCentered = modalOverlay.querySelector('.modal-centered');
  if (!modalCentered) return;
  
  // Render tabs and form in modal
  renderModalTabs(modalCentered);
  
  // Render the auth form
  const modalAuthForms = document.getElementById('modalAuthForms');
  if (modalAuthForms) {
    renderAuthForm(modalAuthForms);
    attachFormHandler(true);
  }
  
  // Setup modal tab switching
  const modalTabs = modalCentered.querySelectorAll('.tab-btn');
  modalTabs.forEach(btn => {
    btn.onclick = () => {
      modalTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRole = btn.dataset.role;
      renderAuthForm(modalAuthForms);
      attachFormHandler(true);
    };
  });
  
  // Setup modal mode switching
  const modalToggleBtn = document.getElementById('modalToggleModeBtn');
  if (modalToggleBtn) {
    modalToggleBtn.onclick = function() {
      mode = (mode === 'login') ? 'register' : 'login';
      updateModeUI(true);
      const modalFormAlert = document.getElementById('modalFormAlert');
      if (modalFormAlert) {
        modalFormAlert.innerHTML = '';
      }
    };
  }
  
  // Show modal
  modalOverlay.classList.add('active');
  document.body.classList.add('mobile-menu-open');
}

function closeAuthModal() {
  if (!modalOverlay) return;
  
  modalOverlay.classList.remove('active');
  document.body.classList.remove('mobile-menu-open');
}

// Make openAuthModal globally available for inline onclick handlers
window.openAuthModal = openAuthModal;

// Desktop modal handlers (if they exist)
if (openModalBtn) {
  openModalBtn.onclick = function() {
    openAuthModal();
  };
}

if (closeModalBtn) {
  closeModalBtn.onclick = closeAuthModal;
}

// Window resize handler
window.addEventListener('resize', function() {
  if (window.innerWidth > 480) {
    closeMobileMenu();
    // Clean up mobile elements if needed
  } else if (window.innerWidth <= 480) {
    // Reinitialize mobile features if needed
    initializeMobileFeatures();
  }
});

// DOM Content Loaded - Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  // Initialize desktop form
  if (authForms) {
    renderAuthForm(authForms);
    attachFormHandler();
  }
  
  // Initialize mobile features
  initializeMobileFeatures();
});

// Initialize on load as well (in case DOMContentLoaded already fired)
if (document.readyState === 'loading') {
  // DOM is still loading
  document.addEventListener('DOMContentLoaded', function() {
    if (authForms) {
      renderAuthForm(authForms);
      attachFormHandler();
    }
    initializeMobileFeatures();
  });
} else {
  // DOM is already loaded
  if (authForms) {
    renderAuthForm(authForms);
    attachFormHandler();
  }
  initializeMobileFeatures();
}
