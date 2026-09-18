-- Extra public prepared stats widgets (account_id NULL) for expanded metric catalog.
-- Does not modify personal boards. Apply manually — do not use supabase db push.

INSERT INTO stats_widgets (
  id, account_id, tab, metric_id, params, custom_query,
  x, y, w, h, min_w, min_h, max_h
)
SELECT gen_random_uuid(), NULL, v.tab, v.metric_id, '{}'::jsonb, NULL,
       v.x, v.y, v.w, v.h, 2, 2, v.max_h
FROM (
  VALUES
    -- members extras
    ('members', 'kpi.avg_age', 0, 8, 2, 2, 3),
    ('members', 'chart.age_buckets', 2, 8, 3, 3, NULL),
    ('members', 'chart.professions', 0, 11, 3, 3, NULL),
    ('members', 'chart.discovery_sources', 3, 11, 3, 3, NULL),
    -- finances extras
    ('finances', 'kpi.arpu', 0, 8, 2, 2, 3),
    ('finances', 'kpi.credit_net', 2, 8, 2, 2, 3),
    ('finances', 'chart.payment_status', 4, 8, 2, 3, NULL),
    ('finances', 'chart.credit_trend', 0, 11, 3, 3, NULL),
    -- attendance extras
    ('attendance', 'kpi.no_show_rate', 0, 8, 2, 2, 3),
    ('attendance', 'kpi.checkin_conversion', 2, 8, 2, 2, 3),
    ('attendance', 'chart.session_source_mix', 4, 8, 2, 3, NULL),
    ('attendance', 'chart.reg_status_mix', 0, 11, 3, 3, NULL),
    -- program extras
    ('program', 'kpi.capacity_waste', 0, 8, 2, 2, 3),
    ('program', 'chart.fill_by_category', 2, 8, 3, 3, NULL),
    ('program', 'chart.courses_over_time', 0, 11, 3, 3, NULL),
    -- subscriptions extras
    ('subscriptions', 'kpi.churn_rate', 0, 8, 2, 2, 3),
    ('subscriptions', 'kpi.seat_utilization', 2, 8, 2, 2, 3),
    ('subscriptions', 'chart.invite_status', 4, 8, 2, 3, NULL),
    ('subscriptions', 'chart.sub_starts_trend', 0, 11, 3, 3, NULL),
    -- trainers extras
    ('trainers', 'kpi.active_trainers', 0, 0, 2, 2, 3),
    ('trainers', 'chart.trainer_courses', 2, 0, 3, 3, NULL),
    ('trainers', 'chart.trainer_fill', 0, 3, 3, 3, NULL),
    -- overview extras
    ('overview', 'kpi.arpu', 0, 14, 2, 2, 3),
    ('overview', 'kpi.churn_rate', 2, 14, 2, 2, 3),
    ('overview', 'kpi.seat_utilization', 4, 14, 2, 2, 3)
) AS v(tab, metric_id, x, y, w, h, max_h)
WHERE NOT EXISTS (
  SELECT 1
  FROM stats_widgets sw
  WHERE sw.account_id IS NULL
    AND sw.tab = v.tab
    AND sw.metric_id = v.metric_id
);
