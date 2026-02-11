import { initDuckDB } from './duckdb-client.js';
import { initTabs, showStatus } from './ui.js';
import { initEditor, enableEditor } from './editor.js';
import { initUploader } from './uploader.js';
import { initDashboard } from './dashboard.js';

async function main() {
  // Initialize tab switching
  initTabs();

  // Initialize editor event listeners (while DuckDB loads)
  initEditor();

  // Initialize DuckDB
  try {
    showStatus('Initializing DuckDB...', 'info');
    await initDuckDB();
    showStatus('Ready', 'success');

    // Enable interactive elements
    enableEditor();
    initUploader();
    initDashboard();
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    console.error('Failed to initialize DuckDB:', err);
  }
}

main();
