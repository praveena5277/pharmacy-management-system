const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/sales (All sales records)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sales = await db.sales.getAll();
    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ message: 'Failed to retrieve sales transactions.' });
  }
});

// GET: /api/sales/invoice/:id (Fetch detailed receipt data)
router.get('/invoice/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await db.sales.getById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }
    res.json(invoice);
  } catch (err) {
    console.error('Error fetching invoice details:', err);
    res.status(500).json({ message: 'Failed to retrieve invoice details.' });
  }
});

// POST: /api/sales (Submit new sale / bill transaction)
router.post('/', authenticateToken, async (req, res) => {
  const { customer_id, sale_date, discount, tax, payment_type, items } = req.body;

  if (!sale_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Sale date and item list are required.' });
  }

  // Validate items
  for (let item of items) {
    if (!item.medicine_id || !item.quantity) {
      return res.status(400).json({ message: 'Each item must include medicine_id and quantity.' });
    }
  }

  try {
    const result = await db.sales.create({
      customer_id: customer_id || 1, // fallback to walking customer
      sale_date,
      discount: discount || 0,
      tax: tax || 0,
      payment_type: payment_type || 'Cash',
      items
    });
    res.status(201).json({ message: 'Sale completed successfully', ...result });
  } catch (err) {
    console.error('Error recording sale:', err);
    res.status(400).json({ message: err.message || 'Failed to process sale transaction.' });
  }
});

module.exports = router;
