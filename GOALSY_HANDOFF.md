# Goalsy — Project Handoff

**Prepared for:** Lakhan  
**Purpose:** Complete engineering and product handoff for Plaid and credit-score integration  
**Repository:** `github.com/gurudeepak2001/goalsy`  
**Branch reviewed:** `main`  
**Codebase date:** September 2, 2026  
**Current HEAD:** `c17a0ed`  

> This document is based on the current repository and the project decisions recorded during the prior implementation work. It separates facts verified in code from facts that must be confirmed in Replit, Clerk, Apple Developer, App Store Connect, and TestFlight dashboards.

---

## 0. Start here: the important current reality

Goalsy has a functioning mobile-first product shell and a partially live backend, but it is **not yet a production-ready connected-finance app**.

The current product combines:

- Real Clerk authentication
- Real PostgreSQL-backed goals, progress, missions, score snapshots, bills, expenses, notifications, and profile data
- Real React/Express/Drizzle plumbing
- Real Capacitor iOS and Android projects
- Real APNs/FCM registration infrastructure
- Several screens that still use hardcoded or mock financial data
- No Plaid implementation yet
- No credit-score provider implementation yet
- No real money movement, bill payment, or autopay

The old `replit.md` says that all screens are static and that the API is unused. That is stale. The current screens use generated React Query hooks and the API for many domains, although the financial-health and account-connection portions still contain mock data.

The immediate workstream for Lakhan is:

1. Build secure Plaid connectivity and financial-data synchronization.
2. Build a separate credit-score provider integration.
3. Replace every mock financial value with live data or an explicit unavailable state.
4. Preserve Goalsy’s existing manual planning model where live financial data is not required.

---

# 1. App overview

## 1.1 Product concept

Goalsy is a premium, dark-themed personal-finance planning application for ambitious professionals. Its core concept is an **executive financial dashboard**: instead of being a bank, broker, or payment processor, Goalsy helps a user understand their financial position and make progress toward long-term goals.

The product is intended to combine:

- Financial goals and target dates
- Weekly contribution/progress tracking
- A proprietary **Goalsy Score** from 0–1,000
- Daily missions and recommended actions
- Financial-health summaries
- Cash-flow and spending visibility
- Bill and schedule tracking
- Notifications and briefings
- Optional connected-account data through Plaid
- Optional credit-score data through a separate credit-data provider

Goalsy currently does not execute bank transfers, make external bill payments, or enable autopay. The existing calendar payment action only records that the user paid a bill elsewhere.

## 1.2 Target user

The intended user is an ambitious professional who wants a concise, executive-style view of financial readiness, goals, cash flow, debt, savings, and next actions.

## 1.3 Product boundaries

Goalsy should remain clear about what it does and does not do:

### Goalsy does

- Organize financial goals
- Track manually confirmed weekly contributions
- Calculate projections and scenarios
- Summarize connected financial information
- Provide a proprietary readiness score
- Show informational recommendations and reminders

### Goalsy does not currently do

- Act as a bank
- Hold user funds
- Execute external transfers
- Make external bill payments
- Provide financial, tax, legal, investment, or credit-repair advice
- Produce a bureau credit score without a separate provider

Any future move into transfers, payments, lending, investing, or other regulated activity requires a separate product, compliance, provider, and App Store review decision.

---

# 2. Repository and technology stack

## 2.1 Monorepo layout

```text
goalsy/
├── artifacts/
│   ├── goalsy-executive/     React/Vite frontend + Capacitor iOS/Android shell
│   ├── api-server/           Express REST API
│   └── mockup-sandbox/       Internal design/component preview server
├── lib/
│   ├── db/                   Drizzle ORM schema, seed, database access
│   ├── api-spec/             OpenAPI source contract
│   ├── api-client-react/     Orval-generated React Query client
│   └── api-zod/              Generated/shared Zod API schemas
├── scripts/                  Workspace scripts
├── attached_assets/          Design references and uploaded artifacts
├── .github/workflows/        GitHub Actions
└── GOALSY_HANDOFF.md        This canonical handoff
```

## 2.2 Full technology stack

| Area | Technology/current implementation |
|---|---|
| Repository | GitHub, branch `main` |
| Package manager | pnpm workspaces |
| Runtime | Node.js 24 in Replit; GitHub workflows also use Node/pnpm |
| Language | TypeScript 5.9 |
| Frontend | React 19 |
| Frontend build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Routing | Wouter |
| Server state | TanStack React Query |
| UI primitives | Radix UI packages where needed; most executive UI is custom |
| Icons | Lucide React |
| Charts | Recharts |
| Animation | Framer Motion is installed; current financial calculations are local/deterministic |
| Validation | Zod and drizzle-zod |
| API contract | OpenAPI 3.1 YAML |
| API code generation | Orval generates typed React Query hooks and related schemas |
| Backend | Node.js + Express 5 + TypeScript |
| Backend logging | Pino and pino-http |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| PostgreSQL driver | `pg` |
| Authentication | Clerk with custom React sign-in/sign-up UI |
| JWT verification | `jose` JWKS verification in `verifyClerkJwt.ts` |
| Server Clerk dependency | `@clerk/express` is installed, but the current auth path uses the project’s JWT middleware |
| Mobile shell | Capacitor 8 |
| iOS native project | Xcode project, Swift AppDelegate/wrapper |
| Android native project | Android Gradle project, Java activity |
| Native preferences | `@capacitor/preferences` |
| Native app lifecycle/deep link support | `@capacitor/app` |
| Native keyboard | `@capacitor/keyboard` |
| Push notifications | `@capacitor/push-notifications`; APNs HTTP/2 server delivery and FCM token registration plumbing |
| iOS push signing | `jose` ES256 JWT signing against APNs |
| Web hosting/preview | Replit artifact workflows |
| Native distribution | Xcode/App Store Connect/TestFlight; Android Studio/Gradle |
| Testing | Vitest, Testing Library, jsdom, Supertest; Xcode unit/UI tests in GitHub Actions |
| Static checks | TypeScript project references and package typechecks |
| CI | GitHub Actions |
| Design preview | `@workspace/mockup-sandbox` workflow |

## 2.3 Important commands

From the repository root:

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/goalsy-executive run test
```

Run the development services:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/goalsy-executive run dev
```

Database commands:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run push-force
```

For iOS:

```bash
cd artifacts/goalsy-executive
pnpm run cap:build
npx cap open ios
```

`cap:build` currently bakes in:

```text
VITE_API_BASE_URL=https://goalsy-finance-ui.replit.app
```

It does not explicitly select a production Clerk publishable key yet. That must be corrected before a Production/TestFlight build.

---

# 3. Current status

## 3.1 Verified repository status

The current repository contains:

- React/Vite web app
- Capacitor iOS project
- Capacitor Android project
- Express API server
- Drizzle/PostgreSQL schema
- Generated API client
- Clerk custom authentication UI
- Clerk native session persistence work
- Goals CRUD
- Goal weekly progress ledger
- Goal milestone projections
- Daily missions
- Goalsy Score calculation and history
- Bills list and internal “mark paid” action
- Manual expenses
- Briefings
- In-app notifications
- Push-token registration
- APNs delivery code
- Profile editing and Clerk avatar updates
- Test coverage for key progress/auth UI behavior

The prior verification pass recorded:

- Frontend typecheck passed
- 71 frontend tests passed
- Web workflow restarted cleanly
- Current `main` and `origin/main` synchronized at `c17a0ed`

The API test suite and native archive status should be rerun by the person making the next backend/native changes.

## 3.2 Feature status

| Feature | Current status |
|---|---|
| Clerk sign-up/sign-in | Built with custom UI |
| Native Clerk session restore | Built and covered by native regression tooling |
| User profile | PostgreSQL/Clerk-backed |
| Financial profile | PostgreSQL-backed, manually entered |
| Goals | PostgreSQL-backed CRUD |
| Weekly goal confirmations | PostgreSQL-backed ledger with normalization/recalculation work |
| Historical milestone baseline | Implemented in current goal/progress design |
| Goalsy Score | API-backed proprietary 0–1,000 score |
| Daily Missions | API-backed |
| Mission completion/skip | API-backed |
| Behind-goal notifications | API-backed/in-app; push infrastructure exists |
| Briefings | PostgreSQL-backed records; content/scheduling are still limited |
| Bills | PostgreSQL-backed manual tracking |
| External bill payment | Not built |
| Autopay | Preview-only; does not schedule or process payments |
| Expenses | PostgreSQL-backed manual entry/deletion |
| Financial Health | UI exists, but major values are hardcoded/mock |
| Credit score | No real provider integration |
| Plaid | No implementation |
| Connected accounts | Mock UI only |
| Account balances | Mock Today value only |
| Transaction import | Not built |
| Real transfers | Not built; intentionally not implied by current UI |
| Biometrics | Simulated toggle/sign-in behavior, not real device authentication |
| Subscriptions | Mock subscription display; no StoreKit billing |
| Account deletion | Not implemented |
| Profile photos | Clerk profile-image update exists; native permission/behavior still needs final verification |

## 3.3 Replit production and preview status

Configured workflows in this workspace:

- `artifacts/goalsy-executive: web`
- `artifacts/api-server: API Server`
- `artifacts/mockup-sandbox: Component Preview Server`

The current web and API workflows are configured and were reported running in the latest workspace state.

The code and git history show a published Replit deployment event (`343db47 Published your App`) and the native build points to:

```text
https://goalsy-finance-ui.replit.app
```

However, the repository alone cannot prove current production uptime, traffic, database contents, or whether the published deployment is the deployment intended for App Store users. Verify those in the Replit deployment dashboard and by checking `/api` or `/api/healthz`.

## 3.4 MyUI TestFlight status

Verified in the repository:

- The native project currently uses bundle ID `com.myui.goalsyexecutive`.
- Xcode team settings and prior handoff notes identify MyUI LLC.
- Existing project notes describe MyUI TestFlight distribution.
- Xcode marketing version is `1.0` and build number is `1`.
- iOS deployment target is 15.0.
- Both iPhone and iPad are currently targeted.

Not verifiable from the repository:

- Whether a MyUI build is currently active in TestFlight
- Which exact build testers have installed
- Whether the current `c17a0ed` code is in TestFlight
- Whether the App Store Connect listing is active or expired

The older handoff says that a new archive was needed after the MyUI bundle-ID change. Treat TestFlight availability as **dashboard confirmation required**, not as a guaranteed current fact.

## 3.5 Enteraxion TestFlight/App Store status

The Enteraxion plan is a **new App Store entry**, not an Apple app transfer:

- New Enteraxion-owned Apple Developer account/listing
- New bundle ID, likely in the `com.enteraxion.*` namespace
- Same backend intended initially
- No previous MyUI tester/review history carried over

Verified current code status:

- Capacitor still uses `com.myui.goalsyexecutive`.
- Xcode targets still use `com.myui.goalsyexecutive`.
- The new Enteraxion bundle ID has not been selected in code.
- No repository evidence proves that an Enteraxion build has been archived, uploaded, or made available in TestFlight.

Therefore, the Enteraxion build should currently be treated as **not uploaded/not confirmed** until App Store Connect is checked. Before uploading, update the bundle ID, Clerk native configuration, APNs configuration, entitlements, and build settings together.

---

# 4. Architecture overview

## 4.1 Request/data flow

```text
React screen
  ↓
Generated React Query hook from @workspace/api-client-react
  ↓
API client bootstrap attaches Clerk Bearer JWT
  ↓
Express API mounted at /api
  ↓
requireAuth / verifyClerkJwt resolves Clerk userId
  ↓
Route validates request with generated/Zod schemas
  ↓
Drizzle ORM
  ↓
PostgreSQL
```

For native builds:

```text
Capacitor bundled Vite files
  ↓
Clerk FAPI + production API URL
  ↓
Express API and PostgreSQL
```

The app does not use `server.url` for native builds. Native users receive bundled frontend files, while API calls use the build-time `VITE_API_BASE_URL`.

## 4.2 Frontend routes and screens

| Route | Screen | Auth | Main responsibility |
|---|---|---:|---|
| `/` | Home redirect | Mixed | Sends signed-out users to Welcome and signed-in users to the dashboard |
| `/welcome` | WelcomeScreen | Guest | Landing page with sign-in/create-account actions |
| `/signin` | SignInScreen | Guest | Custom Clerk email/password, MFA, password reset, and current Face ID preview path |
| `/create-account` | CreateAccountScreen | Guest | Custom Clerk registration, verification, and terms acknowledgment |
| `/financial-connection` | FinancialConnectionScreen | Required | Manual financial-profile form plus current simulated Plaid connection step |
| `/ai-home` | AIHomeScreen | Required | Strategic recommendation, forecast, scenario simulator, daily cash-flow analysis |
| `/today` | TodayScreen | Required | Greeting, total balance, score/goals/cash-flow pulse, agenda, mission |
| `/financial-health` | FinancialHealthScreen | Required | Cash flow, credit-looking summary, debt strategy, emergency fund, income/expenses chart |
| `/calendar` | CalendarScreen | Required | Bills, briefings, goal milestones, internal manual payment record, autopay preview |
| `/goals` | GoalsOverviewScreen | Required | Goal list, contribution summary, create-goal form |
| `/goals/:id` | GoalDetailScreen | Required | Goal editing, roadmap, milestones, progress ledger/chart, delete |
| `/profile` | ProfileScreen | Required | Identity, score, achievements, connected-account mock UI, notifications, security, subscription mock UI |
| `/score` | ScoreScreen | Required | Goalsy Score, drivers, history, recommendations, achievements |
| `/expenses` | ExpensesScreen | Required | Manual monthly/weekly expense entry and deletion |
| fallback | NotFound | Mixed | Unknown-route state |

There is no standalone `NotificationsScreen` route in the current frontend. Notifications are surfaced through shared header/UI behavior and the notifications API.

## 4.3 Shared frontend components

Important shared components:

- `AppShell` — authenticated layout, safe-area handling, bottom navigation
- `AppHeader` — title, back behavior, notification access
- `BottomNav` — Today, Goals, Calendar, AI, Profile
- `ExecutiveButton`
- `ExecutiveInput`
- `AppModal`
- `GoalCard`
- `ListRow`
- `ProgressBar`
- `CircularScoreRing`
- `Avatar`
- `ErrorBoundary`

## 4.4 API routes

The API contract lives in `lib/api-spec/openapi.yaml`. The API is mounted at `/api`. Authenticated routes require a valid Clerk JWT.

### Health/config

```text
GET /api
GET /api/healthz
GET /api/config
```

### User/profile

```text
GET /api/profile
PUT /api/profile
GET /api/financial-profile
PUT /api/financial-profile
```

### Goals and progress

```text
GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PUT    /api/goals/:id
DELETE /api/goals/:id
GET    /api/goals/:id/progress
POST   /api/goals/:id/progress
```

The progress route normalizes legacy cumulative records into individual weekly deposits and recalculates later values. Current design decisions:

- One logical weekly entry per goal/week is intended.
- Confirmed weeks can be edited.
- Future projections begin after the highest confirmed week, including a future-dated confirmed week.
- Historical milestone expectations need to remain immutable.
- Concurrent progress writes must continue to be transaction-safe.

### Missions

```text
GET  /api/missions/today
GET  /api/missions/streak
POST /api/missions/:id/complete
POST /api/missions/:id/skip
```

### Score

```text
GET /api/score
GET /api/score/history
```

Current score inputs:

- Savings rate
- Goal momentum
- Expense ratio
- Net worth
- Mission completion

It is a proprietary Goalsy Score, not a credit score.

### Bills/briefings

```text
GET /api/bills
PUT /api/bills/:id/pay
GET /api/briefings
```

`PUT /api/bills/:id/pay` only marks a bill paid inside Goalsy. It does not pay an external bill.

### Notifications/preferences

```text
GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/:id/dismiss
DELETE /api/notifications
GET    /api/notification-preferences
PUT    /api/notification-preferences/:type
```

The notifications route can detect behind-goal conditions and create in-app notifications. Push delivery is attempted when credentials/capability are available.

### Push tokens

```text
POST   /api/push-tokens
DELETE /api/push-tokens/:token
```

### Manual expenses

```text
GET    /api/expenses?month=YYYY-MM
POST   /api/expenses
DELETE /api/expenses/:id
```

## 4.5 Database schema

Database code is in `lib/db/src/schema/`. Money is generally stored as whole-dollar integers; do not introduce cents/floats without deciding the migration and rounding model.

### `user_profiles`

- `userId` — Clerk user ID, primary key
- `displayName`
- `avatarKey`
- `onboardingComplete`
- `createdAt`
- `updatedAt`

### `financial_profiles`

- `id`
- `userId` — unique
- `annualIncome`
- `monthlyExpenses`
- `netWorth`
- `savingsRate` — despite the name, currently stores a monthly savings dollar amount
- `riskTolerance`
- `primaryGoalType`
- `savingsMilestone100kAt`
- `createdAt`
- `updatedAt`

### `goals`

- `id`
- `userId`
- `name`
- `type`
- `targetAmount`
- `currentAmount`
- `openingAmount`
- `monthlyContribution`
- `paymentFrequency`
- `targetDate`
- `status`
- `priority`
- `createdAt`
- `updatedAt`

`monthlyContribution` always stores the monthly equivalent, even when the display frequency is weekly.

### `goal_progress_entries`

- `id`
- `goalId`, cascading to `goals`
- `userId`
- `weekIndex`
- `weeklyDeposit`
- `confirmedAmount` — derived running total retained for compatibility
- `confirmedAt`

`weeklyDeposit` can be null for legacy cumulative records awaiting normalization.

### `daily_missions`

- `id`
- `userId`
- `missionDate`
- `title`
- `description`
- `category`
- `status`
- `skipReason`
- `completedAt`
- `createdAt`

There is a unique user/date index.

### `achievement_awards`

- `id`
- `userId`
- `achievementId`
- `earnedAt`
- `createdAt`

There is a unique user/achievement index.

### `score_snapshots`

- `id`
- `userId`
- `score`
- `tier`
- `driversJson`
- `computedAt`

### `bills`

- `id`
- `userId`
- `name`
- `amount`
- `dueDate`
- `account`
- `category`
- `isPaid`
- `paidAt`
- `createdAt`

### `briefings`

- `id`
- `userId`
- `title`
- `scheduledDate`
- `type`
- `summary`
- `createdAt`

### `notifications`

- `id`
- `userId`
- `type`
- `title`
- `body`
- `targetScreen`
- `targetId`
- `isRead`
- `isDismissed`
- `createdAt`

### `notification_preferences`

- `id`
- `userId`
- `type`
- `enabled`
- `createdAt`
- `updatedAt`

There is a unique user/type index.

### `push_tokens`

- `id`
- `userId`
- `token`
- `platform`
- `bundleId`
- `createdAt`
- `updatedAt`

There is a unique user/token index. `bundleId` supports separate MyUI and Enteraxion APNs credentials.

### `expenses`

- `id`
- `userId`
- `category`
- `amount`
- `frequency`
- `expenseDate`
- `note`
- `createdAt`

---

# 5. Authentication and native architecture

## 5.1 Web authentication

The app uses custom React screens with Clerk hooks rather than Clerk-hosted pages.

High-level flow:

1. User signs in or creates an account.
2. Clerk creates/restores a session.
3. `ApiClientBootstrap` obtains a Clerk token.
4. The generated API client sends `Authorization: Bearer <JWT>`.
5. API middleware verifies the JWT using Clerk JWKS.
6. The resolved Clerk user ID scopes all database queries.

## 5.2 Native session persistence

Capacitor native builds use the Clerk FAPI directly rather than a remote `server.url`.

Native session restore work:

- Persists Clerk’s native session token in Capacitor Preferences.
- Restores it into the URL before Clerk initializes.
- Uses a startup gate to avoid a race between restore and Clerk mount.
- Updates persistence when Clerk session/token state changes.

Do not casually change these startup ordering rules. Route component identity also needs to remain stable because Clerk startup can alter URL/session state and remounting can erase active form input.

## 5.3 Current environment variables/secrets

Known names referenced by the project include:

```text
VITE_CLERK_PUBLISHABLE_KEY
CLERK_PUBLISHABLE_KEY
CLERK_FAPI_HOST
VITE_CLERK_PROXY_URL
VITE_API_BASE_URL
DATABASE_URL
PORT
SESSION_SECRET
APNS_KEY_P8
APNS_KEY_ID
APNS_TEAM_ID
APNS_BUNDLE_ID
APNS_KEY_P8_ENTERAXION
APNS_KEY_ID_ENTERAXION
APNS_TEAM_ID_ENTERAXION
APNS_BUNDLE_ID_ENTERAXION
```

Never print or commit secret values. Use Replit Secrets/environment management.

---

# 6. App Store deployment readiness

This section is a release checklist, not a claim that the app is ready today.

## 6.1 Clerk production

Before an App Store/TestFlight production build:

- [ ] Create/confirm the Clerk Production instance.
- [ ] Build the native release with a `pk_live_...` key.
- [ ] Keep web preview on the Development key.
- [ ] Add a build-time guard that fails if a release build contains `pk_test_`.
- [ ] Set the API server to the Production Clerk FAPI/JWKS host.
- [ ] Remove or disable the Development Clerk-host fallback in production.
- [ ] Configure Production login methods, verification, password reset, and MFA.
- [ ] Configure production redirect and sign-out destinations.
- [ ] Configure the final native application/bundle ID.
- [ ] Configure a valid public Clerk custom domain if the native TLS/proxy path requires it.
- [ ] Use that exact domain in Clerk, Capacitor `allowNavigation`, and release configuration.
- [ ] Verify `capacitor://localhost` native behavior in Production.
- [ ] Namespace or clean native session persistence when switching environments.

Release tests:

- [ ] Clean install
- [ ] Create account
- [ ] Email verification
- [ ] Sign in
- [ ] Force-kill and reopen
- [ ] Token refresh/rotation
- [ ] Sign out
- [ ] Password reset
- [ ] Network failure/retry
- [ ] Upgrade from an older TestFlight build

## 6.2 Bundle ID and Apple developer account

Current repository values are still MyUI values:

```text
com.myui.goalsyexecutive
```

The Enteraxion plan calls for a new bundle ID and a new App Store listing. Before the first Enteraxion upload:

- [ ] Select the final Enteraxion bundle ID.
- [ ] Update `capacitor.config.ts`.
- [ ] Update all Xcode app/test target identifiers.
- [ ] Update Android package identifiers if Android is also being rebranded.
- [ ] Update Clerk native application settings.
- [ ] Update APNs App ID/capability.
- [ ] Update `APNS_BUNDLE_ID`.
- [ ] Update push-token bundle-ID handling.
- [ ] Add/update signing certificates and provisioning profiles.
- [ ] Confirm the App Store Connect record uses the same identifier.

Do not upload an Enteraxion archive while the native project still advertises the MyUI bundle ID.

## 6.3 App Store Connect metadata

Prepare the following:

### App record

- [ ] Final app name, 30-character maximum
- [ ] Primary language
- [ ] Final bundle ID
- [ ] Internal SKU
- [ ] Primary category, likely Finance
- [ ] Optional secondary category
- [ ] Age-rating questionnaire
- [ ] Content-rights declaration
- [ ] Copyright owner, likely Enteraxion LLC
- [ ] Price and availability
- [ ] Countries/regions
- [ ] EU Digital Services Act trader status
- [ ] Export-compliance/encryption answers

### Product page

- [ ] Description, maximum 4,000 characters
- [ ] Keywords, maximum 100 bytes
- [ ] Support URL
- [ ] Privacy policy URL
- [ ] Screenshots
- [ ] Version number
- [ ] Build number
- [ ] Copyright
- [ ] App Review contact name/email/phone
- [ ] Review login credentials
- [ ] Review notes
- [ ] Release method

Recommended/optional:

- [ ] Subtitle
- [ ] Promotional text
- [ ] Marketing URL
- [ ] App previews
- [ ] Localized metadata
- [ ] Privacy choices/data-deletion URL

### Screenshots

Current Xcode targets both iPhone and iPad, so either:

- [ ] Provide and test iPhone and iPad screenshot sets, or
- [ ] Intentionally restrict the app to iPhone before submission

Screenshots must show the submitted build and must not contain fake account balances, fake credit scores, mock institutions, unavailable subscriptions, or features not actually working.

### Subscription handling

The current Profile screen displays a mock `$49/mo` Executive Tier and renewal date. Before submission:

- [ ] Remove the price/renewal/subscription presentation, or
- [ ] Implement a real App Store subscription with StoreKit and App Store Connect IAP metadata

Do not present a purchaseable-looking subscription without StoreKit.

## 6.4 Privacy nutrition label

The final privacy answers must be based on the shipped binary and the final third-party SDKs.

Likely current categories:

| Apple category | Goalsy data | Likely declaration |
|---|---|---|
| Contact Info | Clerk email/display name | Linked to user; app functionality/account management |
| Identifiers | Clerk user ID, push token | Linked to user; authentication/notifications |
| Financial Info → Other Financial Info | Income, expenses, net worth, savings, goals, bills | Linked to user; app functionality/personalization |
| User Content → Other User Content | Goal names, notes, bill/account labels, mission skip reasons | Linked to user; app functionality |
| Usage Data → Product Interaction | Mission state, notification state/preferences, onboarding | Linked to user; app functionality/personalization |
| Device ID/identifier data | Push-token/device registration metadata | Linked to user; push notifications |

Conditional after integrations:

- [ ] Photos/Videos if profile-image collection is treated as app-collected user content.
- [ ] Financial Info → Credit Info for a real credit provider.
- [ ] Additional Financial Info for Plaid balances, transactions, liabilities, accounts, and institution metadata.
- [ ] Payment Info only if the final provider actually gives Goalsy payment/bank-account information.
- [ ] Usage/Diagnostics categories if analytics, crash, attribution, or provider SDKs collect them.

Current intended position:

- [ ] No cross-app tracking
- [ ] No third-party advertising
- [ ] No advertising identifier
- [ ] No location or contacts collection

The privacy policy must explain Clerk, Replit/PostgreSQL hosting, APNs, Plaid, the credit-score vendor, retention, deletion, unlinking, security practices, and regional rights.

## 6.5 Other App Review blockers

- [ ] Replace simulated Plaid connection with real integration.
- [ ] Remove hardcoded Financial Health credit/debt/cash-flow values.
- [ ] Remove hardcoded Today balances/cash-flow values.
- [ ] Remove mock Chase/American Express/Wealthfront connected accounts.
- [ ] Remove or implement the fake biometric security behavior.
- [ ] Add in-app account deletion.
- [ ] Add real production support and privacy-policy pages.
- [ ] Add/verify `PrivacyInfo.xcprivacy` coverage for the app and native SDKs.
- [ ] Add Push Notifications capability and `aps-environment` entitlement.
- [ ] Configure production APNs credentials for the final developer account/bundle ID.
- [ ] Verify iPhone/iPad/orientation behavior.
- [ ] Make AI forecasts and score recommendations explicitly informational and assumption-based.
- [ ] Provide an App Review account that can exercise connected-finance flows.
- [ ] Verify all third-party provider permissions, contracts, privacy disclosures, and data deletion behavior.

---

# 7. Plaid integration

## 7.1 Current Plaid state

**Nothing real is built yet.**

Current Plaid references are UI/mock references only:

- `FinancialConnectionScreen.tsx` imports `mockConnectedAccounts` and `simulateAsync`.
- The Connect Accounts action waits and then reports success without contacting Plaid.
- Profile lists mock Chase, American Express, and Wealthfront accounts.
- Today calculates total balance from mock accounts.
- Calendar contains a static Wealthfront transfer.
- No Plaid package, Link token route, public-token exchange route, access-token storage, webhook route, sync worker, or Plaid database tables were found.

Do not build the integration by replacing one mock array with a frontend API call. Plaid tokens and synchronization must be server-side.

## 7.2 Recommended Plaid architecture

```text
Financial Connection screen
  ↓ request Link token
API server creates Link token
  ↓
Plaid Link client flow
  ↓ returns public_token
Frontend sends public_token to API
  ↓
API exchanges public_token for access_token
API encrypts/stores access_token
  ↓
Initial sync:
  accounts/balances
  transactions
  liabilities, if enabled
  investments, if enabled
  ↓
Normalized Goalsy financial-data API
  ↓
Today, Financial Health, Expenses, optional AI/Score features
```

Rules:

- Never expose `access_token` to the browser.
- Never store a `public_token` as if it were a long-term credential.
- Encrypt access tokens at rest.
- Scope every stored connection to the Clerk user ID.
- Store provider IDs separately from display labels.
- Treat Plaid webhook data as asynchronous and retryable.
- Use explicit sync status and stale-data timestamps.
- Handle item login-required, revoked, institution-down, rate-limit, and partial-sync states.
- Let users disconnect a connection and delete its stored data.

## 7.3 Plaid products/capabilities

### Required foundation: Link

Use Plaid Link for:

- Initial institution connection
- Add Institution in Profile
- Reconnection/reauthorization
- Consent and product selection

### Accounts and balances

Needed for:

- Today total balance
- Financial Health assets
- Emergency-fund balance
- Account selection and masked-account display
- Net-worth inputs

Use clear asset/debt separation. Do not sum credit-card liabilities into available cash.

### Transactions

Needed for:

- Today cash-flow analysis
- Financial Health income-vs-expenses chart
- Recurring bill detection
- Imported expense history
- Spending categorization
- Matching possible goal contributions

Use incremental transaction synchronization/cursors and provider webhooks rather than repeatedly downloading the entire history.

### Liabilities

Needed for:

- Credit-card balances
- Credit limits
- Utilization
- Loan balances
- Debt strategy
- Statement/due information when available

### Investments

Needed only if Goalsy displays investment/brokerage balances or investment net worth.

This is relevant to the current Wealthfront/investment concept, but should not be enabled until the product needs it and privacy/compliance are reviewed.

### Auth

Needed only if Goalsy requires bank account/routing information for account verification or ACH setup.

It is not required merely to display balances.

### Identity

Needed only if the product needs identity/ownership data from an institution.

It should not be enabled by default without a product requirement.

### Transfers/payment movement

Plaid Link and read products do not automatically move money. Real transfers or bill payments would require a separate transfer/payment architecture, authorization, risk controls, disclosures, reconciliation, and compliance review.

## 7.4 Where Plaid data connects in the app

| Screen/feature | Plaid requirement |
|---|---|
| Financial Connection | Direct Plaid Link and consent flow |
| Profile → Connected Accounts | Connection list, account list, reconnect, unlink, status |
| Today → Total Balance | Accounts/balances |
| Today → live cash flow | Transactions |
| Today → spending-under-target insight | Transactions plus Goalsy target/expense data |
| Financial Health → cash flow | Transactions |
| Financial Health → debt | Liabilities |
| Financial Health → utilization | Liabilities/card limits |
| Financial Health → emergency fund | Balances, optionally investments |
| Financial Health → income/expenses chart | Transactions |
| Expenses → auto-import | Transactions |
| Calendar → recurring bill suggestions | Transactions |
| Calendar → payment confirmation | Transactions; do not assume clearing equals user intent without matching rules |
| AI Home → verified income/spending/net worth | Optional balances/transactions |
| Goalsy Score → live financial drivers | Optional balances/transactions/liabilities |
| Goals Overview/Goal Detail | Optional contribution matching; preserve manual confirmation and immutable history |

Pages that do not need Plaid:

- Welcome
- Sign In
- Create Account
- Splash
- Goal creation itself
- Manual goal progress confirmation
- Manual bill entry
- Manual expense entry
- Missions
- Notifications

## 7.5 Proposed Plaid API routes

Add the routes to `lib/api-spec/openapi.yaml` first, regenerate the client, then implement the Express routes.

Suggested routes:

```text
POST   /api/plaid/link-token
POST   /api/plaid/items/exchange
GET    /api/plaid/items
GET    /api/plaid/accounts
GET    /api/plaid/accounts/:id
GET    /api/plaid/balances
GET    /api/plaid/transactions
POST   /api/plaid/items/:id/sync
POST   /api/plaid/items/:id/reconnect
DELETE /api/plaid/items/:id
POST   /api/plaid/webhook
```

The exact names can change, but the responsibilities should remain:

- Create short-lived Link tokens server-side
- Exchange public tokens server-side
- Return normalized, non-secret connection/account data
- Support incremental transaction synchronization
- Receive and validate Plaid webhooks
- Expose reconnect/disconnect
- Support deletion for account-deletion requests

## 7.6 Proposed Plaid database schema

No Plaid tables exist today. A reasonable first version would include:

### `plaid_items`

- `id`
- `userId`
- `plaidItemId`
- encrypted `accessToken`
- `environment` (`sandbox`/`production`)
- `institutionId`
- `institutionName`
- `status`
- `lastSyncedAt`
- `lastErrorCode`
- `lastErrorMessage` or a safe normalized error
- `consentGrantedAt`
- `createdAt`
- `updatedAt`

Unique constraint: user + Plaid item ID.

### `plaid_accounts`

- `id`
- `userId`
- `plaidItemId` or local foreign key
- `plaidAccountId`
- `institutionName`
- `name`
- `officialName`
- `mask`
- `type`
- `subtype`
- `currentBalance`
- `availableBalance`
- `currency`
- `isHidden`
- `lastSyncedAt`
- `createdAt`
- `updatedAt`

Unique constraint: Plaid account ID.

### `plaid_transactions`

- `id`
- `userId`
- local Plaid-account reference
- `plaidTransactionId`
- `pendingTransactionId`
- `name`
- `merchantName`
- `amount`
- `currency`
- `date`
- `authorizedDate`
- `category`
- `personalFinanceCategory`
- `pending`
- `paymentChannel`
- `rawMetadata` only if justified and protected
- `createdAt`
- `updatedAt`

Unique constraint: user + Plaid transaction ID.

### Optional `plaid_sync_cursors`

- `userId`
- item reference
- transaction cursor
- last webhook timestamp
- last successful sync
- sync status
- retry metadata

Avoid storing more raw provider data than the product needs.

## 7.7 Plaid account setup required

Before development:

- [ ] Create/confirm Plaid developer account.
- [ ] Confirm legal business identity and contact information.
- [ ] Create sandbox credentials.
- [ ] Decide whether the first release uses Sandbox, Development, or Production.
- [ ] Choose products: Link/accounts/balance/transactions first; liabilities/investments only if required.
- [ ] Configure redirect URI/origins for web/native flow as applicable.
- [ ] Configure webhook URL.
- [ ] Review Plaid data-retention and deletion requirements.
- [ ] Review institution coverage and known limitations.
- [ ] Obtain production access/approval before promising production connectivity.
- [ ] Add Plaid client ID/secrets only through Replit Secrets.
- [ ] Add separate environment values for Development and Production.
- [ ] Document the sandbox institutions/test credentials for App Review.

---

# 8. Credit-score integration

## 8.1 Plaid is not the credit-score provider

Plaid should not be treated as the source of a FICO/VantageScore-style bureau credit score.

Goalsy needs a separate vendor for:

- Credit score
- Score date
- Score model/source
- Payment history
- Utilization
- Credit age
- Credit mix
- Hard inquiries
- Bureau data and dispute/accuracy processes

The Financial Health screen’s current score `812`, `+14 pts`, and credit factors are mock data and must not ship as user-specific facts.

## 8.2 Technical requirements

The final provider must supply:

- Secure server-to-server authentication
- User consent/authorization flow
- Required identity verification
- Score and factor response schema
- Report date and source/model
- Refresh behavior and rate limits
- Provider webhooks or polling rules
- Error/stale-data states
- Revocation/disconnect behavior
- User deletion/data-retention behavior

Suggested normalized entities:

### `credit_connections`

- `id`
- `userId`
- provider name
- provider-user/reference ID
- connection status
- consent timestamp
- last refreshed timestamp
- error state
- created/updated timestamps

### `credit_reports` or `credit_score_snapshots`

- `id`
- `userId`
- provider
- score
- score model
- bureau/source
- report date
- fetched timestamp
- factors JSON or normalized factor table
- created timestamp

The existing `score_snapshots` table is for the proprietary Goalsy Score. Do not reuse it for bureau credit scores without adding an explicit score type/provider distinction.

## 8.3 FCRA and compliance requirements

The exact obligations depend on the selected vendor, data source, use case, and whether Goalsy is merely displaying user-authorized information or using it for eligibility decisions. The vendor and counsel must confirm the implementation.

At minimum, plan for:

- User authorization before retrieving credit information
- Clear disclosure of the purpose of access
- Data minimization
- Encryption in transit and at rest
- Strict access control and audit logging
- Accurate source/model/date labeling
- No unsupported claims that Goalsy Score is a credit score
- User correction/dispute path where required
- Retention and deletion rules
- Vendor agreements and permitted-use restrictions
- No use of credit information for lending/eligibility decisions without the corresponding compliance program
- Review of adverse-action, permissible-purpose, consumer-reporting, and notice requirements if the product expands beyond display/planning

The current product should frame credit data as informational and personalized for the user, not as a lending decision or guaranteed outcome.

## 8.4 Credit UI requirements

When implemented, show:

- Score source/provider
- Score model
- Date retrieved
- Whether the score is stale
- Factors supplied by the provider
- “Not financial advice”/informational context
- Link to provider/support/dispute information where applicable

Never substitute an estimated Goalsy calculation for a provider score without labeling it as an estimate.

---

# 9. Full pending/TODO list

## P0 — blocks a credible App Store submission

### Connected finance

- [ ] Implement Plaid Link and secure server-side token exchange.
- [ ] Add encrypted Plaid item/account/transaction storage.
- [ ] Add Plaid sync and webhook handling.
- [ ] Replace Financial Connection simulation.
- [ ] Replace mock connected accounts in Profile.
- [ ] Replace Today mock balances.
- [ ] Replace Financial Health mock cash flow/debt/utilization/emergency-fund values.
- [ ] Remove Calendar’s fake Wealthfront transfer or replace it with real, clearly labeled data.

### Credit data

- [ ] Select a credit-score provider.
- [ ] Confirm provider contract/permissible use/FCRA responsibilities.
- [ ] Build consent and identity flow.
- [ ] Build server integration and normalized score snapshots.
- [ ] Replace the hardcoded `812` and mock credit factors.
- [ ] Label provider, model, date, and stale/error states.

### Production identity and native release

- [ ] Configure Clerk Production publishable key for native release builds.
- [ ] Configure explicit Production FAPI/JWKS host.
- [ ] Remove unsafe Development fallback in Production.
- [ ] Finalize Enteraxion bundle ID.
- [ ] Update Xcode, Capacitor, Clerk, APNs, and push-token bundle-ID configuration.
- [ ] Create/use Enteraxion provisioning/signing assets.
- [ ] Configure APNs capability, entitlements, and Enteraxion APNs credentials.
- [ ] Confirm production API/database environment.

### App Store account/compliance

- [ ] Add in-app account deletion.
- [ ] Publish privacy policy.
- [ ] Publish support page/contact.
- [ ] Complete App Store Connect metadata.
- [ ] Complete privacy nutrition label after final SDK/provider review.
- [ ] Verify privacy manifests for Capacitor/native dependencies.
- [ ] Decide whether to remove or implement subscription UI.
- [ ] Decide whether to remove or implement biometrics.
- [ ] Provide App Review account and connected-finance test instructions.
- [ ] Verify iPad/orientation support or restrict the target.

## P1 — required for a trustworthy connected-finance release

- [ ] Add normalized financial-data API endpoints to OpenAPI and generated client.
- [ ] Add stale-data timestamps on all financial summaries.
- [ ] Add explicit loading, unavailable, partial-sync, and reconnect states.
- [ ] Add user-visible connection status and last-sync date.
- [ ] Add institution/account hide and unlink controls.
- [ ] Add Plaid data deletion during account deletion.
- [ ] Add credit-provider deletion/disconnect behavior.
- [ ] Add transaction categorization review/editing.
- [ ] Keep manual expenses available alongside imported transactions.
- [ ] Add recurring-bill detection only after transaction matching is reliable.
- [ ] Keep manual bill payment clearly internal-only.
- [ ] Do not implement autopay until a separate payment architecture is approved.
- [ ] Make goal contribution matching suggestion-only until the user confirms it.
- [ ] Preserve immutable historical milestone expectations when live balances arrive.
- [ ] Add stronger goal/progress validation and uniqueness/concurrency protection.
- [ ] Add production-safe error handling and retry/backoff for provider APIs.
- [ ] Add observability without logging secrets, tokens, raw financial data, or credentials.
- [ ] Re-run API, frontend, native, and clean-install tests after integration.

## P1 — product clarity

- [ ] Replace “AI” labels where the implementation is deterministic, or add a real AI provider.
- [ ] Explain assumptions behind forecasts, confidence values, and projections.
- [ ] Add informational/educational financial disclaimer.
- [ ] Ensure Goalsy Score is consistently distinguished from a credit score.
- [ ] Remove absolute security/privacy claims such as “All Systems Secure” unless substantiated.
- [ ] Ensure all static demo notifications and briefings are removed or explicitly sample-labeled.

## P2 — follow-on improvements

- [ ] Add weekly prompts for unconfirmed past goal weeks.
- [ ] Improve recurring briefings/scheduling.
- [ ] Add richer push notification coverage, including target-date reminders.
- [ ] Review avatar/photo permission behavior on real devices.
- [ ] Improve empty/offline states across all screens.
- [ ] Add test coverage for provider sync, deletion, reconnect, stale data, and webhook idempotency.
- [ ] Update stale project documentation, especially `replit.md` and older KT files, after the new architecture is shipped.
- [ ] Run a security/dependency scan before production launch.

---

# 10. Recommended implementation order for Lakhan

1. Read this document and inspect:
   - `artifacts/goalsy-executive/src/pages/FinancialConnectionScreen.tsx`
   - `artifacts/goalsy-executive/src/pages/ProfileScreen.tsx`
   - `artifacts/goalsy-executive/src/pages/TodayScreen.tsx`
   - `artifacts/goalsy-executive/src/pages/FinancialHealthScreen.tsx`
   - `artifacts/goalsy-executive/src/pages/ExpensesScreen.tsx`
   - `lib/api-spec/openapi.yaml`
   - `artifacts/api-server/src/routes/index.ts`
   - `lib/db/src/schema/`
2. Confirm Plaid products and production-account requirements.
3. Design the normalized financial-data API and schema before writing UI code.
4. Implement Link token creation and public-token exchange server-side.
5. Add item/account storage with encryption and user scoping.
6. Add initial balance synchronization.
7. Replace Profile and Financial Connection mocks.
8. Add transaction synchronization and webhook/cursor handling.
9. Replace Today and Financial Health mock calculations.
10. Add liabilities only if debt/utilization remains in the first release.
11. Select and implement the separate credit-score vendor.
12. Add consent, privacy, deletion, disconnect, stale-data, and provider-error paths.
13. Run clean-install, force-kill, provider reconnect, account deletion, and App Review tests.

Do not begin by adding raw Plaid calls to each screen. Build one server-side connection/sync layer and make the screens consume normalized Goalsy data.

---

# 11. Known decisions to preserve

- Development and Production Clerk environments must remain separate.
- Existing Development users will not automatically exist in Clerk Production.
- Native session persistence must be namespaced or cleaned when switching environments.
- Replit Preview and the published/TestFlight binary are separate artifacts.
- Plaid connection must not imply that money was transferred.
- Calendar manual payment only records an internal Goalsy state.
- Autopay is preview-only until a real payment product exists.
- Subscription UI must not imply a billing portal or purchase path that does not exist.
- Goalsy Score is proprietary and is not a credit score.
- Future projections begin after the highest confirmed goal week, including future-dated confirmed weeks.
- Historical milestone expectations must not be rewritten by later deposits or plan edits.
- Manual weekly goal confirmation remains the source of truth until transaction matching has explicit user confirmation.
- Never ship plausible mock financial data as if it belongs to a real user.

---

# 12. Dashboard verification still required

A new teammate should verify these items directly rather than relying only on this repository:

- [ ] Replit published deployment URL and current health
- [ ] Development and Production database separation
- [ ] Clerk Development/Production instances and keys
- [ ] Clerk Production custom domain/certificate
- [ ] Current MyUI TestFlight build and tester availability
- [ ] Whether any Enteraxion App Store/TestFlight record already exists
- [ ] Final Enteraxion bundle ID
- [ ] Apple Developer team and signing assets
- [ ] APNs key ownership and bundle-ID mapping
- [ ] App Store Connect metadata/listing status
- [ ] Privacy-policy/support URLs
- [ ] Plaid account environment and production approval
- [ ] Credit-score vendor contract and FCRA/compliance guidance

This verification list is intentional: App Store Connect, TestFlight, provider dashboards, and Replit production state cannot be reliably inferred from Git alone.
