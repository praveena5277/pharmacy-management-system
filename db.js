const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Global connection state
let isMockMode = process.env.USE_MOCK_DB === 'true';
let dbPool = null;

// ==========================================
// 1. IN-MEMORY MOCK DATABASE STATE & SEED DATA
// ==========================================
const mockDb = {
  users: [
    {
      id: 1,
      username: 'admin',
      password: 'admin123',
      email: 'admin@pharmacy.com',
      role: 'admin',
      created_at: new Date()
    },
    {
      id: 2,
      username: 'staff',
      password: 'staff123',
      email: 'staff@pharmacy.com',
      role: 'staff',
      created_at: new Date()
    }
  ],
  suppliers: [
    { id: 1, name: 'Apex Pharma Distributors', contact_person: 'John Doe', phone: '9876543210', email: 'contact@apexpharma.com', address: '123 Pharma Zone, Metro City', created_at: new Date() },
    { id: 2, name: 'Global Care Pharmaceuticals', contact_person: 'Sarah Smith', phone: '9876543211', email: 'sales@globalcare.com', address: '456 Health Way, Sector 4', created_at: new Date() },
    { id: 3, name: 'Biomed Lifesciences', contact_person: 'Robert Lee', phone: '9876543212', email: 'info@biomedlife.com', address: '789 Bio Lane, Tech Park', created_at: new Date() }
  ],
  customers: [
    { id: 1, name: 'Walking Customer', phone: '0000000000', email: 'walking@customer.com', address: 'N/A', created_at: new Date() },
    { id: 2, name: 'Alice Johnson', phone: '9822334455', email: 'alice@gmail.com', address: 'Apartment 4B, Hillview', created_at: new Date() },
    { id: 3, name: 'David Miller', phone: '9844556677', email: 'david@yahoo.com', address: 'Block C, Park Avenue', created_at: new Date() }
  ],
  medicines: [
    { id: 1, name: 'Paracetamol', generic_name: 'Acetaminophen', category: 'Analgesic', strength: '500mg', unit: 'Tablet', price: 5.50, cost_price: 3.50, stock_quantity: 120, min_stock_level: 25, expiry_date: '2027-12-31', supplier_id: 1, created_at: new Date() },
    { id: 2, name: 'Amoxicillin', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotic', strength: '250mg', unit: 'Capsule', price: 12.00, cost_price: 8.20, stock_quantity: 12, min_stock_level: 20, expiry_date: '2026-11-30', supplier_id: 1, created_at: new Date() },
    { id: 3, name: 'Cetirizine', generic_name: 'Cetirizine Hydrochloride', category: 'Antihistamine', strength: '10mg', unit: 'Tablet', price: 4.00, cost_price: 2.10, stock_quantity: 90, min_stock_level: 15, expiry_date: '2026-08-15', supplier_id: 2, created_at: new Date() },
    { id: 4, name: 'Atorvastatin', generic_name: 'Atorvastatin Calcium', category: 'Cardiovascular', strength: '20mg', unit: 'Tablet', price: 25.00, cost_price: 16.50, stock_quantity: 5, min_stock_level: 30, expiry_date: '2026-02-10', supplier_id: 2, created_at: new Date() },
    { id: 5, name: 'Ibuprofen', generic_name: 'Ibuprofen Acid', category: 'Analgesic', strength: '400mg', unit: 'Tablet', price: 7.50, cost_price: 4.20, stock_quantity: 85, min_stock_level: 20, expiry_date: '2025-06-01', supplier_id: 3, created_at: new Date() }, // Expired
    { id: 6, name: 'Metformin', generic_name: 'Metformin Hydrochloride', category: 'Antidiabetic', strength: '500mg', unit: 'Tablet', price: 9.00, cost_price: 5.50, stock_quantity: 0, min_stock_level: 40, expiry_date: '2027-01-20', supplier_id: 3, created_at: new Date() } // Out of stock
  ],
  purchases: [],
  purchase_details: [],
  sales: [],
  sale_details: []
};

// Seed initial mock purchase/sales data for dashboards & charts
(function seedMockHistory() {
  const today = new Date();
  
  // Create sales history for past 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Add a sale
    const sId = mockDb.sales.length + 1;
    const isToday = i === 0;
    const discount = isToday ? 5.00 : 2.00;
    const tax = isToday ? 8.50 : 4.80;
    const net = isToday ? 103.50 : 52.80;
    const total = net + discount - tax;
    
    mockDb.sales.push({
      id: sId,
      invoice_no: `INV-2026-${1000 + sId}`,
      customer_id: sId % 2 === 0 ? 2 : 1,
      sale_date: dateStr,
      total_amount: total,
      discount: discount,
      tax: tax,
      net_amount: net,
      payment_type: sId % 3 === 0 ? 'Card' : (sId % 3 === 1 ? 'UPI' : 'Cash'),
      created_at: date
    });
    
    mockDb.sale_details.push({
      id: mockDb.sale_details.length + 1,
      sale_id: sId,
      medicine_id: (sId % 3) + 1,
      quantity: isToday ? 4 : 2,
      sale_price: 12.00,
      total_price: isToday ? 48.00 : 24.00
    });

    // Add a purchase every other day
    if (i % 2 === 0) {
      const pId = mockDb.purchases.length + 1;
      const pTotal = isToday ? 150.00 : 85.00;
      mockDb.purchases.push({
        id: pId,
        purchase_no: `PUR-2026-${1000 + pId}`,
        supplier_id: (pId % 3) + 1,
        purchase_date: dateStr,
        total_amount: pTotal,
        created_at: date
      });
      
      mockDb.purchase_details.push({
        id: mockDb.purchase_details.length + 1,
        purchase_id: pId,
        medicine_id: (pId % 3) + 1,
        quantity: isToday ? 30 : 15,
        cost_price: 8.20,
        expiry_date: '2027-06-30',
        total_price: pTotal
      });
    }
  }
})();

// Hash mock passwords on load
mockDb.users.forEach(u => {
  u.password = bcrypt.hashSync(u.password, 10);
});

// ==========================================
// 2. DATABASE INITIALIZATION & CONNECTIVITY
// ==========================================
async function initDatabase() {
  if (isMockMode) {
    console.log('⚠️ [Database] USE_MOCK_DB is set to true. Initializing in In-Memory Mock Database mode.');
    return;
  }

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    connectTimeout: 5000 // fail fast
  };

  try {
    // Attempt first connection directly
    console.log(`🔌 [Database] Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
    
    // Check connection and ensure database exists
    const tempConnection = await mysql.createConnection(dbConfig);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'pharmacy_db'}\``);
    await tempConnection.end();

    // Create Pool
    dbPool = mysql.createPool({
      ...dbConfig,
      database: process.env.DB_NAME || 'pharmacy_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test pool connection
    const conn = await dbPool.getConnection();
    console.log('✅ [Database] MySQL connection pool established successfully.');
    conn.release();

    // Initialize Tables if empty
    await verifyAndCreateTables();
  } catch (err) {
    console.error('❌ [Database] MySQL Connection Failed:', err.message);
    console.log('⚠️ [Database] Falling back to In-Memory Mock Database mode. All changes will be lost on server restart.');
    isMockMode = true;
  }
}

async function verifyAndCreateTables() {
  try {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL,
        role ENUM('admin', 'staff') DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS medicines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        generic_name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        strength VARCHAR(20),
        unit VARCHAR(20),
        price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        min_stock_level INT DEFAULT 10,
        expiry_date DATE,
        supplier_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_no VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INT,
        purchase_date DATE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS purchase_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT,
        medicine_id INT,
        quantity INT NOT NULL,
        cost_price DECIMAL(10,2) NOT NULL,
        expiry_date DATE,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_no VARCHAR(50) NOT NULL UNIQUE,
        customer_id INT,
        sale_date DATE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0.00,
        tax DECIMAL(10,2) DEFAULT 0.00,
        net_amount DECIMAL(10,2) NOT NULL,
        payment_type ENUM('Cash', 'Card', 'UPI') DEFAULT 'Cash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sale_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT,
        medicine_id INT,
        quantity INT NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
      )`
    ];

    for (let tableSql of tables) {
      await dbPool.query(tableSql);
    }

    // Insert Default admin user if none exists
    const [rows] = await dbPool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      // Hashed admin123
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await dbPool.query(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin@pharmacy.com', 'admin']
      );
      // Hashed staff123
      const hashedStaffPassword = await bcrypt.hash('staff123', 10);
      await dbPool.query(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        ['staff', hashedStaffPassword, 'staff@pharmacy.com', 'staff']
      );
      console.log('✅ [Database] Default admin and staff accounts seeded in MySQL.');
    }
  } catch (err) {
    console.error('❌ [Database] Failed to setup MySQL database tables:', err.message);
  }
}

// ==========================================
// 3. DATA ACCESS OBJECT (DAO) APIS
// ==========================================

const db = {
  getMode: () => (isMockMode ? 'mock' : 'mysql'),

  // ---- USERS ROUTER INTERFACES ----
  users: {
    findByUsername: async (username) => {
      if (isMockMode) {
        return mockDb.users.find(u => u.username === username) || null;
      }
      const [rows] = await dbPool.query('SELECT * FROM users WHERE username = ?', [username]);
      return rows[0] || null;
    },
    findById: async (id) => {
      if (isMockMode) {
        const u = mockDb.users.find(u => u.id === id);
        if (u) {
          const { password, ...safeUser } = u;
          return safeUser;
        }
        return null;
      }
      const [rows] = await dbPool.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    },
    create: async ({ username, password, email, role }) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      if (isMockMode) {
        if (mockDb.users.some(u => u.username === username)) {
          throw new Error('Username already exists');
        }
        const newUser = {
          id: mockDb.users.length + 1,
          username,
          password: hashedPassword,
          email,
          role: role || 'staff',
          created_at: new Date()
        };
        mockDb.users.push(newUser);
        const { password: p, ...safeUser } = newUser;
        return safeUser;
      }
      try {
        const [result] = await dbPool.query(
          'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, email, role || 'staff']
        );
        return { id: result.insertId, username, email, role };
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw new Error('Username already exists');
        }
        throw err;
      }
    }
  },

  // ---- MEDICINES ROUTER INTERFACES ----
  medicines: {
    getAll: async () => {
      if (isMockMode) {
        // Join with supplier name
        return mockDb.medicines.map(m => {
          const s = mockDb.suppliers.find(sup => sup.id === m.supplier_id);
          return { ...m, supplier_name: s ? s.name : 'Unknown Supplier' };
        });
      }
      const [rows] = await dbPool.query(`
        SELECT m.*, s.name AS supplier_name 
        FROM medicines m 
        LEFT JOIN suppliers s ON m.supplier_id = s.id
        ORDER BY m.name ASC
      `);
      return rows;
    },
    getLowStock: async () => {
      if (isMockMode) {
        return mockDb.medicines
          .filter(m => m.stock_quantity <= m.min_stock_level)
          .map(m => {
            const s = mockDb.suppliers.find(sup => sup.id === m.supplier_id);
            return { ...m, supplier_name: s ? s.name : 'Unknown Supplier' };
          });
      }
      const [rows] = await dbPool.query(`
        SELECT m.*, s.name AS supplier_name 
        FROM medicines m 
        LEFT JOIN suppliers s ON m.supplier_id = s.id
        WHERE m.stock_quantity <= m.min_stock_level
        ORDER BY m.stock_quantity ASC
      `);
      return rows;
    },
    getById: async (id) => {
      if (isMockMode) {
        return mockDb.medicines.find(m => m.id === parseInt(id)) || null;
      }
      const [rows] = await dbPool.query('SELECT * FROM medicines WHERE id = ?', [id]);
      return rows[0] || null;
    },
    create: async (med) => {
      if (isMockMode) {
        const newMed = {
          id: mockDb.medicines.length + 1,
          name: med.name,
          generic_name: med.generic_name,
          category: med.category,
          strength: med.strength,
          unit: med.unit,
          price: parseFloat(med.price),
          cost_price: parseFloat(med.cost_price),
          stock_quantity: parseInt(med.stock_quantity || 0),
          min_stock_level: parseInt(med.min_stock_level || 10),
          expiry_date: med.expiry_date,
          supplier_id: med.supplier_id ? parseInt(med.supplier_id) : null,
          created_at: new Date()
        };
        mockDb.medicines.push(newMed);
        return newMed;
      }
      const [result] = await dbPool.query(
        `INSERT INTO medicines 
        (name, generic_name, category, strength, unit, price, cost_price, stock_quantity, min_stock_level, expiry_date, supplier_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [med.name, med.generic_name, med.category, med.strength, med.unit, med.price, med.cost_price, med.stock_quantity || 0, med.min_stock_level || 10, med.expiry_date, med.supplier_id || null]
      );
      return { id: result.insertId, ...med };
    },
    update: async (id, med) => {
      if (isMockMode) {
        const idx = mockDb.medicines.findIndex(m => m.id === parseInt(id));
        if (idx === -1) return null;
        mockDb.medicines[idx] = {
          ...mockDb.medicines[idx],
          name: med.name,
          generic_name: med.generic_name,
          category: med.category,
          strength: med.strength,
          unit: med.unit,
          price: parseFloat(med.price),
          cost_price: parseFloat(med.cost_price),
          stock_quantity: parseInt(med.stock_quantity),
          min_stock_level: parseInt(med.min_stock_level),
          expiry_date: med.expiry_date,
          supplier_id: med.supplier_id ? parseInt(med.supplier_id) : null
        };
        return mockDb.medicines[idx];
      }
      await dbPool.query(
        `UPDATE medicines SET 
          name = ?, generic_name = ?, category = ?, strength = ?, unit = ?, 
          price = ?, cost_price = ?, stock_quantity = ?, min_stock_level = ?, 
          expiry_date = ?, supplier_id = ? 
        WHERE id = ?`,
        [med.name, med.generic_name, med.category, med.strength, med.unit, med.price, med.cost_price, med.stock_quantity, med.min_stock_level, med.expiry_date, med.supplier_id || null, id]
      );
      return { id, ...med };
    },
    delete: async (id) => {
      if (isMockMode) {
        const idx = mockDb.medicines.findIndex(m => m.id === parseInt(id));
        if (idx === -1) return false;
        mockDb.medicines.splice(idx, 1);
        return true;
      }
      const [result] = await dbPool.query('DELETE FROM medicines WHERE id = ?', [id]);
      return result.affectedRows > 0;
    }
  },

  // ---- SUPPLIERS ROUTER INTERFACES ----
  suppliers: {
    getAll: async () => {
      if (isMockMode) return mockDb.suppliers;
      const [rows] = await dbPool.query('SELECT * FROM suppliers ORDER BY name ASC');
      return rows;
    },
    getById: async (id) => {
      if (isMockMode) {
        return mockDb.suppliers.find(s => s.id === parseInt(id)) || null;
      }
      const [rows] = await dbPool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
      return rows[0] || null;
    },
    create: async (sup) => {
      if (isMockMode) {
        const newSup = {
          id: mockDb.suppliers.length + 1,
          name: sup.name,
          contact_person: sup.contact_person,
          phone: sup.phone,
          email: sup.email,
          address: sup.address,
          created_at: new Date()
        };
        mockDb.suppliers.push(newSup);
        return newSup;
      }
      const [result] = await dbPool.query(
        'INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
        [sup.name, sup.contact_person, sup.phone, sup.email, sup.address]
      );
      return { id: result.insertId, ...sup };
    },
    update: async (id, sup) => {
      if (isMockMode) {
        const idx = mockDb.suppliers.findIndex(s => s.id === parseInt(id));
        if (idx === -1) return null;
        mockDb.suppliers[idx] = {
          ...mockDb.suppliers[idx],
          name: sup.name,
          contact_person: sup.contact_person,
          phone: sup.phone,
          email: sup.email,
          address: sup.address
        };
        return mockDb.suppliers[idx];
      }
      await dbPool.query(
        'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
        [sup.name, sup.contact_person, sup.phone, sup.email, sup.address, id]
      );
      return { id, ...sup };
    },
    delete: async (id) => {
      if (isMockMode) {
        const idx = mockDb.suppliers.findIndex(s => s.id === parseInt(id));
        if (idx === -1) return false;
        mockDb.suppliers.splice(idx, 1);
        // Nullify foreign keys in mock medicines
        mockDb.medicines.forEach(m => {
          if (m.supplier_id === parseInt(id)) m.supplier_id = null;
        });
        return true;
      }
      const [result] = await dbPool.query('DELETE FROM suppliers WHERE id = ?', [id]);
      return result.affectedRows > 0;
    }
  },

  // ---- CUSTOMERS ROUTER INTERFACES ----
  customers: {
    getAll: async () => {
      if (isMockMode) return mockDb.customers;
      const [rows] = await dbPool.query('SELECT * FROM customers ORDER BY name ASC');
      return rows;
    },
    getById: async (id) => {
      if (isMockMode) {
        return mockDb.customers.find(c => c.id === parseInt(id)) || null;
      }
      const [rows] = await dbPool.query('SELECT * FROM customers WHERE id = ?', [id]);
      return rows[0] || null;
    },
    create: async (cust) => {
      if (isMockMode) {
        const newCust = {
          id: mockDb.customers.length + 1,
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          address: cust.address,
          created_at: new Date()
        };
        mockDb.customers.push(newCust);
        return newCust;
      }
      const [result] = await dbPool.query(
        'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
        [cust.name, cust.phone, cust.email, cust.address]
      );
      return { id: result.insertId, ...cust };
    },
    update: async (id, cust) => {
      if (isMockMode) {
        const idx = mockDb.customers.findIndex(c => c.id === parseInt(id));
        if (idx === -1) return null;
        mockDb.customers[idx] = {
          ...mockDb.customers[idx],
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          address: cust.address
        };
        return mockDb.customers[idx];
      }
      await dbPool.query(
        'UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
        [cust.name, cust.phone, cust.email, cust.address, id]
      );
      return { id, ...cust };
    },
    delete: async (id) => {
      if (isMockMode) {
        if (parseInt(id) === 1) throw new Error('Cannot delete default Walking Customer');
        const idx = mockDb.customers.findIndex(c => c.id === parseInt(id));
        if (idx === -1) return false;
        mockDb.customers.splice(idx, 1);
        return true;
      }
      if (parseInt(id) === 1) throw new Error('Cannot delete default Walking Customer');
      const [result] = await dbPool.query('DELETE FROM customers WHERE id = ?', [id]);
      return result.affectedRows > 0;
    }
  },

  // ---- PURCHASES ROUTER INTERFACES ----
  purchases: {
    getAll: async () => {
      if (isMockMode) {
        return mockDb.purchases.map(p => {
          const s = mockDb.suppliers.find(sup => sup.id === p.supplier_id);
          return { ...p, supplier_name: s ? s.name : 'Unknown' };
        }).sort((a, b) => b.id - a.id);
      }
      const [rows] = await dbPool.query(`
        SELECT p.*, s.name as supplier_name 
        FROM purchases p 
        LEFT JOIN suppliers s ON p.supplier_id = s.id 
        ORDER BY p.purchase_date DESC, p.id DESC
      `);
      return rows;
    },
    create: async ({ supplier_id, purchase_date, items }) => {
      // Calculate total
      const total_amount = items.reduce((acc, item) => acc + (parseFloat(item.cost_price) * parseInt(item.quantity)), 0);
      const purchase_no = `PUR-${Date.now().toString().slice(-6)}`;

      if (isMockMode) {
        const pId = mockDb.purchases.length + 1;
        const newPurchase = {
          id: pId,
          purchase_no,
          supplier_id: parseInt(supplier_id),
          purchase_date,
          total_amount,
          created_at: new Date()
        };
        mockDb.purchases.push(newPurchase);

        for (let item of items) {
          // Record detail
          mockDb.purchase_details.push({
            id: mockDb.purchase_details.length + 1,
            purchase_id: pId,
            medicine_id: parseInt(item.medicine_id),
            quantity: parseInt(item.quantity),
            cost_price: parseFloat(item.cost_price),
            expiry_date: item.expiry_date || null,
            total_price: parseFloat(item.cost_price) * parseInt(item.quantity)
          });

          // Update medicine stock & cost price
          const med = mockDb.medicines.find(m => m.id === parseInt(item.medicine_id));
          if (med) {
            med.stock_quantity += parseInt(item.quantity);
            med.cost_price = parseFloat(item.cost_price);
            if (item.expiry_date) med.expiry_date = item.expiry_date;
          }
        }
        return { id: pId, purchase_no, total_amount };
      }

      // MySQL transaction
      const conn = await dbPool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Insert Purchase
        const [purchaseResult] = await conn.query(
          'INSERT INTO purchases (purchase_no, supplier_id, purchase_date, total_amount) VALUES (?, ?, ?, ?)',
          [purchase_no, supplier_id, purchase_date, total_amount]
        );
        const purchase_id = purchaseResult.insertId;

        // 2. Insert items and update stock
        for (let item of items) {
          const itemTotal = parseFloat(item.cost_price) * parseInt(item.quantity);
          await conn.query(
            `INSERT INTO purchase_details 
            (purchase_id, medicine_id, quantity, cost_price, expiry_date, total_price) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [purchase_id, item.medicine_id, item.quantity, item.cost_price, item.expiry_date || null, itemTotal]
          );

          // Update Stock Quantity
          await conn.query(
            `UPDATE medicines 
            SET stock_quantity = stock_quantity + ?, cost_price = ?, expiry_date = COALESCE(?, expiry_date) 
            WHERE id = ?`,
            [item.quantity, item.cost_price, item.expiry_date || null, item.medicine_id]
          );
        }

        await conn.commit();
        return { id: purchase_id, purchase_no, total_amount };
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  },

  // ---- SALES & BILLING ROUTER INTERFACES ----
  sales: {
    getAll: async () => {
      if (isMockMode) {
        return mockDb.sales.map(s => {
          const c = mockDb.customers.find(cust => cust.id === s.customer_id);
          return { ...s, customer_name: c ? c.name : 'Unknown' };
        }).sort((a, b) => b.id - a.id);
      }
      const [rows] = await dbPool.query(`
        SELECT s.*, c.name as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        ORDER BY s.sale_date DESC, s.id DESC
      `);
      return rows;
    },
    getById: async (id) => {
      if (isMockMode) {
        const sale = mockDb.sales.find(s => s.id === parseInt(id));
        if (!sale) return null;
        const customer = mockDb.customers.find(c => c.id === sale.customer_id) || {};
        
        // Find sale items joined with medicine name
        const items = mockDb.sale_details
          .filter(sd => sd.sale_id === sale.id)
          .map(sd => {
            const med = mockDb.medicines.find(m => m.id === sd.medicine_id);
            return {
              ...sd,
              medicine_name: med ? med.name : 'Unknown Medicine',
              generic_name: med ? med.generic_name : '',
              strength: med ? med.strength : ''
            };
          });

        return { ...sale, customer_name: customer.name, customer_phone: customer.phone, customer_address: customer.address, items };
      }

      // MySQL query
      const [salesRows] = await dbPool.query(`
        SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        WHERE s.id = ?
      `, [id]);
      
      if (salesRows.length === 0) return null;
      
      const [itemRows] = await dbPool.query(`
        SELECT sd.*, m.name as medicine_name, m.generic_name, m.strength
        FROM sale_details sd
        LEFT JOIN medicines m ON sd.medicine_id = m.id
        WHERE sd.sale_id = ?
      `, [id]);

      return { ...salesRows[0], items: itemRows };
    },
    create: async ({ customer_id, sale_date, discount, tax, payment_type, items }) => {
      // Calculate subtotals and check stock availability
      let total_amount = 0;
      for (let item of items) {
        let price = 0;
        if (isMockMode) {
          const med = mockDb.medicines.find(m => m.id === parseInt(item.medicine_id));
          if (!med) throw new Error(`Medicine ID ${item.medicine_id} not found.`);
          if (med.stock_quantity < parseInt(item.quantity)) {
            throw new Error(`Insufficient stock for ${med.name}. Available: ${med.stock_quantity}, Requested: ${item.quantity}`);
          }
          price = med.price;
        } else {
          const [rows] = await dbPool.query('SELECT name, price, stock_quantity FROM medicines WHERE id = ?', [item.medicine_id]);
          if (rows.length === 0) throw new Error(`Medicine ID ${item.medicine_id} not found.`);
          if (rows[0].stock_quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${rows[0].name}. Available: ${rows[0].stock_quantity}, Requested: ${item.quantity}`);
          }
          price = rows[0].price;
        }
        item.sale_price = price;
        item.total_price = price * item.quantity;
        total_amount += item.total_price;
      }

      const discVal = parseFloat(discount || 0);
      const taxVal = parseFloat(tax || 0);
      const net_amount = total_amount - discVal + taxVal;
      const invoice_no = `INV-${Date.now().toString().slice(-6)}`;

      if (isMockMode) {
        const sId = mockDb.sales.length + 1;
        const newSale = {
          id: sId,
          invoice_no,
          customer_id: customer_id ? parseInt(customer_id) : 1, // Default walking customer
          sale_date,
          total_amount,
          discount: discVal,
          tax: taxVal,
          net_amount,
          payment_type: payment_type || 'Cash',
          created_at: new Date()
        };
        mockDb.sales.push(newSale);

        for (let item of items) {
          mockDb.sale_details.push({
            id: mockDb.sale_details.length + 1,
            sale_id: sId,
            medicine_id: parseInt(item.medicine_id),
            quantity: parseInt(item.quantity),
            sale_price: parseFloat(item.sale_price),
            total_price: parseFloat(item.total_price)
          });

          // Decrement stock
          const med = mockDb.medicines.find(m => m.id === parseInt(item.medicine_id));
          if (med) med.stock_quantity -= parseInt(item.quantity);
        }

        return { id: sId, invoice_no, net_amount };
      }

      // MySQL transaction
      const conn = await dbPool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Insert Sales Header
        const [salesResult] = await conn.query(
          `INSERT INTO sales 
          (invoice_no, customer_id, sale_date, total_amount, discount, tax, net_amount, payment_type) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoice_no, customer_id || 1, sale_date, total_amount, discVal, taxVal, net_amount, payment_type || 'Cash']
        );
        const sale_id = salesResult.insertId;

        // 2. Insert items and decrement stock
        for (let item of items) {
          await conn.query(
            `INSERT INTO sale_details (sale_id, medicine_id, quantity, sale_price, total_price) 
            VALUES (?, ?, ?, ?, ?)`,
            [sale_id, item.medicine_id, item.quantity, item.sale_price, item.total_price]
          );

          // Decrement Stock
          await conn.query(
            'UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE id = ?',
            [item.quantity, item.medicine_id]
          );
        }

        await conn.commit();
        return { id: sale_id, invoice_no, net_amount };
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  },

  // ---- ANALYTICS & STATS INTERFACES ----
  dashboard: {
    getStats: async () => {
      if (isMockMode) {
        const medicinesCount = mockDb.medicines.length;
        const lowStockCount = mockDb.medicines.filter(m => m.stock_quantity <= m.min_stock_level).length;
        const totalSales = mockDb.sales.reduce((acc, s) => acc + parseFloat(s.net_amount), 0);
        const totalPurchases = mockDb.purchases.reduce((acc, p) => acc + parseFloat(p.total_amount), 0);
        
        // Build a feed of recent transactions (latest 5 sales or purchases)
        const recentSales = mockDb.sales.slice(-5).map(s => {
          const c = mockDb.customers.find(cust => cust.id === s.customer_id);
          return {
            type: 'sale',
            id: s.id,
            ref_no: s.invoice_no,
            entity: c ? c.name : 'Unknown Customer',
            amount: s.net_amount,
            date: s.sale_date,
            created_at: s.created_at
          };
        });
        
        const recentPurchases = mockDb.purchases.slice(-5).map(p => {
          const s = mockDb.suppliers.find(sup => sup.id === p.supplier_id);
          return {
            type: 'purchase',
            id: p.id,
            ref_no: p.purchase_no,
            entity: s ? s.name : 'Unknown Supplier',
            amount: p.total_amount,
            date: p.purchase_date,
            created_at: p.created_at
          };
        });

        const activityFeed = [...recentSales, ...recentPurchases]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);

        return {
          medicinesCount,
          lowStockCount,
          totalSales,
          totalPurchases,
          activityFeed
        };
      }

      // MySQL query
      const [medRow] = await dbPool.query('SELECT COUNT(*) as count FROM medicines');
      const [lowStockRow] = await dbPool.query('SELECT COUNT(*) as count FROM medicines WHERE stock_quantity <= min_stock_level');
      const [salesRow] = await dbPool.query('SELECT COALESCE(SUM(net_amount), 0) as total FROM sales');
      const [purchRow] = await dbPool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases');
      
      const [recentSales] = await dbPool.query(`
        SELECT 'sale' as type, s.id, s.invoice_no as ref_no, c.name as entity, s.net_amount as amount, s.sale_date as date, s.created_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC LIMIT 5
      `);
      
      const [recentPurchases] = await dbPool.query(`
        SELECT 'purchase' as type, p.id, p.purchase_no as ref_no, s.name as entity, p.total_amount as amount, p.purchase_date as date, p.created_at
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.created_at DESC LIMIT 5
      `);

      const activityFeed = [...recentSales, ...recentPurchases]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      return {
        medicinesCount: medRow[0].count,
        lowStockCount: lowStockRow[0].count,
        totalSales: parseFloat(salesRow[0].total),
        totalPurchases: parseFloat(purchRow[0].total),
        activityFeed
      };
    }
  },

  // ---- REPORTS INTERFACES ----
  reports: {
    getSummary: async (startDate, endDate) => {
      // Setup default dates if missing (past 30 days)
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();

      if (isMockMode) {
        // Filter Sales and Purchases
        const filteredSales = mockDb.sales.filter(s => s.sale_date >= start && s.sale_date <= end);
        const filteredPurchases = mockDb.purchases.filter(p => p.purchase_date >= start && p.purchase_date <= end);
        
        // Group by Date
        const trendMap = {};
        
        filteredSales.forEach(s => {
          if (!trendMap[s.sale_date]) trendMap[s.sale_date] = { date: s.sale_date, sales: 0, purchases: 0 };
          trendMap[s.sale_date].sales += parseFloat(s.net_amount);
        });

        filteredPurchases.forEach(p => {
          if (!trendMap[p.purchase_date]) trendMap[p.purchase_date] = { date: p.purchase_date, sales: 0, purchases: 0 };
          trendMap[p.purchase_date].purchases += parseFloat(p.total_amount);
        });

        const chartTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        // Group Top Selling medicines in mock db
        const topMedMap = {};
        filteredSales.forEach(s => {
          const details = mockDb.sale_details.filter(sd => sd.sale_id === s.id);
          details.forEach(sd => {
            if (!topMedMap[sd.medicine_id]) topMedMap[sd.medicine_id] = 0;
            topMedMap[sd.medicine_id] += parseInt(sd.quantity);
          });
        });

        const topMedicines = Object.entries(topMedMap).map(([medId, qty]) => {
          const med = mockDb.medicines.find(m => m.id === parseInt(medId));
          return {
            name: med ? med.name : 'Unknown Medicine',
            quantity_sold: qty
          };
        }).sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 5);

        return {
          startDate: start,
          endDate: end,
          salesTotal: filteredSales.reduce((acc, s) => acc + parseFloat(s.net_amount), 0),
          purchasesTotal: filteredPurchases.reduce((acc, p) => acc + parseFloat(p.total_amount), 0),
          chartTrend,
          topMedicines
        };
      }

      // MySQL query logic
      const [salesSum] = await dbPool.query('SELECT COALESCE(SUM(net_amount), 0) as total FROM sales WHERE sale_date BETWEEN ? AND ?', [start, end]);
      const [purchSum] = await dbPool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date BETWEEN ? AND ?', [start, end]);

      // Daily trends
      const [salesTrend] = await dbPool.query(
        'SELECT sale_date as date, SUM(net_amount) as sales FROM sales WHERE sale_date BETWEEN ? AND ? GROUP BY sale_date',
        [start, end]
      );
      const [purchTrend] = await dbPool.query(
        'SELECT purchase_date as date, SUM(total_amount) as purchases FROM purchases WHERE purchase_date BETWEEN ? AND ? GROUP BY purchase_date',
        [start, end]
      );

      // Merge trends
      const trendMap = {};
      salesTrend.forEach(s => {
        const dateStr = s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date;
        trendMap[dateStr] = { date: dateStr, sales: parseFloat(s.sales), purchases: 0 };
      });
      purchTrend.forEach(p => {
        const dateStr = p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date;
        if (!trendMap[dateStr]) {
          trendMap[dateStr] = { date: dateStr, sales: 0, purchases: parseFloat(p.purchases) };
        } else {
          trendMap[dateStr].purchases = parseFloat(p.purchases);
        }
      });
      const chartTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

      // Top medicines
      const [topMedicines] = await dbPool.query(`
        SELECT m.name, SUM(sd.quantity) as quantity_sold
        FROM sale_details sd
        JOIN medicines m ON sd.medicine_id = m.id
        JOIN sales s ON sd.sale_id = s.id
        WHERE s.sale_date BETWEEN ? AND ?
        GROUP BY m.id
        ORDER BY quantity_sold DESC
        LIMIT 5
      `, [start, end]);

      return {
        startDate: start,
        endDate: end,
        salesTotal: parseFloat(salesSum[0].total),
        purchasesTotal: parseFloat(purchSum[0].total),
        chartTrend,
        topMedicines
      };
    }
  }
};

module.exports = {
  db,
  initDatabase
};
