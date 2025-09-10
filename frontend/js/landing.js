//frontend/js/landing.js
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

// Role Tab Switching
tabs.forEach(btn => {
  btn.onclick = () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRole = btn.dataset.role;
    renderAuthForm(authForms);
    attachFormHandler();
  }
});

// Switch Login/Register Mode
switchBtn.onclick = function() {
  mode = (mode === 'login') ? 'register' : 'login';
  switchBtn.textContent = mode === 'register' ? 'Back to Login' : 'Register';
  switchText.textContent = mode === 'register' ? 'Already have an account?' : 'New here?';
  renderAuthForm(authForms);
  attachFormHandler();
  formAlert.innerHTML = '';
};

// On load, show login form for company
renderAuthForm(authForms);
attachFormHandler();

// Auth form submit handler (for both login and register)
function attachFormHandler() {
  const form = document.getElementById('authForm');
  if (!form) return;

  form.onsubmit = async function(e) {
    e.preventDefault();
    formAlert.className = '';
    formAlert.innerHTML = 'Processing...';

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
        
        // FIXED: Updated redirect paths for Vercel deployment
        if (currentRole === "company") {
          location.href = "/company/company-dashboard.html";
        } else if (currentRole === "student") {
          location.href = "/student/student-dashboard.html";
        } else if (currentRole === "faculty") {
          location.href = "/faculty/faculty-dashboard.html";
        }
      } else {
        formAlert.className = 'success';
        formAlert.innerHTML = "Registration successful. Please login!";
        mode = "login";
        switchBtn.textContent = "Register";
        switchText.textContent = "New here?";
        renderAuthForm(authForms);
        attachFormHandler();
      }
    } catch (err) {
      formAlert.className = 'error';
      formAlert.innerHTML = err.message;
    }
  };
}

// Modal for mobile
if (openModalBtn) {
  openModalBtn.onclick = function() {
    modalOverlay.style.display = 'block';
    // Render form in modal as well
    const modalForm = modalOverlay.querySelector('.modal-form-container');
    renderAuthForm(modalForm);
    attachModalFormHandler(modalForm);
  };
}
if (closeModalBtn) closeModalBtn.onclick = () => (modalOverlay.style.display = "none");
function attachModalFormHandler(container) {
  const form = container.querySelector('#authForm');
  if (!form) return;
  form.onsubmit = attachFormHandler;
}