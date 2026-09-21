const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db');
const { router: authRouter } = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const medicinesRouter = require('./routes/medicines');
const suppliersRouter = require('./routes/suppliers');
const customersRouter = require('./routes/customers');
const purchasesRouter = require('./routes/purchases');
const salesRouter = require('./routes/sales');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/reports', reportsRouter);

// Fallback for SPA routing: serve index.html for any other requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after DB setup
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 [Server] Pharmacy Management System running on http://localhost:${PORT}`);
  });
}

startServer();
