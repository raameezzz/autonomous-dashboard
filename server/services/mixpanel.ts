// Snapshot of the "Autonomous Quick Insights" Mixpanel board (project 1131876, dashboard 7311629).
// Captured 2026-05-19 via the Mixpanel MCP. Refresh by re-pulling Get-Report results.
// Live API integration via Mixpanel Service Account is a follow-up — credentials not configured yet.

export interface MixpanelMetric {
  key: string;
  label: string;
  value: number;
  format: 'number' | 'currency' | 'percent';
  hint?: string;
  group: 'users' | 'revenue' | 'churn' | 'applications' | 'lifecycle' | 'csat';
  row?: number;
}

export interface MixpanelBreakdown {
  key: string;
  label: string;
  rows: Array<{ label: string; value: number }>;
  group: 'users' | 'revenue' | 'churn' | 'applications' | 'lifecycle' | 'csat';
}

export interface AutonomousSnapshot {
  source: {
    project_id: number;
    dashboard_id: number;
    dashboard_title: string;
    captured_at: string;
  };
  metrics: MixpanelMetric[];
  breakdowns: MixpanelBreakdown[];
}

const SNAPSHOT: AutonomousSnapshot = {
  source: {
    project_id: 1131876,
    dashboard_id: 7311629,
    dashboard_title: 'Autonomous Quick Insights',
    captured_at: '2026-05-19',
  },
  metrics: [
    { key: 'active_users', label: 'Autonomous Active Users', value: 1041, format: 'number', hint: 'Total user profiles', group: 'users', row: 1 },
    { key: 'active_with_apps', label: 'Active Users With Apps', value: 901, format: 'number', hint: 'Users running at least one app', group: 'users', row: 1 },
    { key: 'active_without_apps', label: 'Active Users W/O Apps', value: 177, format: 'number', hint: 'Subscribed but no live apps', group: 'users', row: 1 },
    { key: 'active_old_pricing', label: 'Old Pricing Active Users', value: 1024, format: 'number', hint: 'Total of user profiles', group: 'users', row: 2 },
    { key: 'active_new_pricing', label: 'New Pricing Active Users', value: 194, format: 'number', hint: 'Total of user profiles', group: 'users', row: 2 },
    { key: 'new_users_7d', label: '7 Days New Users', value: 23, format: 'number', hint: 'Unique users via fmn_plan_subscribe', group: 'lifecycle' },
    { key: 'plan_switchers_6mo', label: 'Plan Switchers (6 mo)', value: 256, format: 'number', hint: 'Users who changed plans', group: 'lifecycle' },

    { key: 'monthly_run_rate', label: 'Monthly Run Rate', value: 139556.14, format: 'currency', hint: 'Sum of fmp_run_rate', group: 'revenue' },
    { key: 'annual_run_rate', label: 'Annual Run Rate', value: 1674673.68, format: 'currency', hint: 'Projected from MRR', group: 'revenue' },
    { key: 'autonomous_arr', label: 'Autonomous Annual Run Rate', value: 1825070.52, format: 'currency', hint: 'Autoscale ARR', group: 'revenue' },
    { key: 'plan_revenue', label: 'Plan Revenue', value: 130725.45, format: 'currency', hint: 'Run rate minus overages', group: 'revenue' },
    { key: 'overage_revenue', label: 'Overage Revenue', value: 21364.34, format: 'currency', hint: 'Sum of fmp_overage_cost', group: 'revenue' },

    { key: 'churn_7d', label: '7 Day Churn', value: 15, format: 'number', hint: 'Churn form submissions, 7d', group: 'churn' },
    { key: 'churn_total', label: 'Total Churn', value: 2452, format: 'number', hint: 'All churn form submissions', group: 'churn' },

    { key: 'apps_total', label: 'Total Applications', value: 2363, format: 'number', hint: 'Sum of fmp_app_count', group: 'applications' },
    { key: 'apps_old_pricing', label: 'Apps on Old Pricing', value: 2096, format: 'number', hint: 'Total on user profiles', group: 'applications' },
    { key: 'apps_new_pricing', label: 'Apps on New Pricing', value: 251, format: 'number', hint: 'Total on user profiles', group: 'applications' },
  ],
  breakdowns: [
    {
      key: 'users_by_quarter',
      label: 'Users By Quarter',
      group: 'users',
      rows: [
        { label: 'Q2 2022', value: 2 },
        { label: 'Q3 2022', value: 22 },
        { label: 'Q4 2022', value: 25 },
        { label: 'Q1 2023', value: 36 },
        { label: 'Q2 2023', value: 223 },
        { label: 'Q3 2023', value: 191 },
        { label: 'Q4 2023', value: 347 },
        { label: 'Q1 2024', value: 626 },
        { label: 'Q2 2024', value: 504 },
        { label: 'Q3 2024', value: 625 },
        { label: 'Q4 2024', value: 472 },
        { label: 'Q1 2025', value: 555 },
        { label: 'Q2 2025', value: 615 },
        { label: 'Q3 2025', value: 479 },
        { label: 'Q4 2025', value: 358 },
        { label: 'Q1 2026', value: 246 },
        { label: 'Q2 2026', value: 99 },
      ],
    },
    {
      key: 'churn_reasons',
      label: 'Churn Reasons',
      group: 'churn',
      rows: [
        { label: 'Other', value: 754 },
        { label: 'No longer need the product', value: 599 },
        { label: 'Website performance is poor', value: 447 },
        { label: 'Just testing the product', value: 436 },
        { label: 'Might subscribe later', value: 313 },
        { label: 'Product is too expensive', value: 307 },
        { label: "Product isn't up to par", value: 231 },
        { label: 'Customer support unsatisfactory', value: 118 },
        { label: 'Multiple technical errors', value: 31 },
        { label: 'Website running slow', value: 26 },
        { label: 'Autoscaling not working', value: 16 },
        { label: 'Frequent downtimes', value: 9 },
      ],
    },
  ],
};

export function getAutonomousSnapshot(): AutonomousSnapshot {
  return SNAPSHOT;
}
