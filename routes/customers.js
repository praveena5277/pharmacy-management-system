const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET: /api/customers (All customers)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customers = await db.customers.getAll();
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Failed to retrieve customers list.' });
  }
});

// GET: /api/customers/:id (Single customer)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await db.customers.getById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ message: 'Failed to retrieve customer details.' });
  }
});

// POST: /api/customers (Add new customer)
router.post('/', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Customer name is required.' });
  }

  try {
    const newCustomer = await db.customers.create(req.body);
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ message: 'Failed to add customer.' });
  }
});

// PUT: /api/customers/:id (Update customer)
router.put('/:id', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Customer name is required.' });
  }

  try {
    const updatedCustomer = await db.customers.update(req.params.id, req.body);
    if (!updatedCustomer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    res.json(updatedCustomer);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ message: 'Failed to update customer details.' });
  }
});

// DELETE: /api/customers/:id (Delete customer)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.customers.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    res.json({ message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ message: err.message || 'Failed to delete customer.' });
  }
});

module.exports = router;
