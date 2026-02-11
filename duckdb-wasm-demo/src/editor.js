import { query } from './duckdb-client.js';
import { renderTable, formatDuration, showError } from './ui.js';

let sqlInput;
let btnExecute;
let resultSection;
let resultCount;
let queryStats;

export function initEditor() {
  sqlInput = document.getElementById('sql-input');
  btnExecute = document.getElementById('btn-execute');
  resultSection = document.getElementById('result-section');
  resultCount = document.getElementById('result-count');
  queryStats = document.getElementById('query-stats');

  // Execute button
  btnExecute.addEventListener('click', () => {
    const sql = sqlInput.value.trim();
    if (sql) executeQuery(sql);
  });

  // Ctrl+Enter shortcut
  sqlInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const sql = sqlInput.value.trim();
      if (sql) executeQuery(sql);
    }
  });

  // Preset query buttons
  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      setPresetQuery(btn.dataset.sql);
    });
  });
}

export async function executeQuery(sql) {
  resultSection.hidden = false;
  resultCount.textContent = '';
  queryStats.textContent = 'Executing...';

  const start = performance.now();
  try {
    const data = await query(sql);
    const elapsed = performance.now() - start;

    resultCount.textContent = `(${data.length} rows)`;
    queryStats.textContent = `${data.length} rows in ${formatDuration(elapsed)}`;
    renderTable('result-table', data);
  } catch (err) {
    const elapsed = performance.now() - start;
    queryStats.textContent = `Error in ${formatDuration(elapsed)}`;
    resultCount.textContent = '';
    showError('result-table', err.message);
  }
}

export function setPresetQuery(sql) {
  sqlInput.value = sql;
  sqlInput.focus();
}

export function enableEditor() {
  sqlInput.disabled = false;
  btnExecute.disabled = false;
}
