// Aegis Rx API Client Module
const API_BASE = '';

const api = {
  // Token management
  setToken: (token) => localStorage.setItem('aegis_token', token),
  getToken: () => localStorage.getItem('aegis_token'),
  clearToken: () => localStorage.removeItem('aegis_token'),

  // Base HTTP Request Wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Set headers
    const headers = options.headers || {};
    headers['Content-Type'] = 'application/json';
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // If JWT token expired or unauthorized, sign out immediately
        if (response.status === 401 || response.status === 403) {
          this.clearToken();
          // Dispatch custom event to let app.js handle logout transitions
          window.dispatchEvent(new CustomEvent('api-unauthorized', { detail: data.message }));
        }
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth Operations
  auth: {
    async login(username, password) {
      const data = await api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      api.setToken(data.token);
      return data;
    },
    async me() {
      return await api.request('/api/auth/me');
    },
    async register(user) {
      return await api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(user)
      });
    }
  },

  // Dashboard Stats
  dashboard: {
    async getStats() {
      return await api.request('/api/dashboard/stats');
    }
  },

  // Medicines Inventory
  medicines: {
    async getAll() {
      return await api.request('/api/medicines');
    },
    async getLowStock() {
      return await api.request('/api/medicines/low-stock');
    },
    async getById(id) {
      return await api.request(`/api/medicines/${id}`);
    },
    async create(medData) {
      return await api.request('/api/medicines', {
        method: 'POST',
        body: JSON.stringify(medData)
      });
    },
    async update(id, medData) {
      return await api.request(`/api/medicines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(medData)
      });
    },
    async delete(id) {
      return await api.request(`/api/medicines/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Supplier Registry
  suppliers: {
    async getAll() {
      return await api.request('/api/suppliers');
    },
    async getById(id) {
      return await api.request(`/api/suppliers/${id}`);
    },
    async create(supData) {
      return await api.request('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supData)
      });
    },
    async update(id, supData) {
      return await api.request(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(supData)
      });
    },
    async delete(id) {
      return await api.request(`/api/suppliers/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Customer Accounts
  customers: {
    async getAll() {
      return await api.request('/api/customers');
    },
    async getById(id) {
      return await api.request(`/api/customers/${id}`);
    },
    async create(custData) {
      return await api.request('/api/customers', {
        method: 'POST',
        body: JSON.stringify(custData)
      });
    },
    async update(id, custData) {
      return await api.request(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(custData)
      });
    },
    async delete(id) {
      return await api.request(`/api/customers/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Inventory Purchases (Replenishment)
  purchases: {
    async getAll() {
      return await api.request('/api/purchases');
    },
    async create(purchaseOrder) {
      return await api.request('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(purchaseOrder)
      });
    }
  },

  // Point of Sale & Receipts
  sales: {
    async getAll() {
      return await api.request('/api/sales');
    },
    async getInvoice(id) {
      return await api.request(`/api/sales/invoice/${id}`);
    },
    async create(saleBill) {
      return await api.request('/api/sales', {
        method: 'POST',
        body: JSON.stringify(saleBill)
      });
    }
  },

  // Business Analytics Reports
  reports: {
    async getSummary(startDate, endDate) {
      let url = '/api/reports/summary';
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      return await api.request(url);
    }
  }
};
