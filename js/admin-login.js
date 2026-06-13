/**
 * Admin Login — Sri Prasannanjaneya Home Needs
 * Handles credential validation and session management.
 */

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'Sphn@2026'
};

const SESSION_KEY = 'sphn_admin_session';

// Redirect if already logged in
if (localStorage.getItem(SESSION_KEY)) {
    window.location.replace('admin-dashboard.html');
}

document.addEventListener('DOMContentLoaded', () => {
    const form       = document.getElementById('loginForm');
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    const loginBtn   = document.getElementById('loginBtn');
    const loginBtnText  = document.getElementById('loginBtnText');
    const loginSpinner  = document.getElementById('loginSpinner');
    const loginError    = document.getElementById('loginError');
    const togglePassBtn = document.getElementById('togglePassword');
    const toggleIcon    = document.getElementById('toggleIcon');

    // --- Password toggle ---
    togglePassBtn.addEventListener('click', () => {
        const isPassword = passwordEl.type === 'password';
        passwordEl.type = isPassword ? 'text' : 'password';
        toggleIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // --- Clear error on typing ---
    [usernameEl, passwordEl].forEach(input => {
        input.addEventListener('input', () => {
            loginError.style.display = 'none';
            input.classList.remove('is-error');
        });
    });

    // --- Form Submit ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        loginError.style.display = 'none';

        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        let valid = true;

        if (!username) {
            document.getElementById('usernameError').textContent = 'Username is required.';
            usernameEl.classList.add('is-error');
            valid = false;
        } else {
            document.getElementById('usernameError').textContent = '';
            usernameEl.classList.remove('is-error');
        }

        if (!password) {
            document.getElementById('passwordError').textContent = 'Password is required.';
            passwordEl.classList.add('is-error');
            valid = false;
        } else {
            document.getElementById('passwordError').textContent = '';
            passwordEl.classList.remove('is-error');
        }

        if (!valid) return;

        // Show loading state
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Signing in...';
        loginSpinner.style.display = 'inline-block';

        // Simulate brief auth delay for UX polish
        setTimeout(() => {
            if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                // Save session
                localStorage.setItem(SESSION_KEY, JSON.stringify({
                    username,
                    loginTime: new Date().toISOString()
                }));
                window.location.replace('admin-dashboard.html');
            } else {
                // Show error
                loginError.style.display = 'flex';
                usernameEl.classList.add('is-error');
                passwordEl.classList.add('is-error');
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Sign In';
                loginSpinner.style.display = 'none';
                passwordEl.value = '';
                passwordEl.focus();
            }
        }, 700);
    });
});
