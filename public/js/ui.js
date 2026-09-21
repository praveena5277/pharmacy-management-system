// Aegis Rx UI Renderer Module
const ui = {
  // 1. Toast Notifications
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon mapping
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    // Trigger transition
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // 2. Modals Control
  toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (show) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  // 3. Render Medicines Table
  renderMedicinesTable(medicines, onEdit, onDelete) {
    const tbody = document.querySelector('#medicines-main-table tbody');
    if (!tbody) return;

    if (medicines.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No medicines found in inventory.</td></tr>`;
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    tbody.innerHTML = medicines.map(med => {
      // Expiry status
      let expiryClass = 'badge-success';
      let expiryText = 'Active';
      const expDate = med.expiry_date ? med.expiry_date.split('T')[0] : '';
      
      if (expDate) {
        const daysToExpiry = Math.ceil((new Date(expDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 0) {
          expiryClass = 'badge-danger';
          expiryText = `Expired (${expDate})`;
        } else if (daysToExpiry <= 60) {
          expiryClass = 'badge-warning';
          expiryText = `Near Expiry (${expDate})`;
        } else {
          expiryText = expDate;
        }
      } else {
        expiryText = 'N/A';
      }

      // Stock status
      let stockClass = '';
      if (med.stock_quantity === 0) {
        stockClass = 'badge-danger';
      } else if (med.stock_quantity <= med.min_stock_level) {
        stockClass = 'badge-warning';
      } else {
        stockClass = 'badge-success';
      }

      return `
        <tr data-id="${med.id}">
          <td><strong>${med.name}</strong></td>
          <td>${med.generic_name}</td>
          <td><span class="badge badge-primary">${med.category || 'N/A'}</span></td>
          <td>${med.strength || 'N/A'}</td>
          <td>${med.unit || 'N/A'}</td>
          <td>$${parseFloat(med.price).toFixed(2)}</td>
          <td>$${parseFloat(med.cost_price).toFixed(2)}</td>
          <td><span class="badge ${stockClass}">${med.stock_quantity}</span></td>
          <td><span class="badge ${expiryClass}">${expiryText}</span></td>
          <td>${med.supplier_name || 'N/A'}</td>
          <td class="actions-col">
            <button class="btn-table-action edit-btn" title="Edit Medicine"><i data-lucide="edit-2"></i></button>
            <button class="btn-table-action btn-table-action-delete delete-btn" title="Delete Medicine"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();

    // Attach listeners
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.closest('tr').dataset.id;
        onEdit(id);
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.closest('tr').dataset.id;
        onDelete(id);
      });
    });
  },

  // 4. Render Suppliers Table
  renderSuppliersTable(suppliers, onEdit, onDelete) {
    const tbody = document.querySelector('#suppliers-main-table tbody');
    if (!tbody) return;

    if (suppliers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No suppliers registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = suppliers.map(sup => `
      <tr data-id="${sup.id}">
        <td><strong>${sup.name}</strong></td>
        <td>${sup.contact_person || 'N/A'}</td>
        <td>${sup.phone || 'N/A'}</td>
        <td>${sup.email || 'N/A'}</td>
        <td>${sup.address || 'N/A'}</td>
        <td class="actions-col">
          <button class="btn-table-action edit-btn" title="Edit Supplier"><i data-lucide="edit-2"></i></button>
          <button class="btn-table-action btn-table-action-delete delete-btn" title="Delete Supplier"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.closest('tr').dataset.id;
        onEdit(id);
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.closest('tr').dataset.id;
        onDelete(id);
      });
    });
  },

  // 5. Render Customers Table
  renderCustomersTable(customers, onEdit, onDelete) {
    const tbody = document.querySelector('#customers-main-table tbody');
    if (!tbody) return;

    if (customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No customers registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(cust => `
      <tr data-id="${cust.id}">
        <td><strong>${cust.name}</strong></td>
        <td>${cust.phone || 'N/A'}</td>
        <td>${cust.email || 'N/A'}</td>
        <td>${cust.address || 'N/A'}</td>
        <td class="actions-col">
          ${cust.id === 1 ? '<span class="text-muted text-xs">System Def</span>' : `
            <button class="btn-table-action edit-btn" title="Edit Customer"><i data-lucide="edit-2"></i></button>
            <button class="btn-table-action btn-table-action-delete delete-btn" title="Delete Customer"><i data-lucide="trash-2"></i></button>
          `}
        </td>
      </tr>
    `).join('');

    lucide.createIcons();

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.closest('tr').dataset.id;
        onEdit(id);
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.closest('tr').dataset.id;
        onDelete(id);
      });
    });
  },

  // 6. Render Purchases Table
  renderPurchasesTable(purchases) {
    const tbody = document.querySelector('#purchases-history-table tbody');
    if (!tbody) return;

    if (purchases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No purchase records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = purchases.map(p => {
      const pDate = p.purchase_date ? p.purchase_date.split('T')[0] : '';
      const cDate = p.created_at ? new Date(p.created_at).toLocaleString() : '';
      return `
        <tr>
          <td><span class="badge badge-primary">${p.purchase_no}</span></td>
          <td><strong>${p.supplier_name || 'Unknown'}</strong></td>
          <td>${pDate}</td>
          <td><strong>$${parseFloat(p.total_amount).toFixed(2)}</strong></td>
          <td><small class="text-muted">${cDate}</small></td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  },

  // 7. Render POS Medicines Catalog
  renderPOSMedicineCatalog(medicines, onSelect) {
    const grid = document.getElementById('pos-med-grid');
    if (!grid) return;

    if (medicines.length === 0) {
      grid.innerHTML = `<p class="text-center text-muted grid-span-2 py-5">No medicines match your search filters.</p>`;
      return;
    }

    grid.innerHTML = medicines.map(med => {
      const isOutOfStock = med.stock_quantity <= 0;
      const stockBadgeClass = isOutOfStock ? 'badge-danger' : (med.stock_quantity <= med.min_stock_level ? 'badge-warning' : 'badge-success');
      
      return `
        <div class="pos-med-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${med.id}">
          <div>
            <h3>${med.name}</h3>
            <p class="med-generic">${med.generic_name} • ${med.strength}</p>
            <p class="med-stock-line">Stock: <span class="badge ${stockBadgeClass}">${med.stock_quantity}</span></p>
          </div>
          <div class="med-price-line">
            <span>$${parseFloat(med.price).toFixed(2)}</span>
            ${isOutOfStock ? '<span class="badge badge-danger">Out</span>' : '<span class="med-add-indicator">+ Add</span>'}
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    grid.querySelectorAll('.pos-med-card:not(.out-of-stock)').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        onSelect(id);
      });
    });
  },

  // 8. Render POS Checkout Cart
  renderPOSCart(cart, onUpdateQty, onRemoveItem) {
    const tbody = document.getElementById('pos-cart-body');
    if (!tbody) return;

    if (cart.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-cart-row">
          <td colspan="5" class="text-center py-5 text-muted">
            <i data-lucide="shopping-cart" class="empty-cart-icon"></i>
            <p>Basket is empty. Search medicines on the right to add.</p>
          </td>
        </tr>
      `;
      document.getElementById('pos-checkout-btn').disabled = true;
      document.getElementById('pos-item-count').textContent = '0 items';
      document.getElementById('pos-subtotal').textContent = '$0.00';
      document.getElementById('pos-net-total').textContent = '$0.00';
      lucide.createIcons();
      return;
    }

    let subtotal = 0;

    tbody.innerHTML = cart.map(item => {
      const total = parseFloat(item.price) * item.quantity;
      subtotal += total;
      return `
        <tr data-id="${item.medicine_id}">
          <td>
            <strong>${item.name}</strong><br>
            <small class="text-muted">${item.strength}</small>
          </td>
          <td>$${parseFloat(item.price).toFixed(2)}</td>
          <td class="qty-col">
            <div class="qty-input-controls">
              <button class="qty-minus" type="button">-</button>
              <input type="number" class="qty-val" value="${item.quantity}" min="1" max="${item.stock_quantity}">
              <button class="qty-plus" type="button">+</button>
            </div>
          </td>
          <td><strong>$${total.toFixed(2)}</strong></td>
          <td class="text-right">
            <button class="btn-table-action btn-table-action-delete remove-cart-btn" type="button"><i data-lucide="x"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();

    // Update summaries
    const discount = parseFloat(document.getElementById('pos-discount').value || 0);
    const tax = parseFloat(document.getElementById('pos-tax').value || 0);
    const netTotal = subtotal - discount + tax;

    document.getElementById('pos-item-count').textContent = `${cart.length} item${cart.length > 1 ? 's' : ''}`;
    document.getElementById('pos-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('pos-net-total').textContent = `$${Math.max(0, netTotal).toFixed(2)}`;
    document.getElementById('pos-checkout-btn').disabled = false;

    // Attach listeners
    tbody.querySelectorAll('tr').forEach(row => {
      const id = row.dataset.id;
      const input = row.querySelector('.qty-val');
      const maxVal = parseInt(input.max);

      row.querySelector('.qty-minus').addEventListener('click', () => {
        const val = parseInt(input.value);
        if (val > 1) onUpdateQty(id, val - 1);
      });

      row.querySelector('.qty-plus').addEventListener('click', () => {
        const val = parseInt(input.value);
        if (val < maxVal) {
          onUpdateQty(id, val + 1);
        } else {
          ui.showToast(`Cannot exceed current stock level of ${maxVal}`, 'warning');
        }
      });

      input.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > maxVal) {
          val = maxVal;
          ui.showToast(`Adjusted to maximum stock of ${maxVal}`, 'warning');
        }
        onUpdateQty(id, val);
      });

      row.querySelector('.remove-cart-btn').addEventListener('click', () => {
        onRemoveItem(id);
      });
    });
  },

  // 9. Render Printable Invoice Modal
  renderInvoice(invoiceData) {
    document.getElementById('inv-meta-no').textContent = invoiceData.invoice_no;
    document.getElementById('inv-meta-date').textContent = invoiceData.sale_date ? invoiceData.sale_date.split('T')[0] : '';
    document.getElementById('inv-meta-customer').textContent = invoiceData.customer_name || 'Walking Customer';
    document.getElementById('inv-meta-phone').textContent = invoiceData.customer_phone || 'N/A';
    
    // Subtotal and sums
    let subtotal = 0;
    const itemsHtml = invoiceData.items.map(item => {
      const itemTotal = parseFloat(item.sale_price) * parseInt(item.quantity);
      subtotal += itemTotal;
      return `
        <tr>
          <td>${item.medicine_name} (${item.strength || 'N/A'})</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">$${parseFloat(item.sale_price).toFixed(2)}</td>
          <td class="text-right">$${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    document.getElementById('inv-meta-items').innerHTML = itemsHtml;
    document.getElementById('inv-meta-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('inv-meta-discount').textContent = `-$${parseFloat(invoiceData.discount).toFixed(2)}`;
    document.getElementById('inv-meta-tax').textContent = `+$${parseFloat(invoiceData.tax).toFixed(2)}`;
    document.getElementById('inv-meta-payment').textContent = invoiceData.payment_type;
    document.getElementById('inv-meta-net').textContent = `$${parseFloat(invoiceData.net_amount).toFixed(2)}`;

    lucide.createIcons();
    this.toggleModal('invoice-modal', true);
  },

  // 10. Populate Dropdown Lists (Suppliers select box)
  populateSupplierDropdowns(suppliers) {
    const options = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    const medSelect = document.getElementById('med-supplier');
    if (medSelect) {
      medSelect.innerHTML = `<option value="">Select Supplier</option>${options}`;
    }

    const purchSelect = document.getElementById('purchase-supplier');
    if (purchSelect) {
      purchSelect.innerHTML = `<option value="">Select Supplier</option>${options}`;
    }
  },

  // 11. Populate Customer Dropdowns
  populateCustomerDropdowns(customers) {
    const options = customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
    const posSelect = document.getElementById('pos-customer-select');
    if (posSelect) {
      posSelect.innerHTML = options;
    }
  },

  // 12. Render Dashboard Table Components
  renderDashboardTables(lowStockMeds, activityFeed) {
    // Low stock
    const lowStockTbody = document.querySelector('#dashboard-low-stock-table tbody');
    if (lowStockTbody) {
      if (lowStockMeds.length === 0) {
        lowStockTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">All stock levels are optimal.</td></tr>`;
      } else {
        lowStockTbody.innerHTML = lowStockMeds.slice(0, 5).map(m => `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.generic_name}</td>
            <td><span class="badge badge-danger">${m.stock_quantity}</span></td>
            <td>${m.min_stock_level}</td>
          </tr>
        `).join('');
      }
    }

    // Activity feed
    const activityTbody = document.querySelector('#dashboard-activity-table tbody');
    if (activityTbody) {
      if (activityFeed.length === 0) {
        activityTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No recent operations.</td></tr>`;
      } else {
        activityTbody.innerHTML = activityFeed.map(act => {
          const badgeClass = act.type === 'sale' ? 'badge-success' : 'badge-primary';
          const typeLabel = act.type === 'sale' ? 'Sale' : 'Purchase';
          const symbol = act.type === 'sale' ? '+' : '-';
          const valClass = act.type === 'sale' ? 'text-success' : 'text-danger';
          const formattedDate = act.date ? act.date.split('T')[0] : '';
          
          return `
            <tr>
              <td><span class="badge ${badgeClass}">${act.ref_no}</span></td>
              <td>${typeLabel}</td>
              <td>${act.entity}</td>
              <td class="${valClass}"><strong>${symbol}$${parseFloat(act.amount).toFixed(2)}</strong></td>
              <td><small>${formattedDate}</small></td>
            </tr>
          `;
        }).join('');
      }
    }
    
    lucide.createIcons();
  }
};
