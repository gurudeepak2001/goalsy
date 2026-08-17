# Goalsy Executive — Knowledge Transfer (KT)
**Date:** August 18, 2026  
**App:** Goalsy Executive — AI-powered personal financial goals mobile app  
**Bundle ID:** `com.myui.goalsyexecutive`  
**Team:** MyUI LLC  

---

## 1. What Is Goalsy Executive?

A premium iOS/Android mobile app that helps users set, track, and achieve long-term financial goals. The app presents a **"financial executive dashboard"** — giving users an intelligent, data-driven view of their financial life with goal tracking, a proprietary score, AI-generated daily briefings, and push notifications.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Capacitor 8 (native iOS + Android shell around a React web app) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend API | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Clerk (dev instance: `bursting-hedgehog-64.clerk.accounts.dev`) |
| Push (iOS) | APNs via HTTP/2 + `jose` (ES256 JWT signing) |
| Monorepo | pnpm workspaces |
| CI | GitHub Actions |

---

## 3. App Architecture

```
pnpm monorepo
├── artifacts/goalsy-executive/   ← React + Capacitor frontend
│   ├── src/pages/                ← All screens
│   ├── src/components/           ← Shared UI components
│   ├── src/lib/pushNotifications.ts  ← APNs/FCM device registration
│   ├── ios/App/                  ← Xcode project (Swift wrapper)
│   └── android/app/              ← Android Gradle project (Java wrapper)
│
├── artifacts/api-server/         ← Express REST API
│   ├── src/routes/               ← One file per domain
│   └── src/lib/                  ← Shared logic (score, push, goal-behind check)
│
└── lib/
    ├── db/                       ← Drizzle schema + migrations
    └── api-client-react/         ← Auto-generated typed API client
```

---

## 4. Database Schema (PostgreSQL)

| Table | Purpose |
|---|---|
| `user_profiles` | Name, avatar, income, monthly expenses |
| `financial_profiles` | Savings rate, net worth, expense ratio |
| `goals` | Financial goals (name, type, amounts, dates, priority) |
| `goal_progress_entries` | Weekly milestone confirmations per goal |
| `score_snapshots` | Historical Goalsy Score over time |
| `daily_missions` | Daily action items (complete/skip) |
| `bills` | Recurring bill tracking |
| `briefings` | Scheduled AI briefing records |
| `notifications` | In-app notification bell items |
| `notification_preferences` | Per-user opt-in/out per notification type |
| `push_tokens` | APNs/FCM device tokens for push delivery |

---

## 5. Screens & Features

### 🏠 Today (Home)
- Date-based greeting with user's name
- Total balance display and weekly change
- **Goalsy Score** pulse card → links to Score screen
- Average goal progress across all active goals
- Today's Agenda: next unpaid bill + next briefing
- **Daily Mission** from the API — complete (+2 score) or skip with reason

### 🎯 Goals Overview (Master Roadmap)
**Goal types:** Home Purchase, Retirement, Education, Emergency Fund, Investment Portfolio, Auto Purchase, Other

Each goal card shows:
- Type icon, name, priority/pin
- Current vs. target amount + progress bar
- Monthly contribution required
- Projected completion date
- **Behind status** (red indicator)
- Milestones

**Creating a goal:** Name + Target Amount required. Current Amount, Monthly Contribution, and Target Date are optional (contribution and date auto-fill from each other with feasibility warnings).

**Contribution summary bar** at top: total monthly + weekly required across all active goals.

### 📋 Goal Detail
- Editable target amount and contribution
- Progress bar with 25/50/75/100% tick marks
- **Status:** Complete / Ahead (≥105%) / On Track / Behind (<90%) / No Data
  - 3-day grace window for brand-new goals
- **Roadmap section:** Required monthly, estimated completion date (labelled *"Estimated from monthly contribution"*), plan steps
- **Weekly milestone log:** expected cumulative amounts by week; user confirms actual saved amounts; explicit low confirmations trigger "behind" status
- **Progress chart** appears after 2+ confirmations (expected vs. confirmed)

### 🤖 Strategic Intelligence (AI Home)
- Top-priority goal analysis
- Strategic recommendation with confidence level (e.g. "Boost this goal" / "Trim expenses")
- Year-end net-worth forecast
- Contribution scenario modelling
- Daily cash-flow analysis
- ⚠️ **All logic is local/deterministic computation** — no LLM calls are made on this screen

### 📊 Goalsy Score
- **0–1000 proprietary financial-readiness score** (not a credit score)
- **Score breakdown (1000 pts max):**
  - Savings rate — 250 pts (% of income saved, capped at 40%)
  - Goal momentum — 250 pts (% of active goals with contributions)
  - Expense ratio — 200 pts (full pts below 50% ratio, zero above 90%)
  - Net worth — 150 pts (logarithmic scale)
  - Mission completions — 150 pts (5 pts each, capped)
- Score history chart (90D / 1Y / ALL)
- Improvement drivers + achievements

### 💊 Financial Health
- Cash-flow analysis
- Credit score summary
- Debt strategy overview
- Emergency fund tracker
- Income vs. expenses bar chart

### 🔔 Notifications
- In-app bell icon with unread count
- **Behind-goal alerts:** auto-created when goal falls below 90% of expected pace
- Push notifications: same behind-goal trigger fires APNs push to all registered devices

---

## 6. Backend API Routes

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/profile` | User profile |
| PUT | `/api/profile` | Update profile |
| GET/PUT | `/api/financial-profile` | Income, expenses, savings rate, net worth |
| GET | `/api/goals` | List all goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal (amounts, contribution, date) |
| DELETE | `/api/goals/:id` | Delete goal |
| POST | `/api/goals/:id/progress` | Add weekly milestone confirmation |
| GET | `/api/score` | Current score + drivers |
| GET | `/api/score/history` | Score snapshots (up to 90) |
| GET | `/api/missions` | Daily missions |
| POST | `/api/missions/:id/complete` | Mark mission complete |
| POST | `/api/missions/:id/skip` | Skip mission with reason |
| GET | `/api/notifications` | Fetch + auto-generate behind-goal alerts |
| PUT | `/api/notifications/:id/dismiss` | Dismiss notification |
| GET/PUT | `/api/notification-preferences` | Opt-in/out per notification type |
| GET | `/api/bills` | Bill list |
| GET | `/api/briefings` | Briefing records |
| POST | `/api/push-tokens` | Register device token |
| DELETE | `/api/push-tokens/:token` | Deregister device token |

---

## 7. Push Notifications

### How it works
1. On sign-in, the app calls `registerPushNotifications(getToken)`
2. iOS prompts for permission → registers with APNs → returns a device token
3. Token is POSTed to `POST /api/push-tokens` (authenticated, upserted)
4. When `GET /api/notifications` detects a goal is behind, it inserts an in-app notification **and** fires a push to all stored tokens for that user
5. Tapping the push navigates directly to the goal's detail screen via hash routing

### APNs signing
- Uses HTTP/2 + `jose` library (ES256) — no third-party push service needed
- Provider JWT is cached for 50 minutes (valid for 60), then rotated
- Single HTTP/2 session reused per process lifetime; auto-reconnects on error

### ⚠️ Requires user setup to go live
1. **Xcode** → Target → Signing & Capabilities → **+ Push Notifications**
2. **Apple Developer Portal** → Certificates, IDs & Profiles → Keys → create key with APNs enabled → download `.p8` (one-time)
3. **Replit Secrets** → add:
   - `APNS_KEY_P8` — full `.p8` file contents (including `-----BEGIN/END-----` lines)
   - `APNS_KEY_ID` — 10-character Key ID
   - `APNS_TEAM_ID` — 10-character Team ID (Account → Membership)
4. Test on a **real device** (simulators cannot receive APNs pushes)

Until secrets are set, the push code logs a warning and falls back to in-app-only — nothing breaks.

---

## 8. Authentication (Clerk)

- Clerk handles sign-up, sign-in, and session management
- **Native Capacitor issue solved:** `capacitor://localhost` is allowlisted in Clerk's Native Application settings; no proxy URL needed
- `__clerk_db_jwt` is persisted to `@capacitor/preferences` (native key-value store) on every token refresh, and restored into the Clerk URL on cold start so sessions survive app restarts
- All API routes use `requireAuth` middleware which validates the Clerk JWT via JWKS (`jose`)

---

## 9. iOS & Android Native

| Item | Value |
|---|---|
| Bundle ID | `com.myui.goalsyexecutive` |
| App Name | Goalsy |
| iOS minimum | iOS 15 |
| Clerk Native App | `capacitor://localhost` redirect |
| Xcode team | MyUI LLC |
| SPM deps | `capacitor-swift-pm` 8.4.2, `CapacitorPreferences`, `CapacitorPushNotifications` |
| Android package | `com.myui.goalsyexecutive` |
| Android main class | `com.myui.goalsyexecutive.MainActivity` |

**TestFlight:** App is being distributed via TestFlight under MyUI LLC. New archive needed after the bundle ID change to `com.myui.goalsyexecutive` — requires a new App Store Connect record.

---

## 10. CI / GitHub Actions

| Workflow | What it tests |
|---|---|
| `api-server-test.yml` | API server unit tests (Vitest, pnpm v10) |
| `frontend-typecheck.yml` | TypeScript typecheck across all packages |
| `ios-ci.yml` | Builds Xcode project + runs unit tests on macOS runner |
| `ios-session-restore-tests.yml` | Clerk cookie persistence + session restore UI tests |
| `rotate-clerk-test-cookies.yml` | Rotates test session cookies for CI |

**Key CI quirk:** pnpm installs `@capacitor/preferences` and `@capacitor/push-notifications` as symlinks. SPM on macOS won't follow symlinks for local path deps — CI dereferences them with `cp -r` before xcodebuild runs.

---

## 11. What Is Live vs. Hardcoded

| Feature | Status |
|---|---|
| Goal CRUD + progress tracking | ✅ Live (PostgreSQL) |
| Goalsy Score calculation | ✅ Live (API) |
| Daily Missions | ✅ Live (API) |
| In-app notifications + behind detection | ✅ Live (API) |
| Push notifications (infra) | ✅ Built — needs APNs credentials + Xcode capability |
| Briefings | ✅ DB-backed — scheduling/content TBD |
| Strategic Intelligence screen | ⚠️ Deterministic computation (no LLM calls yet) |
| Financial Health screen | ⚠️ Hardcoded demo data (credit score, cash flow, debt) |
| Today screen balance/cash flow | ⚠️ Hardcoded (no Plaid integration yet) |

---

## 12. Tester Feedback (Julian Brinkley) — Resolved

| Feedback | Resolution |
|---|---|
| "Where is this target date coming from?" | Added "Estimated from monthly contribution" sub-label on Goal Detail + hint text on Create Goal form when date is auto-filled |
| "Does the user get notifications on these dates?" | Push notification infrastructure built end-to-end; fires when goal falls behind |
| "Auto purchase or should be a type as well?" | `auto_purchase` (Auto Purchase) already existed as a goal type — no change needed |

---

## 13. Outstanding / Next Steps

| # | Item | Priority |
|---|---|---|
| 1 | Add APNs credentials to Replit Secrets + Xcode Push capability | 🔴 Blocks push delivery |
| 2 | Archive + upload new build (`com.myui.goalsyexecutive`) to TestFlight | 🔴 Blocks tester access |
| 3 | 7-day target-date-approaching push notification | 🟡 Proposed task |
| 4 | Replace hardcoded Financial Health data with real API data | 🟡 Pre-launch |
| 5 | Connect Plaid or equivalent for real balance/cash flow | 🟡 Pre-launch |
| 6 | LLM integration for Strategic Intelligence screen recommendations | 🟡 Pre-launch |
| 7 | Weekly confirmation prompt (remind users to log progress) | 🟡 Proposed task |
| 8 | Production Clerk instance (replace `pk_test_` with `pk_live_`) | 🔴 Before App Store submission |
