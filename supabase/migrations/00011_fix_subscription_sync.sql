-- Fix subscription sync for user who completed checkout
-- This updates the subscription record with the correct Stripe IDs

UPDATE subscriptions
SET
  stripe_customer_id = 'cus_TqxqIVTSKhulqP',
  stripe_subscription_id = 'sub_1StFvKKMOtrQIgvlazzVxI08',
  status = 'trialing',
  trial_start = '2026-01-24T17:05:59Z',
  trial_end = '2026-02-23T17:05:59Z',
  current_period_start = '2026-01-24T17:05:59Z',
  current_period_end = '2026-02-23T17:05:59Z'
WHERE user_id = '71bc8c87-b095-46eb-b90c-ae599bb46b32';

-- If no record exists, insert one
INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  trial_start,
  trial_end,
  current_period_start,
  current_period_end
)
SELECT
  '71bc8c87-b095-46eb-b90c-ae599bb46b32',
  'cus_TqxqIVTSKhulqP',
  'sub_1StFvKKMOtrQIgvlazzVxI08',
  'trialing',
  '2026-01-24T17:05:59Z',
  '2026-02-23T17:05:59Z',
  '2026-01-24T17:05:59Z',
  '2026-02-23T17:05:59Z'
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE user_id = '71bc8c87-b095-46eb-b90c-ae599bb46b32'
);
