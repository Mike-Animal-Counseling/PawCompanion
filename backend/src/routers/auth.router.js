import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import Customer from '../models/Customer.js';
import Merchant from '../models/Merchant.js';
import Admin from '../models/Admin.js';
import ChatMemory from '../models/ChatMemory.js';
import Checkin from '../models/Checkin.js';
import Favorite from '../models/Favorite.js';
import Booking from '../models/Booking.js';
import { asyncHandler } from '../lib/errors.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/errors.js';
import { ok, created, noContent } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { accountModel, requireAuth, signAccessToken, verifyAccessToken } from '../middleware/auth.js';
import { serializeAccount } from '../serializers/account.js';
import { createSession, listSessions, revokeAllSessions, revokeOtherSessions, revokeSessionById, revokeSessionByToken, rotateSession, findLiveSession } from '../services/sessionService.js';
import { deleteRiskData } from '../services/riskScoring.js';
import { recordAudit } from '../services/auditService.js';
import {
  customerLoginSchema,
  customerRegisterSchema,
  deleteAccountSchema,
  merchantLoginSchema,
  merchantRegisterSchema,
  adminLoginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.js';

const router = Router();
const REFRESH_COOKIE = 'pc_refresh';
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYJYGRklB.kAEOWBQVjnWEZWVjx7njcK';

function cookieOptions(config, expiresAt) {
  return {
    httpOnly: true,
    secure: config.production,
    sameSite: 'lax',
    path: '/api/auth',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function setRefreshCookie(res, config, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions(config, expiresAt));
}

function clearRefreshCookie(res, config) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions(config));
}

function readRefresh(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function authPayload(config, account, session, token) {
  return {
    accessToken: signAccessToken(config, {
      sub: account._id,
      role: account.role,
      email: account.email,
      sid: session._id,
    }),
    expiresIn: config.accessTokenMinutes * 60,
    user: serializeAccount(account),
  };
}

async function passwordMatches(password, hash) {
  return bcrypt.compare(password, hash || DUMMY_HASH);
}

async function issueSession({ req, res, config, account, role, status = 200 }) {
  const { session, token } = await createSession({ account, role, req, config });
  setRefreshCookie(res, config, token, session.expiresAt);
  account.lastLoginAt = new Date();
  await account.save();
  const payload = authPayload(config, account, session, token);
  return status === 201 ? created(res, payload) : ok(res, payload);
}

router.post(
  '/customer/register',
  validate(customerRegisterSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const { name, email, password } = req.body;
    if (await Customer.exists({ email })) throw conflict('An account with that email already exists');
    const passwordHash = await bcrypt.hash(password, 12);
    let customer;
    try {
      customer = await Customer.create({ name, email, passwordHash });
    } catch (error) {
      if (error?.code === 11000) throw conflict('An account with that email already exists');
      throw error;
    }
    await recordAudit(req, { action: 'account.registered', targetType: 'customer', targetId: customer._id, actorRole: 'customer', actorId: customer._id });
    return issueSession({ req, res, config, account: customer, role: 'customer', status: 201 });
  }),
);

router.post(
  '/customer/login',
  validate(customerLoginSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email }).select('+passwordHash');
    const matches = await passwordMatches(password, customer?.passwordHash);
    if (!customer || !matches || customer.status !== 'active') throw unauthorized('Invalid email or password');
    return issueSession({ req, res, config, account: customer, role: 'customer' });
  }),
);

router.post(
  '/merchant/register',
  validate(merchantRegisterSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const { name, email, password, businessType, city, description, website } = req.body;
    if (await Merchant.exists({ email })) throw conflict('A partner account with that email already exists');
    const passwordHash = await bcrypt.hash(password, 12);
    let merchant;
    try {
      merchant = await Merchant.create({
        name,
        email,
        passwordHash,
        businessType,
        city,
        description,
        website,
        verified: false,
        status: 'active',
      });
    } catch (error) {
      if (error?.code === 11000) throw conflict('A partner account with that email already exists');
      throw error;
    }
    await recordAudit(req, { action: 'merchant.registered', targetType: 'merchant', targetId: merchant._id, actorRole: 'merchant', actorId: merchant._id });
    return issueSession({ req, res, config, account: merchant, role: 'merchant', status: 201 });
  }),
);

router.post(
  '/merchant/login',
  validate(merchantLoginSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const { email, password } = req.body;
    const merchant = await Merchant.findOne({ email }).select('+passwordHash');
    const matches = await passwordMatches(password, merchant?.passwordHash);
    if (!merchant || !matches || merchant.status !== 'active') throw unauthorized('Invalid email or password');
    return issueSession({ req, res, config, account: merchant, role: 'merchant' });
  }),
);

router.post(
  '/admin/login',
  validate(adminLoginSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+passwordHash');
    const matches = await passwordMatches(password, admin?.passwordHash);
    if (!admin || !matches || admin.status !== 'active') throw unauthorized('Invalid email or password');
    return issueSession({ req, res, config, account: admin, role: 'admin' });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const token = readRefresh(req);
    if (!token) throw unauthorized('Session expired');
    const rotated = await rotateSession(token, { req, config });
    if (!rotated) {
      clearRefreshCookie(res, config);
      throw unauthorized('Session expired');
    }
    const Model = accountModel(rotated.session.role);
    const account = await Model.findById(rotated.session.subjectId);
    if (!account || account.status !== 'active') {
      await revokeSessionByToken(rotated.token);
      clearRefreshCookie(res, config);
      throw unauthorized('Account is not available');
    }
    setRefreshCookie(res, config, rotated.token, rotated.session.expiresAt);
    return ok(res, authPayload(config, account, rotated.session, rotated.token));
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const token = readRefresh(req);
    if (token) {
      const session = await findLiveSession(token);
      if (session) await revokeSessionByToken(token);
    }
    const header = req.get('authorization') || '';
    if (header.startsWith('Bearer ')) {
      try {
        const decoded = verifyAccessToken(config, header.slice(7));
        if (decoded.sid) await revokeSessionById(decoded.sid, decoded.sub, decoded.role);
      } catch {
        // Logging out is idempotent; an expired token is already signed out.
      }
    }
    clearRefreshCookie(res, config);
    return noContent(res);
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, { user: serializeAccount(req.account) })),
);

router.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const account = req.account;
    const role = req.auth.role;
    const allowed =
      role === 'customer'
        ? ['name', 'phone', 'city', 'marketingOptIn', 'goals', 'preferredSpecies', 'timezone', 'onboardingComplete']
        : role === 'merchant'
          ? ['name', 'businessType', 'description', 'website', 'logoUrl', 'city']
          : ['name'];
    for (const key of Object.keys(req.body)) {
      if (!allowed.includes(key)) throw badRequest(`The field "${key}" cannot be changed for this account`);
      account[key] = req.body[key];
    }
    await account.save();
    await recordAudit(req, { action: 'account.updated', targetType: role, targetId: account._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, { user: serializeAccount(account) });
  }),
);

router.post(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const Model = accountModel(req.auth.role);
    const account = await Model.findById(req.auth.sub).select('+passwordHash');
    if (!account || !(await bcrypt.compare(req.body.currentPassword, account.passwordHash))) {
      throw unauthorized('Current password is incorrect');
    }
    account.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await account.save();
    const revoked = await revokeOtherSessions(req.auth.sub, req.auth.role, req.auth.sid);
    await recordAudit(req, { action: 'account.password_changed', targetType: req.auth.role, targetId: req.auth.sub, metadata: { otherSessionsRevoked: revoked } });
    return ok(res, { updated: true, otherSessionsRevoked: revoked });
  }),
);

router.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await listSessions(req.auth.sub, req.auth.role);
    return ok(res, {
      sessions: sessions.map((session) => ({
        id: String(session._id),
        current: String(session._id) === req.auth.sid,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
      })),
    });
  }),
);

router.delete(
  '/sessions/:sessionId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    if (!/^[a-f\d]{24}$/i.test(req.params.sessionId)) throw notFound('Session not found');
    const removed = await revokeSessionById(req.params.sessionId, req.auth.sub, req.auth.role);
    if (!removed) throw notFound('Session not found');
    if (req.params.sessionId === req.auth.sid) clearRefreshCookie(res, config);
    await recordAudit(req, { action: 'session.revoked', targetType: 'session', targetId: req.params.sessionId });
    return noContent(res);
  }),
);

router.delete(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    await revokeAllSessions(req.auth.sub, req.auth.role);
    clearRefreshCookie(res, config);
    return noContent(res);
  }),
);

router.delete(
  '/me',
  requireAuth,
  validate(deleteAccountSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    if (req.auth.role !== 'customer') throw forbidden('Partner and operator accounts are closed by support');
    const { password } = req.body;
    const customer = await Customer.findById(req.auth.sub).select('+passwordHash');
    if (!customer || !(await bcrypt.compare(password || '', customer.passwordHash))) {
      throw unauthorized('Password is incorrect');
    }
    const active = await Booking.countDocuments({
      customerId: customer._id,
      status: { $in: ['pending', 'confirmed'] },
      date: { $gte: new Date().toISOString().slice(0, 10) },
    });
    if (active > 0) throw conflict('Cancel your upcoming visits before deleting your account');

    await Promise.all([
      ChatMemory.deleteMany({ userId: String(customer._id) }),
      Checkin.deleteMany({ customerId: customer._id }),
      Favorite.deleteMany({ customerId: customer._id }),
      deleteRiskData(String(customer._id)),
      Booking.updateMany(
        { customerId: customer._id },
        {
          $set: {
            'contact.name': 'Deleted guest',
            'contact.email': '',
            'contact.phone': '',
            'contact.address': '',
            'contact.notes': '',
          },
        },
      ),
    ]);

    customer.status = 'suspended';
    customer.name = 'Deleted guest';
    customer.email = `deleted+${customer._id}@pawcompanion.invalid`;
    customer.phone = '';
    customer.city = '';
    customer.passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    await customer.save();
    await revokeAllSessions(customer._id, 'customer');
    clearRefreshCookie(res, config);
    await recordAudit(req, {
      action: 'account.deleted',
      targetType: 'customer',
      targetId: customer._id,
      actorRole: 'customer',
      actorId: customer._id,
    });
    return noContent(res);
  }),
);

export default router;
