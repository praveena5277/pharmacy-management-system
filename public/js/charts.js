// Aegis Rx Charting Wrapper
const charts = {
  instances: {},

  // Get colors depending on active theme
  getThemeColors() {
    const isDark = document.body.classList.contains('dark-theme');
    return {
      text: isDark ? '#9ca3af' : '#4b5563',
      grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      primary: '#4f46e5',
      primaryLight: 'rgba(79, 70, 229, 0.1)',
      success: '#10b981',
      successLight: 'rgba(16, 185, 129, 0.1)',
      info: '#06b6d4',
      infoLight: 'rgba(6, 182, 212, 0.1)',
    };
  },

  // 1. Line Chart: Sales vs Purchases
  renderSalesPurchasesTrend(canvasId, trendData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing instance
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const themeColors = this.getThemeColors();
    const labels = trendData.map(item => item.date);
    const salesData = trendData.map(item => item.sales);
    const purchasesData = trendData.map(item => item.purchases);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sales Revenue ($)',
            data: salesData,
            borderColor: themeColors.success,
            backgroundColor: themeColors.successLight,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: themeColors.success
          },
          {
            label: 'Purchases Cost ($)',
            data: purchasesData,
            borderColor: themeColors.primary,
            backgroundColor: themeColors.primaryLight,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: themeColors.primary
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: themeColors.text,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            padding: 12,
            borderRadius: 8,
            titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 }
          }
        },
        scales: {
          x: {
            grid: { color: themeColors.grid },
            ticks: { color: themeColors.text, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: themeColors.grid },
            ticks: { color: themeColors.text, font: { family: 'Inter', size: 11 } },
            beginAtZero: true
          }
        }
      }
    });
  },

  // 2. Bar Chart: Top Medicines Sold
  renderTopMedicines(canvasId, medicinesData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const themeColors = this.getThemeColors();
    
    // Sort or format data
    const labels = medicinesData.map(item => item.name);
    const quantities = medicinesData.map(item => item.quantity_sold);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Quantity Sold',
          data: quantities,
          backgroundColor: [
            'rgba(79, 70, 229, 0.7)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)'
          ],
          borderColor: [
            themeColors.primary,
            themeColors.info,
            themeColors.success,
            '#d97706',
            '#dc2626'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            padding: 12,
            borderRadius: 8,
            titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: themeColors.text, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: themeColors.grid },
            ticks: { color: themeColors.text, font: { family: 'Inter', size: 11 }, stepSize: 1 },
            beginAtZero: true
          }
        }
      }
    });
  },

  // Update theme of all active charts
  updateChartsTheme() {
    const themeColors = this.getThemeColors();
    Object.keys(this.instances).forEach(id => {
      const chart = this.instances[id];
      if (chart) {
        chart.options.scales.x.grid.color = themeColors.grid;
        chart.options.scales.y.grid.color = themeColors.grid;
        chart.options.scales.x.ticks.color = themeColors.text;
        chart.options.scales.y.ticks.color = themeColors.text;
        if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
          chart.options.plugins.legend.labels.color = themeColors.text;
        }
        chart.update();
      }
    });
  }
};
