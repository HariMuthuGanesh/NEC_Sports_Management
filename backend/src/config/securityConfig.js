import crypto from 'crypto';

// In development, if JWT_SECRET is not set, generate a cryptographically strong runtime secret
let runtimeSecret = process.env.JWT_SECRET;

if (!runtimeSecret || runtimeSecret === 'fallback_secret_for_mock_db') {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set with at least 32 characters in production.');
    process.exit(1);
  } else {
    // Generate a secure 256-bit random secret for this server instance
    runtimeSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[Security Warning] JWT_SECRET was not set in .env. Generated a secure runtime fallback secret.');
  }
} else if (runtimeSecret.length < 32) {
  console.warn('[Security Warning] JWT_SECRET is under 32 characters. Consider using a 256-bit secret for production.');
}

export const JWT_SECRET = runtimeSecret;
export const getJwtSecret = () => JWT_SECRET;

// Token Revocation / Blacklist Store (In-Memory with TTL cleanup)
const revokedTokens = new Map(); // tokenHash -> expiryTimestamp

export const revokeToken = (token, exp) => {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiryTime = exp ? exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  revokedTokens.set(tokenHash, expiryTime);
};

export const isTokenRevoked = (token) => {
  if (!token) return true;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiry = revokedTokens.get(tokenHash);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    revokedTokens.delete(tokenHash);
    return false;
  }
  return true;
};

// Periodic garbage collection for revoked tokens (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [hash, exp] of revokedTokens.entries()) {
    if (now > exp) revokedTokens.delete(hash);
  }
}, 30 * 60 * 1000).unref();
