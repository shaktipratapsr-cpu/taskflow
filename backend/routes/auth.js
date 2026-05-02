const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate, requireApproval, JWT_SECRET, requireAdmin } = require('../middleware/auth');
const mongo = require('../mongoClient');
const { validateSignup, validateLogin } = require('../helpers/validation');

const router = express.Router();

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

router.post('/signup', async (req, res) => {
  // Validate request data
  const validation = validateSignup(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
  }

  const { name, email, password } = validation.data;
  const { role } = req.body;

  try {
    const col = await mongo.getLoginCollection();
    const exists = await col.findOne({ email: email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    
    const hash = await bcrypt.hash(password, 12);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const userRole = role === 'admin' ? 'admin' : 'member';
    
    const isApproved = userRole === 'admin';
    const result = await col.insertOne({ name, email, password: hash, role: userRole, avatar_color: color, isApproved, created_at: new Date() });
    const user = { id: result.insertedId.toString(), name, email, role: userRole, avatar_color: color, isApproved };
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('❌ Signup error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    return res.status(500).json({ error: 'Signup failed: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  // Validate request data
  const validation = validateLogin(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
  }

  const { email, password } = validation.data;

  try {
    const col = await mongo.getLoginCollection();
    const user = await col.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Auto-approve admin if they managed to log in but aren't approved (safety net)
    if (user.role === 'admin' && user.isApproved === false) {
      await col.updateOne({ _id: user._id }, { $set: { isApproved: true } });
      user.isApproved = true;
    }

    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatar_color: user.avatar_color, isApproved: user.isApproved } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only route: Export requireAdmin for use in other routes
router.requireAdmin = requireAdmin;

module.exports = router;
