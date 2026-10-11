import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Customer from '../models/Customer.js';
import { signAuthToken, requireAuth, requireRole } from '../middleware/auth.js';
const router = Router();
const serialize = user => ({ id: String(user._id), name: user.name, email: user.email, role: 'customer' });
const emailOf = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.trim().toLowerCase() : null;
router.post('/register', async (req, res) => {
  try {
    const email = emailOf(req.body?.email), password = req.body?.password, name = req.body?.name;
    if (!email || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72 || typeof name !== 'string' || !name.trim() || name.length > 80) return res.status(400).json({ error: 'Use a valid name, email and password of at least 12 characters' });
    const user = await Customer.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ user: serialize(user), token: signAuthToken({ sub: String(user._id), role: 'customer', email: user.email }) });
  } catch (error) { res.status(error.code === 11000 ? 409 : 500).json({ error: 'Unable to register account' }); }
});
router.post('/login', async (req, res) => {
  try {
    const email = emailOf(req.body?.email), password = req.body?.password;
    if (!email || typeof password !== 'string' || Buffer.byteLength(password) > 72) return res.status(401).json({ error: 'Invalid credentials' });
    const user = await Customer.findOne({ email });
    const ok = await bcrypt.compare(password, user?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYJYGRklB.kAEOWBQVjnWEZWVjx7njcK');
    if (!user || !ok || user.status !== 'active') return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: serialize(user), token: signAuthToken({ sub: String(user._id), role: 'customer', email: user.email }) });
  } catch { res.status(500).json({ error: 'Unable to sign in' }); }
});
router.get('/me', requireAuth, requireRole('customer'), (req, res) => res.json({ user: serialize(req.account) }));
export default router;
