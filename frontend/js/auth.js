// Secret key configuration
const SECRET_KEY = "placement2024"; // Change this to whatever you want

// Authentication function
function validateKey() {
    const inputKey = document.getElementById('secretKey').value;
    const errorElement = document.getElementById('error-message');
    
    if (inputKey === SECRET_KEY) {
        // Success animation
        document.body.style.transition = 'opacity 1s ease-out';
        document.body.style.opacity = '0';
        
        // Store authentication status
        sessionStorage.setItem('authenticated', 'true');
        
        // Redirect to main portal after animation
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        // Error handling
        errorElement.textContent = '❌ Invalid key! Access denied.';
        errorElement.style.animation = 'none';
        setTimeout(() => {
            errorElement.style.animation = 'shake 0.5s ease-in-out';
        }, 10);
        
        // Clear input and refocus
        document.getElementById('secretKey').value = '';
        document.getElementById('secretKey').focus();
    }
}

// Handle Enter key press
document.getElementById('secretKey').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        validateKey();
    }
});

// Auto-focus on input when page loads
window.addEventListener('load', function() {
    document.getElementById('secretKey').focus();
});

// Add some matrix-style digital rain effect
function createMatrixRain() {
    const characters = '01';
    const columns = Math.floor(window.innerWidth / 20);
    const drops = Array(columns).fill(0);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '0';
    canvas.style.opacity = '0.3';
    document.body.appendChild(canvas);
    
    function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '15px Courier New';
        
        for (let i = 0; i < drops.length; i++) {
            const text = characters[Math.floor(Math.random() * characters.length)];
            ctx.fillText(text, i * 20, drops[i] * 20);
            
            if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(drawMatrix, 50);
}

// Initialize matrix effect
createMatrixRain();

// Handle window resize
window.addEventListener('resize', function() {
    location.reload(); // Simple way to handle resize for matrix effect
});
