import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS_URI = 'https://accounts.kab.info/auth/realms/main/protocol/openid-connect/certs';
const ISSUER = 'https://accounts.kab.info/auth/realms/main';

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

function getRoles(payload) {
  const realmRoles = payload?.realm_access?.roles ?? [];
  const clientRoles = payload?.resource_access?.events?.roles ?? [];
  return [...realmRoles, ...clientRoles];
}

function parseBearer(req) {
  const auth = req.headers.authorization;
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Non-blocking — attaches req.user if token is valid, otherwise req.user = null
export async function extractUser(req, res, next) {
  const token = parseBearer(req);
  if (!token) { req.user = null; return next(); }
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
    req.user = payload;
  } catch {
    req.user = null;
  }
  next();
}

// Blocking — requires valid token with 'events_admin' role
export async function requireAdmin(req, res, next) {
  const token = parseBearer(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
    if (!getRoles(payload).includes('events_admin')) {
      return res.status(403).json({ error: 'Admin role required' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function canSeePrivate(req) {
  const roles = getRoles(req.user);
  return roles.includes('events_admin') || roles.includes('events_moderator');
}

export function isTranslatorRole(payload) {
  return getRoles(payload).includes('events_translator');
}

// Blocking — requires valid token with 'events_admin' or 'events_translator' role
export async function requireAdminOrTranslator(req, res, next) {
  const token = parseBearer(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
    const roles = getRoles(payload);
    if (!roles.includes('events_admin') && !roles.includes('events_translator')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
