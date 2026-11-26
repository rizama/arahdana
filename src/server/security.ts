import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
export const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const equal = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function security() {
 const secret = randomBytes(32);
 const sign = (token: string) => createHmac('sha256', secret).update(token).digest('hex');
 const headers: RequestHandler = (req, res, next) => {
  res.set({ 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
 };
 const issue: RequestHandler = (req, res) => {
  const token = randomBytes(32).toString('hex');
  res.cookie('csrf', token + '.' + sign(token), { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/' });
  res.json({ token });
 };
 const verify: RequestHandler = (req, res, next) => {
  const origin = req.get('Origin');
  const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('csrf='))?.slice(5) ?? '';
  const [token = '', sig = ''] = cookie.split('.');
  if (origin !== req.protocol + '://' + req.get('host') || !/^[a-f0-9]{64}$/.test(token) || !equal(sig, sign(token)) || !equal(token, req.get('X-CSRF-Token') ?? '')) {
   res.status(403).json({ error: 'Origin atau CSRF tidak valid' }); return;
  }
  next();
 };
 return { headers, issue, verify };
}
