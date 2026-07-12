const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/suppliers (All suppliers)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await db.suppliers.getAll();
    res.json(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    res.status(500).json({ message: 'Failed to retrieve suppliers list.' });
  }
});

// GET: /api/suppliers/:id (Single supplier)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await db.suppliers.getById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }
    res.json(supplier);
  } catch (err) {
    console.error('Error fetching supplier details:', err);
    res.status(500).json({ message: 'Failed to retrieve supplier details.' });
  }
});

// POST: /api/suppliers (Add new supplier)
router.post('/', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Supplier name is required.' });
  }

  try {
    const newSupplier = await db.suppliers.create(req.body);
    res.status(201).json(newSupplier);
  } catch (err) {
    console.error('Error creating supplier:', err);
    res.status(500).json({ message: 'Failed to add supplier.' });
  }
});

// PUT: /api/suppliers/:id (Update supplier)
router.put('/:id', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Supplier name is required.' });
  }

  try {
    const updatedSupplier = await db.suppliers.update(req.params.id, req.body);
    if (!updatedSupplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }
    res.json(updatedSupplier);
  } catch (err) {
    console.error('Error updating supplier:', err);
    res.status(500).json({ message: 'Failed to update supplier details.' });
  }
});

// DELETE: /api/suppliers/:id (Delete supplier)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.suppliers.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }
    res.json({ message: 'Supplier deleted successfully.' });
  } catch (err) {
    console.error('Error deleting supplier:', err);
    res.status(500).json({ message: 'Failed to delete supplier.' });
  }
});

module.exports = router;
