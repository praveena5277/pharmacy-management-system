const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/medicines (All medicines)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const meds = await db.medicines.getAll();
    res.json(meds);
  } catch (err) {
    console.error('Error fetching medicines:', err);
    res.status(500).json({ message: 'Failed to retrieve medicines inventory.' });
  }
});

// GET: /api/medicines/low-stock (Low stock alerts)
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const meds = await db.medicines.getLowStock();
    res.json(meds);
  } catch (err) {
    console.error('Error fetching low stock medicines:', err);
    res.status(500).json({ message: 'Failed to retrieve low stock alerts.' });
  }
});

// GET: /api/medicines/:id (Single medicine)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const med = await db.medicines.getById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    res.json(med);
  } catch (err) {
    console.error('Error fetching medicine details:', err);
    res.status(500).json({ message: 'Failed to retrieve medicine details.' });
  }
});

// POST: /api/medicines (Add new medicine)
router.post('/', authenticateToken, async (req, res) => {
  const { name, generic_name, category, strength, unit, price, cost_price, stock_quantity, min_stock_level, expiry_date, supplier_id } = req.body;

  if (!name || !generic_name || !price || !cost_price) {
    return res.status(400).json({ message: 'Name, generic name, price, and cost price are required.' });
  }

  try {
    const newMed = await db.medicines.create(req.body);
    res.status(201).json(newMed);
  } catch (err) {
    console.error('Error creating medicine:', err);
    res.status(500).json({ message: 'Failed to add new medicine.' });
  }
});

// PUT: /api/medicines/:id (Update medicine)
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, generic_name, price, cost_price } = req.body;

  if (!name || !generic_name || !price || !cost_price) {
    return res.status(400).json({ message: 'Name, generic name, price, and cost price are required.' });
  }

  try {
    const updatedMed = await db.medicines.update(req.params.id, req.body);
    if (!updatedMed) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    res.json(updatedMed);
  } catch (err) {
    console.error('Error updating medicine:', err);
    res.status(500).json({ message: 'Failed to update medicine.' });
  }
});

// DELETE: /api/medicines/:id (Delete medicine)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.medicines.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    res.json({ message: 'Medicine deleted successfully.' });
  } catch (err) {
    console.error('Error deleting medicine:', err);
    res.status(500).json({ message: 'Failed to delete medicine.' });
  }
});

module.exports = router;
