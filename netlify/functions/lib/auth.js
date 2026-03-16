const crypto = require('node:crypto');

const { SESSION_MAX_AGE_MS } = require('./constants');

const TOKEN_SECRET = process.env.SHIPVIVOR_TOKEN_SECRET;
if (!TOKEN_SECRET) {
  throw new Error('SHIPVIVOR_TOKEN_SECRET environment variable is required');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

function base64UrlEncode(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4 || 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signTokenPayload(payload) {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex');
}

function validateUsername(username) {
  return /^[a-z0-9_-]{3,24}$/.test(username);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function getTokenFromEvent(event) {
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function createSession(db, username) {
  const user = db.users[username];
  const payload = {
    username,
    isAdmin: Boolean(user?.isAdmin),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signTokenPayload(encoded);
  return `${encoded}.${signature}`;
}

function getUserFromToken(db, token) {
  if (!token) return null;
  const [encodedPayload, providedSignature] = String(token).split('.');
  if (!encodedPayload || !providedSignature) return null;
  const expectedSignature = signTokenPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(providedSignature, 'hex');
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  let payload = null;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.username !== 'string' || !validateUsername(payload.username)) return null;
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;

  return {
    username: payload.username,
    isAdmin: Boolean(payload.isAdmin)
  };
}

module.exports = {
  createSession,
  getTokenFromEvent,
  getUserFromToken,
  hashPassword,
  validatePassword,
  validateUsername,
  verifyPassword
};
