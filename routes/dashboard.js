const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/dashboard/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.dashboard.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Failed to retrieve dashboard statistics.' });
  }
});

module.exports = router;
