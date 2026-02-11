import { query, registerFile, registerFileText } from './duckdb-client.js';

let sqlInput = null;

/** Initialize uploader: drag-and-drop, file input, sample data button */
export function initUploader() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnSample = document.getElementById('btn-load-sample');
  sqlInput = document.getElementById('sql-input');

  // Enable the sample button now that DuckDB is ready
  btnSample.disabled = false;

  // Drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  // File input change
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFileUpload(file);
    fileInput.value = '';
  });

  // Sample data button
  btnSample.addEventListener('click', loadSampleData);
}

/** Handle uploaded CSV or Parquet file */
async function handleFileUpload(file) {
  const name = file.name;
  const ext = name.split('.').pop().toLowerCase();

  if (!['csv', 'parquet', 'parq'].includes(ext)) {
    alert('Unsupported file type. Please use CSV or Parquet.');
    return;
  }

  const tableName = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

  const buffer = await file.arrayBuffer();
  await registerFile(name, buffer);

  if (ext === 'csv') {
    await query(`CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${name}')`);
  } else {
    await query(`CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_parquet('${name}')`);
  }

  await refreshTableList();
}

/** Load the built-in sample sales data */
async function loadSampleData() {
  const btn = document.getElementById('btn-load-sample');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  try {
    const res = await fetch('/sample-sales.csv');
    const text = await res.text();
    await registerFileText('sample-sales.csv', text);
    await query("CREATE OR REPLACE TABLE sales AS SELECT * FROM read_csv_auto('sample-sales.csv')");
    await refreshTableList();
    btn.textContent = 'Sample Loaded';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Load Sample Data';
    alert('Failed to load sample data: ' + err.message);
  }
}

/** Refresh the table list in the sidebar */
export async function refreshTableList() {
  const container = document.getElementById('table-list');
  const rows = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name"
  );

  if (rows.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = rows
    .map((r) => {
      const name = r.table_name;
      return `<span class="table-tag" data-table="${name}" style="cursor:pointer">${name}</span>`;
    })
    .join('');

  // Click a table tag to insert a SELECT query
  container.querySelectorAll('.table-tag').forEach((tag) => {
    tag.addEventListener('click', () => {
      if (sqlInput) {
        sqlInput.value = `SELECT * FROM ${tag.dataset.table} LIMIT 20`;
        sqlInput.focus();
      }
    });
  });
}
