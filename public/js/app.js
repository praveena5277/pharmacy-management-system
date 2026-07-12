// Aegis Rx - Application Coordinator Module
const state = {
  user: null,
  medicines: [],
  suppliers: [],
  customers: [],
  posCart: [],
  purchaseGrid: [], // rows of new purchase order
  activePanel: 'dashboard'
};

// ==========================================
// 1. INITIALIZATION & AUTHENTICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupTheme();
  setupDateTimeWidget();
  attachGlobalEventListeners();
  
  // Check if token exists
  const token = api.getToken();
  if (token) {
    try {
      const data = await api.auth.me();
      state.user = data.user;
      updateDatabaseBadge(data.dbMode);
      showWorkspace();
      loadPanelData(state.activePanel);
    } catch (err) {
      console.log('Saved token is invalid. Showing login screen.');
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('app-workspace').classList.add('hidden');
  state.user = null;
}

function showWorkspace() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('app-workspace').classList.remove('hidden');
  
  // Update user avatar & names
  if (state.user) {
    document.getElementById('sidebar-username').textContent = state.user.username;
    document.getElementById('sidebar-role').textContent = state.user.role.toUpperCase();
    document.getElementById('sidebar-user-avatar').textContent = state.user.username.charAt(0).toUpperCase();
  }
  
  lucide.createIcons();
}

function updateDatabaseBadge(mode) {
  const badge = document.getElementById('db-mode-badge');
  if (mode === 'mysql') {
    badge.textContent = 'Live (MySQL)';
    badge.className = 'db-mode-badge mysql-badge';
  } else {
    badge.textContent = 'Demo Mode (Mock)';
    badge.className = 'db-mode-badge mock-badge';
  }
}

function setupTheme() {
  const theme = localStorage.getItem('aegis_theme') || 'dark';
  if (theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }
  charts.updateChartsTheme();
}

function setupDateTimeWidget() {
  const widget = document.getElementById('current-datetime');
  function updateTime() {
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    widget.textContent = now.toLocaleDateString('en-US', options);
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// Global API Unauthorized listener
window.addEventListener('api-unauthorized', (e) => {
  ui.showToast(e.detail || 'Session expired. Please log in again.', 'error');
  showLoginScreen();
});

// ==========================================
// 2. NAV & PANEL ROUTER
// ==========================================
function switchPanel(panelId) {
  state.activePanel = panelId;
  
  // Update sidebar links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.panel === panelId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update panels display
  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `panel-${panelId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Update navbar title
  const titleMap = {
    dashboard: 'Dashboard Overview',
    medicines: 'Medicine Stock Inventory',
    pos: 'Sales & Billing POS Terminal',
    purchases: 'Supplier Purchases Ledger',
    suppliers: 'Supplier Accounts Directory',
    customers: 'Customer Accounts Directory',
    reports: 'Business & Analytical Reports'
  };
  document.getElementById('panel-title').textContent = titleMap[panelId] || 'Dashboard';
  
  // Load data for panel
  loadPanelData(panelId);
}

async function loadPanelData(panelId) {
  try {
    if (panelId === 'dashboard') {
      const stats = await api.dashboard.getStats();
      document.getElementById('stat-sales').textContent = `$${stats.totalSales.toFixed(2)}`;
      document.getElementById('stat-purchases').textContent = `$${stats.totalPurchases.toFixed(2)}`;
      document.getElementById('stat-medicines').textContent = stats.medicinesCount;
      document.getElementById('stat-low-stock').textContent = stats.lowStockCount;
      
      // Low stock medicines
      const lowStockMeds = await api.medicines.getLowStock();
      ui.renderDashboardTables(lowStockMeds, stats.activityFeed);
      
      // Load charts data from reports API for default 30 days
      const reportSum = await api.reports.getSummary();
      charts.renderSalesPurchasesTrend('chart-sales-purchases', reportSum.chartTrend);
      charts.renderTopMedicines('chart-top-medicines', reportSum.topMedicines);
    }
    
    else if (panelId === 'medicines') {
      state.medicines = await api.medicines.getAll();
      state.suppliers = await api.suppliers.getAll();
      ui.populateSupplierDropdowns(state.suppliers);
      filterMedicinesGrid();
    }
    
    else if (panelId === 'pos') {
      state.medicines = await api.medicines.getAll();
      state.customers = await api.customers.getAll();
      ui.populateCustomerDropdowns(state.customers);
      filterPOSMedicineCatalog();
      ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);
    }
    
    else if (panelId === 'purchases') {
      // Refresh options
      state.suppliers = await api.suppliers.getAll();
      ui.populateSupplierDropdowns(state.suppliers);
      
      // Default to history
      const purchases = await api.purchases.getAll();
      ui.renderPurchasesTable(purchases);

      // Reset new purchase order form if empty
      if (state.purchaseGrid.length === 0) {
        state.medicines = await api.medicines.getAll();
        addNewPurchaseGridRow();
      }
    }
    
    else if (panelId === 'suppliers') {
      state.suppliers = await api.suppliers.getAll();
      ui.renderSuppliersTable(state.suppliers, openEditSupplierModal, deleteSupplier);
    }
    
    else if (panelId === 'customers') {
      state.customers = await api.customers.getAll();
      ui.renderCustomersTable(state.customers, openEditCustomerModal, deleteCustomer);
    }
    
    else if (panelId === 'reports') {
      // Set default report dates to past 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      document.getElementById('reports-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
      document.getElementById('reports-end-date').value = today.toISOString().split('T')[0];
      
      generateReportSummary();
    }
  } catch (err) {
    ui.showToast('Failed to sync data with server: ' + err.message, 'error');
  }
}

// ==========================================
// 3. LISTENERS & FORMS INTERCEPTORS
// ==========================================
function attachGlobalEventListeners() {
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('aegis_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('aegis_theme', 'dark');
    }
    charts.updateChartsTheme();
  });

  // Login form submission
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('login-username').value.trim();
    const passVal = document.getElementById('login-password').value;

    try {
      const data = await api.auth.login(userVal, passVal);
      state.user = data.user;
      updateDatabaseBadge(data.dbMode);
      ui.showToast('Authentication successful. Welcome back!');
      
      // Reset form
      document.getElementById('login-username').value = '';
      document.getElementById('login-password').value = '';
      
      showWorkspace();
      switchPanel('dashboard');
    } catch (err) {
      ui.showToast(err.message || 'Invalid username or password.', 'error');
    }
  });

  // Sign out button
  document.getElementById('logout-btn').addEventListener('click', () => {
    api.clearToken();
    ui.showToast('Signed out successfully.');
    showLoginScreen();
  });

  // Navigation clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = e.currentTarget.dataset.panel;
      switchPanel(panel);
    });
  });

  // Click dashboard low stock card
  document.getElementById('stat-low-stock-card').addEventListener('click', () => {
    switchPanel('medicines');
    document.getElementById('medicines-filter-stock').value = 'low';
    filterMedicinesGrid();
  });

  // Click dashboard low stock manage btn
  document.getElementById('view-all-low-stock-btn').addEventListener('click', () => {
    switchPanel('medicines');
    document.getElementById('medicines-filter-stock').value = 'low';
    filterMedicinesGrid();
  });

  // Modals closing triggers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mId = e.currentTarget.dataset.close;
      ui.toggleModal(mId, false);
    });
  });

  // Closing modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        ui.toggleModal(overlay.id, false);
      }
    });
  });

  // Print invoice modal print button
  document.getElementById('print-invoice-btn').addEventListener('click', () => {
    window.print();
  });

  // --- MEDICINES MANAGEMENT LISTENERS ---
  document.getElementById('add-medicine-btn').addEventListener('click', openAddMedicineModal);
  document.getElementById('medicines-search').addEventListener('input', filterMedicinesGrid);
  document.getElementById('medicines-filter-category').addEventListener('change', filterMedicinesGrid);
  document.getElementById('medicines-filter-stock').addEventListener('change', filterMedicinesGrid);
  document.getElementById('medicine-form').addEventListener('submit', saveMedicine);

  // --- SUPPLIERS MANAGEMENT LISTENERS ---
  document.getElementById('add-supplier-btn').addEventListener('click', openAddSupplierModal);
  document.getElementById('suppliers-search').addEventListener('input', filterSuppliersGrid);
  document.getElementById('supplier-form').addEventListener('submit', saveSupplier);

  // --- CUSTOMERS MANAGEMENT LISTENERS ---
  document.getElementById('add-customer-btn').addEventListener('click', openAddCustomerModal);
  document.getElementById('customers-search').addEventListener('input', filterCustomersGrid);
  document.getElementById('customer-form').addEventListener('submit', saveCustomer);

  // --- POS TERMINAL LISTENERS ---
  document.getElementById('pos-med-search').addEventListener('input', filterPOSMedicineCatalog);
  document.getElementById('pos-discount').addEventListener('input', () => {
    ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);
  });
  document.getElementById('pos-tax').addEventListener('input', () => {
    ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);
  });
  document.getElementById('pos-checkout-btn').addEventListener('click', processPOSCheckout);
  document.getElementById('add-pos-customer-btn').addEventListener('click', () => {
    openAddCustomerModal();
  });

  // --- PURCHASES PANEL LISTENERS ---
  document.querySelectorAll('#panel-purchases .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Toggle active classes
      document.querySelectorAll('#panel-purchases .tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const targetTab = e.currentTarget.dataset.tab;
      document.querySelectorAll('#panel-purchases .tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  document.getElementById('add-purchase-row-btn').addEventListener('click', addNewPurchaseGridRow);
  document.getElementById('purchase-form').addEventListener('submit', commitPurchaseOrder);

  // --- REPORTS LISTENERS ---
  document.getElementById('reports-filter-btn').addEventListener('click', generateReportSummary);
  document.getElementById('reports-export-btn').addEventListener('click', exportReportsCSV);
  document.getElementById('reports-print-btn').addEventListener('click', () => {
    window.print();
  });
}

// ==========================================
// 4. MEDICINES MODULE LOGIC
// ==========================================
function openAddMedicineModal() {
  document.getElementById('medicine-modal-title').textContent = 'Add Medicine';
  document.getElementById('medicine-id').value = '';
  document.getElementById('medicine-form').reset();
  
  // Set default expiry date (1 year from now)
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  document.getElementById('med-expiry').value = d.toISOString().split('T')[0];

  ui.toggleModal('medicine-modal', true);
}

async function openEditMedicineModal(id) {
  try {
    const med = await api.medicines.getById(id);
    document.getElementById('medicine-modal-title').textContent = 'Edit Medicine';
    document.getElementById('medicine-id').value = med.id;
    document.getElementById('med-name').value = med.name;
    document.getElementById('med-generic').value = med.generic_name;
    document.getElementById('med-category').value = med.category || '';
    document.getElementById('med-strength').value = med.strength || '';
    document.getElementById('med-unit').value = med.unit || '';
    document.getElementById('med-supplier').value = med.supplier_id || '';
    document.getElementById('med-price').value = med.price;
    document.getElementById('med-cost').value = med.cost_price;
    document.getElementById('med-stock').value = med.stock_quantity;
    document.getElementById('med-min-stock').value = med.min_stock_level;
    document.getElementById('med-expiry').value = med.expiry_date ? med.expiry_date.split('T')[0] : '';
    
    ui.toggleModal('medicine-modal', true);
  } catch (err) {
    ui.showToast('Failed to fetch medicine details: ' + err.message, 'error');
  }
}

async function saveMedicine(e) {
  e.preventDefault();
  const id = document.getElementById('medicine-id').value;
  const medData = {
    name: document.getElementById('med-name').value.trim(),
    generic_name: document.getElementById('med-generic').value.trim(),
    category: document.getElementById('med-category').value.trim(),
    strength: document.getElementById('med-strength').value.trim(),
    unit: document.getElementById('med-unit').value.trim(),
    supplier_id: document.getElementById('med-supplier').value || null,
    price: parseFloat(document.getElementById('med-price').value),
    cost_price: parseFloat(document.getElementById('med-cost').value),
    stock_quantity: parseInt(document.getElementById('med-stock').value),
    min_stock_level: parseInt(document.getElementById('med-min-stock').value),
    expiry_date: document.getElementById('med-expiry').value
  };

  try {
    if (id) {
      await api.medicines.update(id, medData);
      ui.showToast('Medicine updated successfully.');
    } else {
      await api.medicines.create(medData);
      ui.showToast('New medicine added to inventory.');
    }
    ui.toggleModal('medicine-modal', false);
    loadPanelData('medicines');
  } catch (err) {
    ui.showToast('Failed to save medicine: ' + err.message, 'error');
  }
}

async function deleteMedicine(id) {
  if (confirm('Are you sure you want to delete this medicine? This operation cannot be undone.')) {
    try {
      await api.medicines.delete(id);
      ui.showToast('Medicine deleted successfully.');
      loadPanelData('medicines');
    } catch (err) {
      ui.showToast('Failed to delete medicine: ' + err.message, 'error');
    }
  }
}

function filterMedicinesGrid() {
  const query = document.getElementById('medicines-search').value.toLowerCase();
  const categoryFilter = document.getElementById('medicines-filter-category').value;
  const stockFilter = document.getElementById('medicines-filter-stock').value;

  const today = new Date().toISOString().split('T')[0];

  // Compile categories options if not populated
  const catSelect = document.getElementById('medicines-filter-category');
  if (catSelect.options.length <= 1) {
    const cats = [...new Set(state.medicines.map(m => m.category).filter(Boolean))].sort();
    catSelect.innerHTML = `<option value="">All Categories</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  const filtered = state.medicines.filter(med => {
    // Search filter
    const matchesSearch = med.name.toLowerCase().includes(query) || 
                          med.generic_name.toLowerCase().includes(query) || 
                          (med.category && med.category.toLowerCase().includes(query));
    
    // Category filter
    const matchesCategory = !categoryFilter || med.category === categoryFilter;

    // Stock status filter
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = med.stock_quantity <= med.min_stock_level;
    } else if (stockFilter === 'out') {
      matchesStock = med.stock_quantity <= 0;
    } else if (stockFilter === 'expired') {
      const expDate = med.expiry_date ? med.expiry_date.split('T')[0] : '';
      matchesStock = expDate && expDate < today;
    } else if (stockFilter === 'nearexpiry') {
      const expDate = med.expiry_date ? med.expiry_date.split('T')[0] : '';
      if (expDate) {
        const days = Math.ceil((new Date(expDate) - new Date()) / (1000 * 60 * 60 * 24));
        matchesStock = days > 0 && days <= 60;
      } else {
        matchesStock = false;
      }
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  ui.renderMedicinesTable(filtered, openEditMedicineModal, deleteMedicine);
}

// ==========================================
// 5. SUPPLIERS LOGIC
// ==========================================
function openAddSupplierModal() {
  document.getElementById('supplier-modal-title').textContent = 'Add Supplier';
  document.getElementById('supplier-id').value = '';
  document.getElementById('supplier-form').reset();
  ui.toggleModal('supplier-modal', true);
}

async function openEditSupplierModal(id) {
  try {
    const sup = await api.suppliers.getById(id);
    document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
    document.getElementById('supplier-id').value = sup.id;
    document.getElementById('sup-name').value = sup.name;
    document.getElementById('sup-contact').value = sup.contact_person || '';
    document.getElementById('sup-phone').value = sup.phone || '';
    document.getElementById('sup-email').value = sup.email || '';
    document.getElementById('sup-address').value = sup.address || '';
    
    ui.toggleModal('supplier-modal', true);
  } catch (err) {
    ui.showToast('Failed to fetch supplier details: ' + err.message, 'error');
  }
}

async function saveSupplier(e) {
  e.preventDefault();
  const id = document.getElementById('supplier-id').value;
  const supData = {
    name: document.getElementById('sup-name').value.trim(),
    contact_person: document.getElementById('sup-contact').value.trim(),
    phone: document.getElementById('sup-phone').value.trim(),
    email: document.getElementById('sup-email').value.trim(),
    address: document.getElementById('sup-address').value.trim()
  };

  try {
    if (id) {
      await api.suppliers.update(id, supData);
      ui.showToast('Supplier details updated.');
    } else {
      await api.suppliers.create(supData);
      ui.showToast('New supplier registered.');
    }
    ui.toggleModal('supplier-modal', false);
    loadPanelData('suppliers');
  } catch (err) {
    ui.showToast('Failed to save supplier: ' + err.message, 'error');
  }
}

async function deleteSupplier(id) {
  if (confirm('Are you sure you want to delete this supplier? Associated medicines will have their default suppliers cleared.')) {
    try {
      await api.suppliers.delete(id);
      ui.showToast('Supplier deleted successfully.');
      loadPanelData('suppliers');
    } catch (err) {
      ui.showToast('Failed to delete supplier: ' + err.message, 'error');
    }
  }
}

function filterSuppliersGrid() {
  const query = document.getElementById('suppliers-search').value.toLowerCase();
  const filtered = state.suppliers.filter(sup => {
    return sup.name.toLowerCase().includes(query) || 
           (sup.contact_person && sup.contact_person.toLowerCase().includes(query)) ||
           (sup.phone && sup.phone.includes(query)) ||
           (sup.email && sup.email.toLowerCase().includes(query));
  });
  ui.renderSuppliersTable(filtered, openEditSupplierModal, deleteSupplier);
}

// ==========================================
// 6. CUSTOMERS LOGIC
// ==========================================
function openAddCustomerModal() {
  document.getElementById('customer-modal-title').textContent = 'Add Customer';
  document.getElementById('customer-id').value = '';
  document.getElementById('customer-form').reset();
  ui.toggleModal('customer-modal', true);
}

async function openEditCustomerModal(id) {
  try {
    const cust = await api.customers.getById(id);
    document.getElementById('customer-modal-title').textContent = 'Edit Customer';
    document.getElementById('customer-id').value = cust.id;
    document.getElementById('cust-name').value = cust.name;
    document.getElementById('cust-phone').value = cust.phone || '';
    document.getElementById('cust-email').value = cust.email || '';
    document.getElementById('cust-address').value = cust.address || '';
    
    ui.toggleModal('customer-modal', true);
  } catch (err) {
    ui.showToast('Failed to fetch customer details: ' + err.message, 'error');
  }
}

async function saveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('customer-id').value;
  const custData = {
    name: document.getElementById('cust-name').value.trim(),
    phone: document.getElementById('cust-phone').value.trim(),
    email: document.getElementById('cust-email').value.trim(),
    address: document.getElementById('cust-address').value.trim()
  };

  try {
    if (id) {
      await api.customers.update(id, custData);
      ui.showToast('Customer details updated.');
    } else {
      const newCust = await api.customers.create(custData);
      ui.showToast('New customer record created.');
      
      // If we added customer while on POS panel, refresh pos customer options and auto-select
      if (state.activePanel === 'pos') {
        state.customers = await api.customers.getAll();
        ui.populateCustomerDropdowns(state.customers);
        document.getElementById('pos-customer-select').value = newCust.id;
      }
    }
    ui.toggleModal('customer-modal', false);
    if (state.activePanel === 'customers') {
      loadPanelData('customers');
    }
  } catch (err) {
    ui.showToast('Failed to save customer: ' + err.message, 'error');
  }
}

async function deleteCustomer(id) {
  if (confirm('Delete customer account?')) {
    try {
      await api.customers.delete(id);
      ui.showToast('Customer account deleted.');
      loadPanelData('customers');
    } catch (err) {
      ui.showToast(err.message || 'Failed to delete customer.', 'error');
    }
  }
}

function filterCustomersGrid() {
  const query = document.getElementById('customers-search').value.toLowerCase();
  const filtered = state.customers.filter(c => {
    return c.name.toLowerCase().includes(query) || 
           (c.phone && c.phone.includes(query)) ||
           (c.email && c.email.toLowerCase().includes(query));
  });
  ui.renderCustomersTable(filtered, openEditCustomerModal, deleteCustomer);
}

// ==========================================
// 7. POINT OF SALE (POS) & BILLING TERMINAL
// ==========================================
function filterPOSMedicineCatalog() {
  const query = document.getElementById('pos-med-search').value.toLowerCase();
  const filtered = state.medicines.filter(med => {
    return med.name.toLowerCase().includes(query) || 
           med.generic_name.toLowerCase().includes(query) ||
           (med.category && med.category.toLowerCase().includes(query));
  });
  ui.renderPOSMedicineCatalog(filtered, addPOSCartItem);
}

function addPOSCartItem(id) {
  const med = state.medicines.find(m => m.id === parseInt(id));
  if (!med) return;

  if (med.stock_quantity <= 0) {
    ui.showToast(`Medicine ${med.name} is currently out of stock.`, 'error');
    return;
  }

  // Check if item already exists in cart
  const cartItem = state.posCart.find(item => item.medicine_id === med.id);
  if (cartItem) {
    if (cartItem.quantity < med.stock_quantity) {
      cartItem.quantity += 1;
      ui.showToast(`Increased quantity for ${med.name}`);
    } else {
      ui.showToast(`Cannot add more. Only ${med.stock_quantity} available in stock.`, 'warning');
    }
  } else {
    state.posCart.push({
      medicine_id: med.id,
      name: med.name,
      strength: med.strength,
      price: med.price,
      quantity: 1,
      stock_quantity: med.stock_quantity
    });
    ui.showToast(`${med.name} added to cart.`);
  }

  ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);
}

function updatePOSCartQty(id, newQty) {
  const item = state.posCart.find(i => i.medicine_id === parseInt(id));
  if (item) {
    item.quantity = parseInt(newQty);
    ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);
  }
}

function removePOSCartItem(id) {
  const idx = state.posCart.findIndex(i => i.medicine_id === parseInt(id));
  if (idx !== -1) {
    ui.showToast(`${state.posCart[idx].name} removed from cart.`, 'warning');
    state.posCart.splice(idx, 1);
    ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);
  }
}

async function processPOSCheckout() {
  if (state.posCart.length === 0) return;

  const customer_id = document.getElementById('pos-customer-select').value;
  const sale_date = new Date().toISOString().split('T')[0]; // today
  const discount = parseFloat(document.getElementById('pos-discount').value || 0);
  const tax = parseFloat(document.getElementById('pos-tax').value || 0);
  const payment_type = document.getElementById('pos-payment-type').value;

  const items = state.posCart.map(item => ({
    medicine_id: item.medicine_id,
    quantity: item.quantity
  }));

  try {
    const res = await api.sales.create({
      customer_id,
      sale_date,
      discount,
      tax,
      payment_type,
      items
    });

    ui.showToast('Sale checkout transaction saved successfully.');
    
    // Clear cart fields
    state.posCart = [];
    document.getElementById('pos-discount').value = '0';
    document.getElementById('pos-tax').value = '0';
    ui.renderPOSCart(state.posCart, updatePOSCartQty, removePOSCartItem);

    // Retrieve full invoice metadata and render printable invoice modal
    const invoiceDetail = await api.sales.getInvoice(res.id);
    ui.renderInvoice(invoiceDetail);

    // Refresh stocks
    state.medicines = await api.medicines.getAll();
    filterPOSMedicineCatalog();
  } catch (err) {
    ui.showToast('Failed to checkout sale: ' + err.message, 'error');
  }
}

// ==========================================
// 8. PURCHASES (REPLENISHMENT) ENTRY
// ==========================================
function addNewPurchaseGridRow() {
  const tbody = document.getElementById('purchase-items-body');
  if (!tbody) return;

  const rowId = Date.now() + Math.random().toString(36).substring(2, 7);
  
  const tr = document.createElement('tr');
  tr.id = `purchase-row-${rowId}`;
  tr.className = 'purchase-item-row';

  // Construct medicines select options
  const medOptions = state.medicines.map(m => `<option value="${m.id}" data-cost="${m.cost_price}">${m.name} (${m.strength})</option>`).join('');

  tr.innerHTML = `
    <td>
      <select class="p-med-select" required>
        <option value="">Choose medicine...</option>
        ${medOptions}
      </select>
    </td>
    <td class="qty-col">
      <input type="number" class="p-med-qty" min="1" value="10" required>
    </td>
    <td>
      <input type="number" class="p-med-cost" step="0.01" min="0" value="0.00" required>
    </td>
    <td>
      <input type="date" class="p-med-expiry" required>
    </td>
    <td>
      <strong class="p-med-subtotal">$0.00</strong>
    </td>
    <td class="text-right">
      <button type="button" class="btn-table-action btn-table-action-delete p-remove-row-btn"><i data-lucide="trash-2"></i></button>
    </td>
  `;

  tbody.appendChild(tr);
  lucide.createIcons();

  // Attach change listeners to compute rows dynamically
  const select = tr.querySelector('.p-med-select');
  const qtyInput = tr.querySelector('.p-med-qty');
  const costInput = tr.querySelector('.p-med-cost');
  const removeBtn = tr.querySelector('.p-remove-row-btn');

  // Set default expiry date in row (1 year from now)
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  tr.querySelector('.p-med-expiry').value = d.toISOString().split('T')[0];

  select.addEventListener('change', () => {
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.dataset.cost) {
      costInput.value = parseFloat(selectedOption.dataset.cost).toFixed(2);
    }
    updatePurchaseTotalSum();
  });

  qtyInput.addEventListener('input', updatePurchaseTotalSum);
  costInput.addEventListener('input', updatePurchaseTotalSum);
  
  removeBtn.addEventListener('click', () => {
    tr.remove();
    updatePurchaseTotalSum();
  });

  updatePurchaseTotalSum();
}

function updatePurchaseTotalSum() {
  const rows = document.querySelectorAll('.purchase-item-row');
  let totalSum = 0;

  rows.forEach(row => {
    const qty = parseInt(row.querySelector('.p-med-qty').value || 0);
    const cost = parseFloat(row.querySelector('.p-med-cost').value || 0);
    const subtotal = qty * cost;
    totalSum += subtotal;

    row.querySelector('.p-med-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  });

  document.getElementById('purchase-total-display').textContent = `$${totalSum.toFixed(2)}`;
  
  // Enable submit if at least 1 row exists with valid medicine selection
  const validRows = Array.from(rows).filter(row => row.querySelector('.p-med-select').value !== '');
  document.getElementById('submit-purchase-btn').disabled = (validRows.length === 0);
}

async function commitPurchaseOrder(e) {
  e.preventDefault();
  const supplier_id = document.getElementById('purchase-supplier').value;
  const purchase_date = document.getElementById('purchase-date').value;

  if (!supplier_id || !purchase_date) {
    ui.showToast('Please select a supplier and purchase date.', 'warning');
    return;
  }

  const rows = document.querySelectorAll('.purchase-item-row');
  const items = [];

  rows.forEach(row => {
    const medicine_id = row.querySelector('.p-med-select').value;
    const quantity = parseInt(row.querySelector('.p-med-qty').value);
    const cost_price = parseFloat(row.querySelector('.p-med-cost').value);
    const expiry_date = row.querySelector('.p-med-expiry').value;

    if (medicine_id && quantity && cost_price) {
      items.push({ medicine_id, quantity, cost_price, expiry_date });
    }
  });

  if (items.length === 0) {
    ui.showToast('Please add at least one valid medicine to buy.', 'warning');
    return;
  }

  try {
    await api.purchases.create({ supplier_id, purchase_date, items });
    ui.showToast('Purchase order saved. Stocks have been updated.');
    
    // Clear forms and state
    document.getElementById('purchase-supplier').value = '';
    document.getElementById('purchase-items-body').innerHTML = '';
    
    // Re-seed grid row
    state.purchaseGrid = [];
    addNewPurchaseGridRow();
    
    // Switch to history tab
    document.querySelector('.tab-btn[data-tab="purchase-history"]').click();
    loadPanelData('purchases');
  } catch (err) {
    ui.showToast('Failed to save purchase: ' + err.message, 'error');
  }
}

// ==========================================
// 9. ANALYTICS & REPORTS MODULE LOGIC
// ==========================================
async function generateReportSummary() {
  const start = document.getElementById('reports-start-date').value;
  const end = document.getElementById('reports-end-date').value;

  try {
    const summary = await api.reports.getSummary(start, end);
    
    // Set UI cards
    document.getElementById('report-sales-sum').textContent = `$${summary.salesTotal.toFixed(2)}`;
    document.getElementById('report-purchases-sum').textContent = `$${summary.purchasesTotal.toFixed(2)}`;
    
    const profit = summary.salesTotal - summary.purchasesTotal;
    const marginBadge = document.getElementById('report-profit-margin');
    marginBadge.textContent = `$${profit.toFixed(2)}`;
    marginBadge.className = 'total-big ' + (profit >= 0 ? 'text-success' : 'text-danger');

    // List top medicines
    const list = document.getElementById('report-top-meds-list');
    if (summary.topMedicines.length === 0) {
      list.innerHTML = `<li class="text-center text-muted">No medicine sales registered in this period.</li>`;
    } else {
      list.innerHTML = summary.topMedicines.map((m, idx) => `
        <li>
          <span class="flex-align">
            <span class="badge badge-pill badge-primary">${idx + 1}</span>
            <strong>${m.name}</strong>
          </span>
          <span class="badge badge-success">${m.quantity_sold} Sold</span>
        </li>
      `).join('');
    }
    lucide.createIcons();

    // Render reports chart trend
    charts.renderSalesPurchasesTrend('chart-reports-trend', summary.chartTrend);
  } catch (err) {
    ui.showToast('Failed to compile period reports: ' + err.message, 'error');
  }
}

async function exportReportsCSV() {
  const start = document.getElementById('reports-start-date').value;
  const end = document.getElementById('reports-end-date').value;

  try {
    const summary = await api.reports.getSummary(start, end);
    
    // Build CSV Content
    let csv = 'Aegis Rx Pharmacy Report\n';
    csv += `Period: ${summary.startDate} to ${summary.endDate}\n\n`;
    
    csv += 'SUMMARY FIGURES\n';
    csv += `Total Sales Revenue,$${summary.salesTotal.toFixed(2)}\n`;
    csv += `Total Purchases Cost,$${summary.purchasesTotal.toFixed(2)}\n`;
    csv += `Net Period Margin,$${(summary.salesTotal - summary.purchasesTotal).toFixed(2)}\n\n`;

    csv += 'DAILY TREND LOGS\n';
    csv += 'Date,Sales Revenue ($),Purchases Cost ($)\n';
    summary.chartTrend.forEach(t => {
      csv += `${t.date},${t.sales.toFixed(2)},${t.purchases.toFixed(2)}\n`;
    });
    csv += '\n';

    csv += 'TOP SELLING MEDICINES\n';
    csv += 'Rank,Medicine Name,Quantity Sold\n';
    summary.topMedicines.forEach((m, idx) => {
      csv += `${idx + 1},"${m.name}",${m.quantity_sold}\n`;
    });

    // Download Trigger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `AegisRx_Report_${summary.startDate}_to_${summary.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ui.showToast('CSV report exported and downloaded successfully.');
  } catch (err) {
    ui.showToast('Failed to export CSV: ' + err.message, 'error');
  }
}
