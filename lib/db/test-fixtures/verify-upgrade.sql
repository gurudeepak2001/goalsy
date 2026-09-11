\set ON_ERROR_STOP on

-- Shared by every supported historical baseline. Common saved records use the
-- same assertions; the one release-specific record has an explicit expectation.
SELECT set_config(
  'goalsy.fixture_expect_briefing_view',
  :'expect_briefing_view',
  false
);

DO $$
DECLARE
  preserved_count integer;
  expect_briefing_view boolean :=
    current_setting('goalsy.fixture_expect_briefing_view')::boolean;
BEGIN
  SELECT count(*) INTO preserved_count
  FROM plaid_items i
  JOIN plaid_accounts a
    ON a.item_id = i.id AND a.user_id = i.user_id
  JOIN plaid_credit_liabilities l
    ON l.account_id = a.id AND l.user_id = a.user_id
  WHERE i.id = '10000000-0000-4000-8000-000000000001'
    AND i.user_id = 'upgrade-fixture-user'
    AND i.plaid_item_id = 'upgrade-fixture-item'
    AND i.encrypted_access_token = 'encrypted-upgrade-fixture-token'
    AND i.institution_name = 'Upgrade Fixture Bank'
    AND a.id = '10000000-0000-4000-8000-000000000002'
    AND a.name = 'Saved Credit Card'
    AND a.current_balance = 725.5
    AND a.is_hidden = true
    AND l.minimum_payment_amount = 45.5
    AND abs(l.apr_percentage - 19.99) < 0.001
    AND l.next_payment_due_date = '2026-10-15';
  IF preserved_count <> 1 THEN
    RAISE EXCEPTION 'Plaid saved data was not preserved by the schema upgrade';
  END IF;

  SELECT count(*) INTO preserved_count
  FROM financial_profiles
  WHERE id = '20000000-0000-4000-8000-000000000001'
    AND user_id = 'upgrade-fixture-user'
    AND annual_income = 120000
    AND monthly_expenses = 4800
    AND emergency_fund_amount IS NULL
    AND emergency_fund_months = 3
    AND net_worth = 87500
    AND savings_rate = 1800
    AND risk_tolerance = 'moderate'
    AND primary_goal_type = 'emergency_fund'
    AND savings_milestone_100k_at = '2026-08-21T14:45:00Z';
  IF preserved_count <> 1 THEN
    RAISE EXCEPTION 'Financial profile was not preserved by the schema upgrade';
  END IF;

  SELECT count(*) INTO preserved_count
  FROM goals
  WHERE id = '30000000-0000-4000-8000-000000000001'
    AND user_id = 'upgrade-fixture-user'
    AND name = 'Preserved Emergency Fund'
    AND target_amount = 20000
    AND current_amount = 7250
    AND opening_amount = 1250
    AND monthly_contribution = 600
    AND payment_frequency = 'weekly'
    AND target_date = '2027-12-31'
    AND status = 'active';
  IF preserved_count <> 1 THEN
    RAISE EXCEPTION 'Goal was not preserved by the schema upgrade';
  END IF;

  SELECT count(*) INTO preserved_count
  FROM daily_missions
  WHERE id = '40000000-0000-4000-8000-000000000001'
    AND user_id = 'upgrade-fixture-user'
    AND mission_date = '2026-09-10'
    AND title = 'Review saved accounts'
    AND status = 'completed'
    AND completed_at = '2026-09-10T15:30:00Z';
  IF preserved_count <> 1 THEN
    RAISE EXCEPTION 'Mission was not preserved by the schema upgrade';
  END IF;

  SELECT count(*) INTO preserved_count
  FROM briefings b
  WHERE b.id = '50000000-0000-4000-8000-000000000001'
    AND b.user_id = 'upgrade-fixture-user'
    AND b.title = 'Saved Monthly Briefing'
    AND b.scheduled_date = '2026-09-30'
    AND b.type = 'monthly_summary'
    AND b.summary = 'A briefing saved before the schema upgrade.';
  IF preserved_count <> 1 THEN
    RAISE EXCEPTION 'Briefing was not preserved by the schema upgrade';
  END IF;

  SELECT count(*) INTO preserved_count
  FROM briefing_views
  WHERE user_id = 'upgrade-fixture-user'
    AND briefing_id = '50000000-0000-4000-8000-000000000001'
    AND content_version = 'upgrade-fixture-content-v1'
    AND viewed_at = '2026-09-11T12:00:00Z';
  IF preserved_count <> (CASE WHEN expect_briefing_view THEN 1 ELSE 0 END) THEN
    RAISE EXCEPTION
      'Briefing view expectation was not preserved by the schema upgrade';
  END IF;
END $$;