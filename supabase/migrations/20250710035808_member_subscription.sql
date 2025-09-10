-- View will be created below

CREATE OR REPLACE VIEW members_with_subscription_status AS
SELECT
  users.*,
  (
    SELECT status
    FROM subscriptions
    WHERE subscriptions.user_id = users.id
    ORDER BY
      CASE WHEN status = 'active' AND end_date > NOW() THEN 0 ELSE 1 END,
      end_date DESC
    LIMIT 1
  ) AS current_subscription_status
FROM users;