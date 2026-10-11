import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import Merchant from '../models/Merchant.js';
import Customer from '../models/Customer.js';
import { loadSecurity } from '../security.js';
export const signAuthToken = ({ sub, role, email }) => jwt.sign({ role, email }, loadSecurity().secret, { subject: sub, algorithm: 'HS256', issuer: 'pawcompanion', audience: 'pawcompanion', expiresIn: '30m', jwtid: randomUUID() });
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new Error();
    const decoded = jwt.verify(header.slice(7), loadSecurity().secret, { algorithms: ['HS256'], issuer: 'pawcompanion', audience: 'pawcompanion' });
    if (!/^[a-f\d]{24}$/i.test(decoded.sub) || !['customer', 'merchant'].includes(decoded.role) || typeof decoded.jti !== 'string') throw new Error();
    const account = await (decoded.role === 'merchant' ? Merchant : Customer).findById(decoded.sub);
    if (!account || account.status !== 'active' || account.email !== decoded.email) throw new Error();
    req.auth = { sub: String(account._id), role: decoded.role, email: account.email }; req.account = account; next();
  } catch { res.status(401).json({ error: 'Authentication required' }); }
}
export const requireRole = role => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  if (req.auth.role !== role) return res.status(403).json({ error: 'Access denied' }); next();
};
