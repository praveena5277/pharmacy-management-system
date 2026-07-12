const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/purchases (All purchase records)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const purchases = await db.purchases.getAll();
    res.json(purchases);
  } catch (err) {
    console.error('Error fetching purchases:', err);
    res.status(500).json({ message: 'Failed to retrieve purchase transactions.' });
  }
});

// POST: /api/purchases (Create new purchase entry)
router.post('/', authenticateToken, async (req, res) => {
  const { supplier_id, purchase_date, items } = req.body;

  if (!supplier_id || !purchase_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Supplier ID, purchase date, and list of medicines are required.' });
  }

  // Validate items structure
  for (let item of items) {
    if (!item.medicine_id || !item.quantity || !item.cost_price) {
      return res.status(400).json({ message: 'Each purchased item must include medicine_id, quantity, and cost_price.' });
    }
  }

  try {
    const result = await db.purchases.create({ supplier_id, purchase_date, items });
    res.status(201).json({ message: 'Purchase registered successfully', ...result });
  } catch (err) {
    console.error('Error recording purchase:', err);
    res.status(500).json({ message: 'Failed to save purchase details.' });
  }
});

module.exports = router;
