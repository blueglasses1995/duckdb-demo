import { query } from './duckdb-client.js';
import { renderTable } from './ui.js';

const panels = [
  {
    id: 'panel-monthly',
    title: 'Monthly Revenue + Moving Average',
    sql: `SELECT
  EXTRACT(MONTH FROM date::DATE) as month,
  SUM(amount) as monthly_revenue,
  ROUND(AVG(SUM(amount)) OVER (ORDER BY EXTRACT(MONTH FROM date::DATE) ROWS 2 PRECEDING), 0) as moving_avg_3m
FROM sales
GROUP BY EXTRACT(MONTH FROM date::DATE)
ORDER BY month`,
  },
  {
    id: 'panel-category',
    title: 'Category Breakdown (ROLLUP)',
    sql: `SELECT
  COALESCE(category, '== Total ==') as category,
  SUM(amount) as total_revenue,
  COUNT(*) as transaction_count,
  ROUND(AVG(amount), 0) as avg_amount
FROM sales
GROUP BY ROLLUP(category)
ORDER BY GROUPING(category), total_revenue DESC`,
  },
  {
    id: 'panel-mom',
    title: 'Month-over-Month Change',
    sql: `SELECT
  month,
  monthly_revenue,
  prev_month_revenue,
  CASE WHEN prev_month_revenue > 0
    THEN ROUND((monthly_revenue - prev_month_revenue) * 100.0 / prev_month_revenue, 1)
    ELSE NULL END as mom_change_pct
FROM (
  SELECT
    EXTRACT(MONTH FROM date::DATE) as month,
    SUM(amount) as monthly_revenue,
    LAG(SUM(amount)) OVER (ORDER BY EXTRACT(MONTH FROM date::DATE)) as prev_month_revenue
  FROM sales
  GROUP BY EXTRACT(MONTH FROM date::DATE)
)
ORDER BY month`,
  },
  {
    id: 'panel-top-products',
    title: 'Top 5 Products',
    sql: `SELECT product, category, total_revenue, rank
FROM (
  SELECT
    product,
    category,
    SUM(amount) as total_revenue,
    RANK() OVER (ORDER BY SUM(amount) DESC) as rank
  FROM sales
  GROUP BY product, category
)
WHERE rank <= 5
ORDER BY rank`,
  },
];

export function initDashboard() {
  // Build panel HTML shells
  const container = document.getElementById('dashboard-content');
  container.innerHTML = panels
    .map(
      (p) => `<div class="dashboard-panel" id="${p.id}">
      <h3>${p.title}</h3>
      <div id="${p.id}-table"></div>
    </div>`
    )
    .join('');

  // Auto-refresh when switching to dashboard tab
  window.addEventListener('tabchange', (e) => {
    if (e.detail === 'dashboard') {
      refreshDashboard();
    }
  });
}

export async function refreshDashboard() {
  // Check if sales table exists
  try {
    const tables = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='main' AND table_name='sales'"
    );
    if (tables.length === 0) {
      document.getElementById('dashboard-content').innerHTML =
        '<p class="placeholder-message">Load sample data first to see the dashboard.</p>';
      // Re-create panel shells for next time
      return;
    }
  } catch {
    return;
  }

  // Ensure panel shells exist
  const container = document.getElementById('dashboard-content');
  if (!document.getElementById(panels[0].id)) {
    container.innerHTML = panels
      .map(
        (p) => `<div class="dashboard-panel" id="${p.id}">
        <h3>${p.title}</h3>
        <div id="${p.id}-table"></div>
      </div>`
      )
      .join('');
  }

  // Render all panels in parallel
  await Promise.all(panels.map((p) => renderPanel(p)));
}

async function renderPanel(panel) {
  try {
    const data = await query(panel.sql);
    renderTable(`${panel.id}-table`, data);
  } catch (err) {
    const el = document.getElementById(`${panel.id}-table`);
    el.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
}
