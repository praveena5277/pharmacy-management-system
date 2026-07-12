const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/reports/summary
router.get('/summary', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  
  try {
    const summary = await db.reports.getSummary(startDate, endDate);
    res.json(summary);
  } catch (err) {
    console.error('Error generating report summary:', err);
    res.status(500).json({ message: 'Failed to generate report summaries.' });
  }
});

module.exports = router;
