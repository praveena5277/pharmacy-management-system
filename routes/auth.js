const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pharmacy_token_key_12345';

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. Token missing.' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Session expired or invalid token.' });
    }
    req.user = user;
    next();
  });
}

// POST: /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide both username and password.' });
  }

  try {
    const user = await db.users.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const passwordMatch = (password === user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      dbMode: db.getMode()
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// GET: /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user, dbMode: db.getMode() });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: /api/auth/register (Admin Only)
router.post('/register', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only administrators can create new users.' });
  }

  const { username, password, email, role } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Username, password, and email are required.' });
  }

  try {
    const newUser = await db.users.create({ username, password, email, role });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = {
  router,
  authenticateToken
};
