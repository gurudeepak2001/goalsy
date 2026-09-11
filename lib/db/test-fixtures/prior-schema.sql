-- Supported baseline: 2026-09-10 account-hiding release (eafc434).
-- This reproduces the saved-data tables from that release before persistent
-- briefing views and Emergency Fund profile fields were introduced.

CREATE TABLE plaid_items (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  plaid_item_id text NOT NULL UNIQUE,
  encrypted_access_token text NOT NULL,
  institution_id text,
  institution_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_items_id_user_id_unique UNIQUE (id, user_id)
);

CREATE TABLE plaid_accounts (
  id uuid PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  plaid_account_id text NOT NULL UNIQUE,
  name text NOT NULL,
  official_name text,
  mask text,
  type text NOT NULL,
  subtype text,
  current_balance real,
  available_balance real,
  credit_limit real,
  currency_code text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_accounts_item_owner_fk
    FOREIGN KEY (item_id, user_id)
    REFERENCES plaid_items(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT plaid_accounts_id_user_id_unique UNIQUE (id, user_id)
);

CREATE TABLE plaid_credit_liabilities (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES plaid_accounts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  minimum_payment_amount real,
  apr_percentage real,
  apr_type text,
  next_payment_due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_credit_liabilities_account_owner_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES plaid_accounts(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT plaid_credit_liabilities_account_id_unique UNIQUE (account_id)
);

CREATE TABLE financial_profiles (
  id uuid PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  annual_income integer,
  monthly_expenses integer,
  net_worth integer,
  savings_rate real,
  risk_tolerance text,
  primary_goal_type text,
  savings_milestone_100k_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_profiles_user_id_unique UNIQUE (user_id)
);

CREATE TABLE goals (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  target_amount integer NOT NULL,
  current_amount integer NOT NULL DEFAULT 0,
  opening_amount integer NOT NULL DEFAULT 0,
  monthly_contribution integer NOT NULL DEFAULT 0,
  payment_frequency text NOT NULL DEFAULT 'monthly',
  target_date text,
  status text NOT NULL DEFAULT 'active',
  priority integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE daily_missions (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  mission_date text NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'pending',
  skip_reason text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX daily_missions_user_date_idx
  ON daily_missions(user_id, mission_date);

CREATE TABLE briefings (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  title text NOT NULL,
  scheduled_date text NOT NULL,
  type text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO plaid_items (
  id, user_id, plaid_item_id, encrypted_access_token, institution_id, institution_name
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'upgrade-fixture-user',
  'upgrade-fixture-item',
  'encrypted-upgrade-fixture-token',
  'ins_upgrade',
  'Upgrade Fixture Bank'
);

INSERT INTO plaid_accounts (
  id, item_id, user_id, plaid_account_id, name, mask, type, subtype,
  current_balance, available_balance, credit_limit, currency_code, is_hidden
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'upgrade-fixture-user',
  'upgrade-fixture-account',
  'Saved Credit Card',
  '4242',
  'credit',
  'credit card',
  725.5,
  1250.25,
  5000,
  'USD',
  true
);

INSERT INTO plaid_credit_liabilities (
  id, account_id, user_id, minimum_payment_amount, apr_percentage, apr_type,
  next_payment_due_date
) VALUES (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002',
  'upgrade-fixture-user',
  45.5,
  19.99,
  'purchase_apr',
  '2026-10-15'
);

INSERT INTO financial_profiles (
  id, user_id, annual_income, monthly_expenses, net_worth, savings_rate,
  risk_tolerance, primary_goal_type, savings_milestone_100k_at
) VALUES (
  '20000000-0000-4000-8000-000000000001',
  'upgrade-fixture-user',
  120000,
  4800,
  87500,
  1800,
  'moderate',
  'emergency_fund',
  '2026-08-21T14:45:00Z'
);

INSERT INTO goals (
  id, user_id, name, type, target_amount, current_amount, opening_amount,
  monthly_contribution, payment_frequency, target_date, status, priority
) VALUES (
  '30000000-0000-4000-8000-000000000001',
  'upgrade-fixture-user',
  'Preserved Emergency Fund',
  'emergency_fund',
  20000,
  7250,
  1250,
  600,
  'weekly',
  '2027-12-31',
  'active',
  1
);

INSERT INTO daily_missions (
  id, user_id, mission_date, title, description, category, status, completed_at
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  'upgrade-fixture-user',
  '2026-09-10',
  'Review saved accounts',
  'Confirm balances before planning.',
  'review',
  'completed',
  '2026-09-10T15:30:00Z'
);

INSERT INTO briefings (
  id, user_id, title, scheduled_date, type, summary
) VALUES (
  '50000000-0000-4000-8000-000000000001',
  'upgrade-fixture-user',
  'Saved Monthly Briefing',
  '2026-09-30',
  'monthly_summary',
  'A briefing saved before the schema upgrade.'
);
