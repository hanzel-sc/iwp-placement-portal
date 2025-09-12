// js/auth.js - FIXED VERSION
const SECRET_KEY = "placement2024";

// Create matrix effect
function createMatrixEffect() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';
    canvas.style.opacity = '0.1';
    document.querySelector('.matrix-bg').appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const font_size = 10;
    const columns = canvas.width / font_size;
    const drops = [];

    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff41';
        ctx.font = font_size + 'px arial';

        for (let i = 0; i < drops.length; i++) {
            const text = matrix[Math.floor(Math.random() * matrix.length)];
            ctx.fillText(text, i * font_size, drops[i] * font_size);

            if (drops[i] * font_size > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(draw, 35);
}

createMatrixEffect()
// Animate ASCII art
/*function animateASCII() {
    const asciiElement = document.getElementById('ascii-text');
    const asciiText = asciiElement.textContent;
    asciiElement.textContent = '';
    
    let i = 0;
    const interval = setInterval(() => {
        if (i < asciiText.length) {
            asciiElement.textContent += asciiText[i];
            i++;
        } else {
            clearInterval(interval);
        }
    }, 20);
}*/

function validateKey() {
    const input = document.getElementById('secretKey').value;
    const errorDiv = document.getElementById('error-message');
    
    if (input === SECRET_KEY) {
        errorDiv.style.color = '#00ff41';
        errorDiv.textContent = '✓ Access granted! Redirecting...';
        
        // FIXED: Use consistent storage key
        sessionStorage.setItem('authorized', 'true');
        
        setTimeout(() => {
            // FIXED: Redirect to the correct path for Vercel
            window.location.href = '/home';
        }, 1500);
        
    } else {
        errorDiv.style.color = '#ff4444';
        errorDiv.textContent = '✗ Invalid key. Access denied.';
        document.getElementById('secretKey').value = '';
        
        // Add shake animation
        const authBox = document.querySelector('.auth-box');
        authBox.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            authBox.style.animation = '';
        }, 500);
    }
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    createMatrixEffect();
    setTimeout(animateASCII, 500);
    
    document.getElementById('secretKey').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            validateKey();
        }
    });
    
    // FIXED: Check if already authorized and redirect
    if (sessionStorage.getItem('authorized')) {
        window.location.href = '/home';
    }
});

window.addEventListener('resize', () => {
    const canvas = document.querySelector('.matrix-bg canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});