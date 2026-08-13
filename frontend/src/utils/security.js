/* Universal Security Utilities: XSS Sanitization, Token Handling & Password Validation */

/**
 * Escapes HTML input strings to prevent Cross-Site Scripting (XSS) attacks.
 */
export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * JWT Token Storage Helper
 */
const TOKEN_KEY = 'nec_sports_jwt_token';

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to store security token:', e);
  }
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Failed to remove security token:', e);
  }
};

/**
 * Password strength checker
 */
export const validatePasswordStrength = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  return { valid: true, message: 'Password strength acceptable.' };
};
