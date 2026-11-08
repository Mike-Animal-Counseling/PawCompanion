import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import Customer from '../models/Customer.js';
import Merchant from '../models/Merchant.js';
import Admin from '../models/Admin.js';
import Session from '../models/Session.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { isObjectId } from '../lib/ids.js';

const MODELS = { customer: Customer, merchant: Merchant, admin: Admin };

export function accountModel(role) {
  return MODELS[role] || null;
}

export function signAccessToken(config, { sub, role, email, sid }) {
  return jwt.sign({ role, email, sid }, config.jwtSecret, {
    subject: String(sub),
    algorithm: 'HS256',
    issuer: 'pawcompanion',
    audience: 'pawcompanion',
    expiresIn: `${config.accessTokenMinutes}m`,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(config, token) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: 'pawcompanion',
    audience: 'pawcompanion',
  });
}

async function resolveRequestAuth(req) {
  const config = req.app.locals.config;
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;

  const decoded = verifyAccessToken(config, header.slice(7));
  if (!isObjectId(decoded.sub) || !MODELS[decoded.role] || !isObjectId(decoded.sid)) return null;

  // Checking the session makes logout and refresh rotation take effect
  // immediately instead of waiting for the short-lived access token to expire.
  const session = await Session.findOne({ _id: decoded.sid, subjectId: decoded.sub, role: decoded.role }).lean();
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  const Model = MODELS[decoded.role];
  const account = await Model.findById(decoded.sub);
  if (!account || account.status !== 'active' || account.email !== decoded.email) return null;

  return {
    auth: { sub: String(account._id), role: decoded.role, email: account.email, sid: String(decoded.sid) },
    account,
  };
}

export async function requireAuth(req, _res, next) {
  try {
    const resolved = await resolveRequestAuth(req);
    if (!resolved) throw unauthorized();
    req.auth = resolved.auth;
    req.account = resolved.account;
    next();
  } catch {
    next(unauthorized());
  }
}

/** Populates req.auth when a valid bearer token is present, but never rejects. */
export async function optionalAuth(req, _res, next) {
  try {
    const resolved = await resolveRequestAuth(req);
    if (resolved) {
      req.auth = resolved.auth;
      req.account = resolved.account;
    }
  } catch {
    // Anonymous access is allowed on public routes.
  }
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
}
