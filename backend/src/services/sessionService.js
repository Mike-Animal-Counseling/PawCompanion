import { createHash, randomBytes } from 'node:crypto';
import Session from '../models/Session.js';
import { MS_PER_DAY } from '../lib/time.js';

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function hashIp(ip) {
  return createHash('sha256').update(String(ip || '')).digest('hex');
}

export function sessionTtlMs(config) {
  return config.sessionDays * MS_PER_DAY;
}

export async function createSession({ account, role, req, config }) {
  const token = randomBytes(48).toString('base64url');
  const session = await Session.create({
    tokenHash: hashToken(token),
    subjectId: account._id,
    role,
    expiresAt: new Date(Date.now() + sessionTtlMs(config)),
    lastUsedAt: new Date(),
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    ipHash: hashIp(req.ip),
  });
  return { session, token };
}

export async function findLiveSession(token) {
  if (!token || typeof token !== 'string') return null;
  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}

export async function rotateSession(token, { req, config }) {
  const session = await findLiveSession(token);
  if (!session) return null;
  await Session.deleteOne({ _id: session._id });
  const nextToken = randomBytes(48).toString('base64url');
  const next = await Session.create({
    tokenHash: hashToken(nextToken),
    subjectId: session.subjectId,
    role: session.role,
    expiresAt: new Date(Date.now() + sessionTtlMs(config)),
    lastUsedAt: new Date(),
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    ipHash: hashIp(req.ip),
  });
  return { session: next, token: nextToken, previous: session };
}

export async function revokeSessionByToken(token) {
  if (!token) return false;
  const result = await Session.deleteOne({ tokenHash: hashToken(token) });
  return result.deletedCount > 0;
}

export async function revokeSessionById(id, subjectId, role) {
  const result = await Session.deleteOne({ _id: id, subjectId, role });
  return result.deletedCount > 0;
}

export async function revokeAllSessions(subjectId, role) {
  const result = await Session.deleteMany({ subjectId, role });
  return result.deletedCount;
}

export async function revokeOtherSessions(subjectId, role, keepSessionId) {
  const result = await Session.deleteMany({ subjectId, role, _id: { $ne: keepSessionId } });
  return result.deletedCount;
}

export async function listSessions(subjectId, role) {
  return Session.find({ subjectId, role }).sort({ lastUsedAt: -1 }).limit(20).lean();
}

export async function touchSession(sessionId) {
  await Session.updateOne({ _id: sessionId }, { $set: { lastUsedAt: new Date() } });
}
