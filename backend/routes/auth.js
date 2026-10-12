import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant_id: user.tenant_id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Local development convenience. Credentials stay on the server and the existing
// account is authenticated through the same password check as a normal login.
router.post('/demo-login', async (req, res) => {
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (process.env.NODE_ENV === 'production' || !local || !process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD) {
    return res.status(404).json({ error: 'Demo login is unavailable.' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [process.env.DEMO_EMAIL]);
    const user = result.rows[0];
    if (!user || !await bcrypt.compare(process.env.DEMO_PASSWORD, user.password)) {
      return res.status(401).json({ error: 'Configured demo account is unavailable.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant_id: user.tenant_id } });
  } catch (_) {
    res.status(500).json({ error: 'Demo login failed.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, name, email, role, tenant_id FROM users WHERE id = $1', [verified.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;
