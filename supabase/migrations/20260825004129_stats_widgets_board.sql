-- Per-admin stats boards with public prepared widgets (seeded defaults).
-- account_id NULL = public prepared template; non-null = personal copy/custom.

CREATE TABLE IF NOT EXISTS stats_boards (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tab TEXT NOT NULL CHECK (
    tab IN (
      'overview',
      'members',
      'finances',
      'attendance',
      'program',
      'subscriptions',
      'trainers'
    )
  ),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, tab)
);

COMMENT ON TABLE stats_boards IS
  'Marks that an admin has initialized a personal stats board for a tab (even if empty).';

CREATE TABLE IF NOT EXISTS stats_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  tab TEXT NOT NULL CHECK (
    tab IN (
      'overview',
      'members',
      'finances',
      'attendance',
      'program',
      'subscriptions',
      'trainers'
    )
  ),
  metric_id TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_query JSONB,
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  w INTEGER NOT NULL DEFAULT 2,
  h INTEGER NOT NULL DEFAULT 2,
  min_w INTEGER NOT NULL DEFAULT 2,
  min_h INTEGER NOT NULL DEFAULT 2,
  max_h INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE stats_widgets IS
  'Stats board widgets. account_id NULL = public prepared; otherwise personal to that admin.';

COMMENT ON COLUMN stats_widgets.account_id IS
  'NULL for public prepared widgets shared as seed templates.';

CREATE INDEX IF NOT EXISTS idx_stats_widgets_account_tab
  ON stats_widgets (account_id, tab);

CREATE INDEX IF NOT EXISTS idx_stats_widgets_public_tab
  ON stats_widgets (tab)
  WHERE account_id IS NULL;

CREATE TRIGGER update_stats_widgets_updated_at
  BEFORE UPDATE ON stats_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed public prepared widgets (account_id NULL) matching former defaultBoard layouts.
INSERT INTO stats_widgets (
  id, account_id, tab, metric_id, params, custom_query,
  x, y, w, h, min_w, min_h, max_h
) VALUES
  (gen_random_uuid(), NULL, 'overview', 'kpi.period_revenue', '{}'::jsonb, NULL, 0, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'overview', 'kpi.avg_ticket', '{}'::jsonb, NULL, 2, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'overview', 'kpi.outstanding', '{}'::jsonb, NULL, 4, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'overview', 'kpi.attendance_rate', '{}'::jsonb, NULL, 0, 2, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'overview', 'kpi.fill_rate', '{}'::jsonb, NULL, 2, 2, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'overview', 'kpi.active_members', '{}'::jsonb, NULL, 4, 2, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'overview', 'chart.revenue_trend', '{}'::jsonb, NULL, 0, 4, 4, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'overview', 'chart.revenue_mix', '{"by":"plan"}'::jsonb, NULL, 0, 7, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'overview', 'chart.attendance_rates', '{}'::jsonb, NULL, 3, 7, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'overview', 'chart.attendance_breakdown', '{"by":"class"}'::jsonb, NULL, 0, 10, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'overview', 'table.expiring_subs', '{}'::jsonb, NULL, 3, 10, 3, 4, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'overview', 'table.session_burn', '{}'::jsonb, NULL, 0, 14, 3, 4, 2, 2, NULL),

  (gen_random_uuid(), NULL, 'members', 'kpi.active_members', '{}'::jsonb, NULL, 0, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'members', 'chart.member_growth', '{}'::jsonb, NULL, 2, 0, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'members', 'chart.member_status', '{}'::jsonb, NULL, 0, 3, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'members', 'table.top_guests', '{}'::jsonb, NULL, 3, 3, 3, 4, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'members', 'kpi.credit_wallet', '{}'::jsonb, NULL, 0, 7, 2, 2, 2, 2, 3),

  (gen_random_uuid(), NULL, 'finances', 'kpi.period_revenue', '{}'::jsonb, NULL, 0, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'finances', 'kpi.avg_ticket', '{}'::jsonb, NULL, 2, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'finances', 'kpi.collection_rate', '{}'::jsonb, NULL, 4, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'finances', 'kpi.outstanding', '{}'::jsonb, NULL, 0, 2, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'finances', 'chart.revenue_trend', '{}'::jsonb, NULL, 2, 2, 4, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'finances', 'chart.revenue_mix', '{"by":"plan"}'::jsonb, NULL, 0, 5, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'finances', 'chart.payment_volume', '{}'::jsonb, NULL, 3, 5, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'finances', 'table.plan_mix', '{}'::jsonb, NULL, 0, 8, 3, 4, 2, 2, NULL),

  (gen_random_uuid(), NULL, 'attendance', 'kpi.attendance_rate', '{}'::jsonb, NULL, 0, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'attendance', 'chart.attendance_rates', '{}'::jsonb, NULL, 2, 0, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'attendance', 'chart.booking_volume', '{"mode":"both"}'::jsonb, NULL, 0, 3, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'attendance', 'chart.attendance_breakdown', '{"by":"class"}'::jsonb, NULL, 3, 3, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'attendance', 'chart.schedule_peaks', '{"by":"day"}'::jsonb, NULL, 0, 6, 3, 3, 2, 2, NULL),

  (gen_random_uuid(), NULL, 'program', 'kpi.fill_rate', '{}'::jsonb, NULL, 0, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'program', 'chart.fill_by_class', '{}'::jsonb, NULL, 2, 0, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'program', 'chart.course_status', '{}'::jsonb, NULL, 0, 3, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'program', 'chart.schedule_peaks', '{"by":"day"}'::jsonb, NULL, 3, 3, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'program', 'table.fill_detail', '{}'::jsonb, NULL, 0, 6, 4, 4, 2, 2, NULL),

  (gen_random_uuid(), NULL, 'subscriptions', 'kpi.active_subs', '{}'::jsonb, NULL, 0, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'subscriptions', 'kpi.depleted_sessions', '{}'::jsonb, NULL, 2, 0, 2, 2, 2, 2, 3),
  (gen_random_uuid(), NULL, 'subscriptions', 'chart.sub_status', '{}'::jsonb, NULL, 0, 2, 3, 3, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'subscriptions', 'table.plan_mix', '{}'::jsonb, NULL, 3, 2, 3, 4, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'subscriptions', 'table.session_burn', '{}'::jsonb, NULL, 0, 6, 3, 4, 2, 2, NULL),
  (gen_random_uuid(), NULL, 'subscriptions', 'table.expiring_subs', '{}'::jsonb, NULL, 3, 6, 3, 4, 2, 2, NULL),

  (gen_random_uuid(), NULL, 'trainers', 'table.trainers', '{}'::jsonb, NULL, 0, 0, 6, 4, 2, 2, NULL);
