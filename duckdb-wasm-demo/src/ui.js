// Tab switching
export function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      // Dispatch custom event for dashboard refresh
      window.dispatchEvent(new CustomEvent('tabchange', { detail: tab.dataset.tab }));
    });
  });
}

// Render table from array of objects
export function renderTable(containerId, data) {
  const container = document.getElementById(containerId);
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="no-data">No results</p>';
    return;
  }
  const columns = Object.keys(data[0]);
  const html = `<table>
    <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row =>
      `<tr>${columns.map(c => `<td>${formatValue(row[c])}</td>`).join('')}</tr>`
    ).join('')}</tbody>
  </table>`;
  container.innerHTML = html;
}

// Format values for display
function formatValue(v) {
  if (v === null || v === undefined) return '<span class="null">NULL</span>';
  if (typeof v === 'number') return formatNumber(v);
  return String(v);
}

// Format number with comma separators
export function formatNumber(n) {
  if (Number.isInteger(n)) return n.toLocaleString();
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Format duration in ms
export function formatDuration(ms) {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Show status
export function showStatus(message, type = 'info') {
  const el = document.getElementById('init-status');
  el.textContent = message;
  el.className = `status-${type}`;
}

// Show error
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="error-box">${message}</div>`;
}
