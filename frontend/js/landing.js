//js/landing.js
//const API_BASE_URL = 'http://localhost:3000/api';

const API_BASE_URL = "https://iwp-placement-portal-production.up.railway.app/api"

(function() {
    if (!sessionStorage.getItem('authorized')) {
        const isVercel = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        
        if (isVercel) {
            // On Vercel, redirect to root (splash screen)
            window.location.href = '/';
        } else {
            // Local development, redirect to splash.html
            window.location.href = 'auth.html';
        }
    }
})();
// State
let currentRole = 'student';
let currentMode = 'login';
let heroMode = 'login'; // Separate state for hero form

// DOM Elements
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const authModal = document.getElementById('authModal');
const modalClose = document.getElementById('modalClose');
const authForm = document.getElementById('authForm');
const modalAuthForm = document.getElementById('modalAuthForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    renderAuthForm(authForm, true); // true indicates it's hero form
    setupIntersectionObserver();
    console.log('Page loaded successfully');
});

// Event Listeners
function initializeEventListeners() {
    // Navigation toggle
    navToggle?.addEventListener('click', toggleMobileMenu);
    
    // Modal triggers
    document.getElementById('loginBtn')?.addEventListener('click', () => openModal('student'));
    document.getElementById('getStartedBtn')?.addEventListener('click', () => openModal('student'));
    document.getElementById('learnMoreBtn')?.addEventListener('click', () => {
        document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Footer links
    document.getElementById('studentLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('student');
    });
    document.getElementById('companyLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('company');
    });
    
    // Modal close
    modalClose?.addEventListener('click', closeModal);
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal();
    });
    
    // Role buttons in hero
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role;
            heroMode = 'login'; // Reset hero form mode when switching roles
            renderAuthForm(authForm, true);
            clearAlert('heroAlert');
        });
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Mobile Menu
function toggleMobileMenu() {
    navMenu?.classList.toggle('active');
    navToggle?.classList.toggle('active');
}

// Modal Functions
function openModal(role = currentRole) {
    currentRole = role;
    currentMode = 'login'; // Always start with login
    
    setupModalTabs();
    renderAuthForm(modalAuthForm);
    setupModeToggle();
    
    authModal?.classList.add('active');
    document.body.style.overflow = 'hidden';
    clearAlert('modalAlert');
}

function closeModal() {
    authModal?.classList.remove('active');
    document.body.style.overflow = '';
    clearAlert('modalAlert');
}

function setupModalTabs() {
    const modalBody = document.querySelector('.modal-body');
    const tabBtns = modalBody?.querySelectorAll('.tab-btn');
    
    tabBtns?.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.role === currentRole) {
            btn.classList.add('active');
        }
        
        // Clone to remove existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Add fresh listeners
    modalBody?.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modalBody.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role;
            renderAuthForm(modalAuthForm);
            clearAlert('modalAlert');
        });
    });
}

function setupModeToggle() {
    const toggleBtn = document.getElementById('modeToggleBtn');
    const toggleText = document.getElementById('toggleText');
    
    if (toggleBtn && toggleText) {
        toggleText.textContent = currentMode === 'login' ? 'New here?' : 'Already have an account?';
        toggleBtn.textContent = currentMode === 'login' ? 'Create Account' : 'Back to Login';
        
        const newToggleBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
        
        newToggleBtn.addEventListener('click', () => {
            currentMode = currentMode === 'login' ? 'register' : 'login';
            setupModeToggle();
            renderAuthForm(modalAuthForm);
            clearAlert('modalAlert');
        });
    }
}

// Enhanced Auto-Switch Function for both forms
function autoSwitchToRegister(email = '', isHeroForm = false) {
    console.log('Auto-switching to register mode with email:', email, 'isHeroForm:', isHeroForm);
    
    if (isHeroForm) {
        heroMode = 'register';
        renderAuthForm(authForm, true);
        
        // Wait for form to render, then pre-fill email
        setTimeout(() => {
            if (email) {
                const emailInput = authForm?.querySelector('input[name="email"]');
                if (emailInput) {
                    emailInput.value = email;
                    console.log('Email pre-filled in hero form:', email);
                }
            }
        }, 100);
        
        showAlert('heroAlert', 'Account not found. Please create a new account below.', 'info');
    } else {
        currentMode = 'register';
        setupModeToggle();
        renderAuthForm(modalAuthForm);
        
        // Wait for form to render, then pre-fill email
        setTimeout(() => {
            if (email) {
                const emailInput = modalAuthForm?.querySelector('input[name="email"]');
                if (emailInput) {
                    emailInput.value = email;
                    console.log('Email pre-filled in modal form:', email);
                }
            }
        }, 100);
        
        showAlert('modalAlert', 'Account not found. Please create a new account below.', 'info');
    }
}

// Enhanced Form Rendering with hero form support
function renderAuthForm(container, isHeroForm = false) {
    if (!container) return;
    
    const formMode = isHeroForm ? heroMode : currentMode;
    const isRegister = formMode === 'register';
    let formHTML = '<form class="auth-form" id="activeAuthForm">';
    
    if (isRegister) {
        if (currentRole === 'company') {
            formHTML += `
                <div class="form-group">
                    <label class="form-label">Contact Person Name *</label>
                    <input type="text" name="contactPerson" class="form-input" required placeholder="Your full name">
                </div>
                <div class="form-group">
                    <label class="form-label">Company Name *</label>
                    <input type="text" name="companyName" class="form-input" required placeholder="Your company name">
                </div>
            `;
        } else {
            formHTML += `
                <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input type="text" name="fullName" class="form-input" required placeholder="Your full name">
                </div>
            `;
        }
    }
    
    formHTML += `
        <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" name="email" class="form-input" required placeholder="your@email.com">
        </div>
        <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="password" name="password" class="form-input" required placeholder="Enter your password">
        </div>
        <button type="submit" class="form-submit">
            ${isRegister ? 'Create Account' : 'Sign In'}
        </button>
    `;
    
    // Add mode toggle for hero form if in register mode
    if (isHeroForm && isRegister) {
        formHTML += `
            <div class="mode-toggle" style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--gray-200);">
                <span>Already have an account?</span>
                <button type="button" id="heroModeToggle" class="toggle-btn">Back to Login</button>
            </div>
        `;
    }
    
    formHTML += '</form>';
    container.innerHTML = formHTML;
    
    // Add form submit listener
    const form = container.querySelector('#activeAuthForm');
    form?.addEventListener('submit', (e) => handleFormSubmit(e, isHeroForm));
    
    // Add hero mode toggle listener if present
    if (isHeroForm) {
        const heroToggle = document.getElementById('heroModeToggle');
        heroToggle?.addEventListener('click', () => {
            heroMode = 'login';
            renderAuthForm(authForm, true);
            clearAlert('heroAlert');
        });
    }
}

// FIXED: Enhanced Form Submission with better error handling
async function handleFormSubmit(e, isHeroForm = false) {
    e.preventDefault();
    console.log('Form submitted:', { role: currentRole, mode: isHeroForm ? heroMode : currentMode, isHeroForm });
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Show loading
    const submitBtn = e.target.querySelector('.form-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Please wait...';
    submitBtn.disabled = true;
    
    const alertId = isHeroForm ? 'heroAlert' : 'modalAlert';
    clearAlert(alertId);
    
    try {
        const formMode = isHeroForm ? heroMode : currentMode;
        const endpoint = formMode === 'login' ? 
            `/auth/${currentRole}/login` : 
            `/auth/${currentRole}/register`;
            
        console.log('API Request:', {
            url: API_BASE_URL + endpoint,
            method: 'POST',
            data: { ...data, password: '[HIDDEN]' },
            isHeroForm
        });
        
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        let result;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            result = { message: text || 'Server error' };
        }
        
        console.log('Server Response:', {
            status: response.status,
            ok: response.ok,
            data: result,
            isHeroForm
        });
        
        if (!response.ok) {
            handleAuthError(response.status, result, data.email, isHeroForm);
            return;
        }
        
        if (formMode === 'login') {
            // Successful login
            if (result.token) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('userType', currentRole);
                localStorage.setItem('userId', result.user?.id || result.id);
            }
            
            showAlert(alertId, 'Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                const redirectMap = {
                    student: '/student/student-dashboard.html',
                    faculty: '/faculty/faculty-dashboard.html',
                    company: '/company/company-dashboard.html'
                };
                
                window.location.href = redirectMap[currentRole];
            }, 1500);
            
        } else {
            // Successful registration
            showAlert(alertId, 'Account created successfully! Please sign in.', 'success');
            
            setTimeout(() => {
                if (isHeroForm) {
                    heroMode = 'login';
                    renderAuthForm(authForm, true);
                } else {
                    currentMode = 'login';
                    setupModeToggle();
                    renderAuthForm(modalAuthForm);
                }
                
                // Pre-fill email
                setTimeout(() => {
                    const container = isHeroForm ? authForm : modalAuthForm;
                    const emailInput = container?.querySelector('input[name="email"]');
                    if (emailInput) {
                        emailInput.value = data.email;
                    }
                }, 100);
            }, 2000);
        }
        
    } catch (error) {
        console.error('Network Error:', error);
        
        // CRITICAL FIX: Handle network errors for non-existent users
        const formMode = isHeroForm ? heroMode : currentMode;
        if (formMode === 'login') {
            console.log('Network error during login - assuming user not found');
            showAlert(alertId, 'Checking if account exists...', 'info');
            
            setTimeout(() => {
                autoSwitchToRegister(data.email, isHeroForm);
            }, 1000);
        } else {
            showAlert(alertId, 'Network error. Please check your connection and try again.', 'error');
        }
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// FIXED: Enhanced Error Handler with proper credential checking
function handleAuthError(status, result, email, isHeroForm = false) {
    const message = result.message || result.error || result.msg || 'Something went wrong';
    const alertId = isHeroForm ? 'heroAlert' : 'modalAlert';
    const formMode = isHeroForm ? heroMode : currentMode;
    
    console.log('Handling Auth Error:', {
        status,
        message,
        currentMode: formMode,
        email,
        isHeroForm,
        fullResult: result
    });
    
    if (formMode === 'login') {
        // Check for specific error types based on backend response
        if (status === 404) {
            // User definitely not found
            console.log('404 - User not found, switching to register');
            showAlert(alertId, 'Account not found. Switching to registration...', 'warning');
            setTimeout(() => {
                autoSwitchToRegister(email, isHeroForm);
            }, 1500);
            
        } else if (status === 401) {
            // Check if this is a "user not found" vs "wrong password" case
            // Backend should differentiate, but we'll check message patterns
            const userNotFoundPatterns = [
                'user not found',
                'email not found', 
                'account not found',
                'no user found',
                'user does not exist',
                'email not registered',
                'invalid email'
            ];
            
            const passwordErrorPatterns = [
                'invalid password',
                'wrong password',
                'incorrect password', 
                'password mismatch'
            ];
            
            const isUserNotFound = userNotFoundPatterns.some(pattern => 
                message.toLowerCase().includes(pattern)
            );
            
            const isPasswordError = passwordErrorPatterns.some(pattern => 
                message.toLowerCase().includes(pattern)
            );
            
            if (isUserNotFound) {
                console.log('401 - User not found pattern detected, switching to register');
                showAlert(alertId, 'Account not found. Switching to registration...', 'warning');
                setTimeout(() => {
                    autoSwitchToRegister(email, isHeroForm);
                }, 1500);
                
            } else if (isPasswordError) {
                console.log('401 - Password error detected');
                showAlert(alertId, 'Incorrect password. Please try again.', 'error');
                
            } else {
                // Generic 401 - could be either, but default to credential error
                console.log('401 - Generic credential error');
                showAlert(alertId, 'Invalid email or password. Please check and try again.', 'error');
            }
            
        } else if (status === 400) {
            // Bad request - could be missing fields or user not found
            const userNotFoundPatterns = [
                'user not found',
                'email not found',
                'account not found'
            ];
            
            const isUserNotFound = userNotFoundPatterns.some(pattern => 
                message.toLowerCase().includes(pattern)
            );
            
            if (isUserNotFound) {
                console.log('400 - User not found, switching to register');
                showAlert(alertId, 'Account not found. Switching to registration...', 'warning');
                setTimeout(() => {
                    autoSwitchToRegister(email, isHeroForm);
                }, 1500);
            } else {
                showAlert(alertId, `Login failed: ${message}`, 'error');
            }
            
        } else {
            // Other errors (500, etc.)
            showAlert(alertId, `Login failed: ${message}`, 'error');
        }
        
    } else {
        // Handle registration errors
        if (status === 409 || 
            (status === 400 && (
                message.toLowerCase().includes('exists') || 
                message.toLowerCase().includes('already') ||
                message.toLowerCase().includes('duplicate')
            ))) {
            
            showAlert(alertId, 'Email already registered. Try logging in instead.', 'warning');
            
            if (!isHeroForm) {
                setTimeout(() => {
                    const switchBtn = document.getElementById('modeToggleBtn');
                    if (switchBtn) {
                        switchBtn.style.background = '#f59e0b';
                        switchBtn.style.animation = 'pulse 1s infinite';
                        
                        setTimeout(() => {
                            switchBtn.style.background = '';
                            switchBtn.style.animation = '';
                        }, 3000);
                    }
                }, 1000);
            } else {
                // For hero form, switch back to login mode
                setTimeout(() => {
                    heroMode = 'login';
                    renderAuthForm(authForm, true);
                    showAlert('heroAlert', 'Please try logging in with your existing account.', 'info');
                }, 2000);
            }
            
        } else {
            showAlert(alertId, `Registration failed: ${message}`, 'error');
        }
    }
}

// Enhanced Alert System
function showAlert(containerId, message, type = 'error') {
    console.log('Showing Alert:', { containerId, message, type });
    
    let container = document.getElementById(containerId);
    
    // If it's heroAlert and doesn't exist, create it dynamically
    if (containerId === 'heroAlert' && !container) {
        const heroCard = document.querySelector('.hero-card .card-body');
        if (heroCard) {
            container = document.createElement('div');
            container.id = 'heroAlert';
            container.className = 'modal-alert';
            container.style.marginTop = 'var(--space-4)';
            heroCard.appendChild(container);
        }
    }
    
    if (!container) {
        console.error('Alert container not found and could not be created:', containerId);
        return;
    }
    
    const alertConfig = {
        success: { icon: '✅', class: 'success' },
        error: { icon: '❌', class: 'error' },
        warning: { icon: '⚠️', class: 'warning' },
        info: { icon: 'ℹ️', class: 'info' }
    };
    
    const config = alertConfig[type] || alertConfig.error;
    
    container.className = `modal-alert ${config.class}`;
    container.innerHTML = `${config.icon} ${message}`;
    container.style.display = 'block';
    
    console.log('Alert displayed:', container.className, container.innerHTML);
    
    // Auto-clear success messages
    if (type === 'success') {
        setTimeout(() => {
            clearAlert(containerId);
        }, 5000);
    }
}

function clearAlert(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.className = 'modal-alert';
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

// Intersection Observer for animations
function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.feature-card, .stat-item').forEach(el => {
        observer.observe(el);
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Close mobile menu when clicking nav links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu?.classList.remove('active');
        navToggle?.classList.remove('active');
    });
});

// Global functions
window.openModal = openModal;
window.closeModal = closeModal;