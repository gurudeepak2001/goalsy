-- Supported baseline: 2026-09-10 persistent briefing views release (3ae0af4).
-- This release followed the account-hiding baseline and added cross-session
-- briefing view history. Its saved view uses a non-default timestamp.
\ir prior-schema.sql

CREATE TABLE briefing_views (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  briefing_id uuid NOT NULL,
  content_version text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX briefing_views_user_briefing_idx
  ON briefing_views(user_id, briefing_id);

INSERT INTO briefing_views (
  id, user_id, briefing_id, content_version, viewed_at
) VALUES (
  '50000000-0000-4000-8000-000000000002',
  'upgrade-fixture-user',
  '50000000-0000-4000-8000-000000000001',
  'upgrade-fixture-content-v1',
  '2026-09-11T12:00:00Z'
);