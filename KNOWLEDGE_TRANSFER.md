# Goalsy Executive — Knowledge Transfer Document

**Project:** Goalsy Executive  
**Platform:** iOS & Android (Capacitor) + Web (Replit Preview)  
**Stack:** React · TypeScript · Vite · Capacitor · Express · PostgreSQL · Drizzle ORM · Clerk Auth  
**Repository:** https://github.com/gurudeepak2001/goalsy.git  
**Replit Dev Domain:** `b89a11ff-b052-43b2-b941-88baf72a4a02-00-1vdn0ng8937zm.kirk.replit.dev`

---

## 1. What Is This Product?

Goalsy Executive is a personal finance command-centre app for high-net-worth individuals. It gives users a real-time **Executive Score** (0–1000), daily AI-generated financial missions, a goals tracker, a bill & briefing calendar, and smart notifications. It runs as a native iOS/Android app (via Capacitor wrapping the Vite/React build) and can also be previewed as a web app directly in Replit.

---

## 2. Repository Structure (pnpm Monorepo)

```
goalsy/
├── artifacts/
│   ├── goalsy-executive/     ← Frontend (React/Vite) + Capacitor iOS/Android
│   ├── api-server/           ← Backend (Express + Clerk + Drizzle)
│   └── mockup-sandbox/       ← Design/component preview tool (internal use only)
├── lib/
│   ├── db/                   ← Drizzle schema, DB client, seed script
│   ├── api-spec/             ← OpenAPI specification (openapi.yaml) + Orval codegen config
│   ├── api-client-react/     ← Auto-generated React Query hooks + custom fetch wrapper
│   └── api-zod/              ← Auto-generated Zod validators from OpenAPI spec
├── scripts/                  ← Workspace utility scripts
├── pnpm-workspace.yaml
└── package.json
```

**Key principle:** The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth. Running `pnpm --filter @workspace/api-spec run codegen` regenerates all hooks in `lib/api-client-react` and validators in `lib/api-zod`. Never edit generated files by hand.

---

## 3. Frontend — `artifacts/goalsy-executive/`

### Tech Stack
- **React 18 + TypeScript** via Vite
- **Wouter** for client-side routing (lightweight, Capacitor-compatible)
- **TailwindCSS v4** for styling
- **Radix UI** primitives (Dialog, Toast, Switch, etc.)
- **TanStack React Query v5** for all API calls (via generated hooks)
- **Clerk** for authentication (custom sign-in/sign-up UI)
- **Capacitor** for native iOS/Android wrapping

### Screens & Routes

| Route | Screen File | Description |
|-------|-------------|-------------|
| `/` | `App.tsx` (redirect) | Auth check → routes user appropriately |
| `/welcome` | `WelcomeScreen.tsx` | Onboarding entry point |
| `/signin` | `SignInScreen.tsx` | Custom Clerk sign-in form |
| `/create-account` | `CreateAccountScreen.tsx` | Custom Clerk sign-up form |
| `/financial-connection` | `FinancialConnectionScreen.tsx` | Step 02: Financial profile form + Step 03: Plaid mock |
| `/ai-home` | `AIHomeScreen.tsx` | Post-onboarding landing page |
| `/today` | `TodayScreen.tsx` | Today's mission + pulse cards + agenda |
| `/financial-health` | `FinancialHealthScreen.tsx` | Financial health overview |
| `/calendar` | `CalendarScreen.tsx` | Bills + briefings calendar |
| `/goals` | `GoalsOverviewScreen.tsx` | Goals CRUD with milestone markers |
| `/profile` | `ProfileScreen.tsx` | User profile + notification preferences |
| `/score` | `ScoreScreen.tsx` | Score gauge, drivers breakdown, history chart |

### Routing Guard System
- `GuestOnly` wrapper: redirects authenticated users away from sign-in/welcome screens
- `AuthGate` wrapper: redirects unauthenticated users to `/welcome`
- Both live in `App.tsx`

### Key Components

| Component | Purpose |
|-----------|---------|
| `AppShell` | Layout wrapper with fixed header + scrollable body + safe-area handling |
| `AppHeader` | Top bar with logo, bell (live notifications), avatar |
| `BottomNav` | Fixed 5-tab navigator (Today, Goals, Calendar, AI, Profile) |
| `GoalCard` | Goal progress bar with 25/50/75% diamond milestone ticks |
| `CircularScoreRing` | SVG ring showing Executive Score (0–1000) |
| `ExecutiveButton` | Primary/outline CTA button |
| `ErrorBoundary` | Class component wrapping the entire app to catch render errors |

### API Client Wiring
`src/lib/apiClient.ts` — called once at app start from `App.tsx`:
```ts
initApiClient(getToken);  // getToken = Clerk's useAuth().getToken
```
This calls `setAuthTokenGetter` (attaches Bearer JWT to every request) and `setBaseUrl` (sets the API origin for native builds from `VITE_API_BASE_URL`).

### Capacitor / Native Configuration
- Config file: `artifacts/goalsy-executive/capacitor.config.ts`
- App ID: `com.goalsy.executive`
- Web directory: `dist/public`
- **No `server.url`** — app loads from bundled local files (`capacitor://localhost/`)
- API calls reach the remote Replit server because `VITE_API_BASE_URL` is baked in at build time
- `allowNavigation` permits Clerk auth domains and the Replit API domain

### Safe-Area Handling (iOS)
Defined in `src/index.css`:
```css
--safe-top:    env(safe-area-inset-top,    0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
.pt-safe  { padding-top:    env(safe-area-inset-top,    0px); }
.pb-safe  { padding-bottom: env(safe-area-inset-bottom, 0px); }
```
- `AppShell` header uses `.pt-safe`
- `BottomNav` uses `.pb-safe`
- `ToastViewport` uses `padding-top: calc(env(safe-area-inset-top, 0px) + 1rem)` (inline style) to clear the Dynamic Island

---

## 4. Backend — `artifacts/api-server/`

### Tech Stack
- **Express 5 + TypeScript**
- **Clerk Express SDK** (`@clerk/express`) for JWT/session auth
- **Drizzle ORM** for all database queries
- **Pino** for structured JSON logging
- **esbuild** for production bundling (`build.mjs`)

### Entry Points
- `src/app.ts` — Express app setup (CORS, JSON parsing, Clerk middleware, Clerk proxy, route mounting)
- `src/index.ts` — Server start (`PORT` env var, default 8080)

### API Routes (all under `/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Public health check |
| GET/PUT | `/profile` | User profile (display name, avatar, onboarding flag) |
| GET/PUT | `/financial-profile` | Financial profile upsert (income, net worth, savings rate, etc.) |
| GET | `/goals` | List user's goals |
| POST | `/goals` | Create a goal |
| GET/PUT/DELETE | `/goals/:id` | Single goal CRUD |
| GET | `/missions/today` | Today's mission (deterministic template rotation by day-of-year) |
| POST | `/missions/:id/complete` | Mark mission complete |
| POST | `/missions/:id/skip` | Skip mission |
| GET | `/score` | Compute and return Executive Score (persists snapshot async) |
| GET | `/score/history` | Score history for chart |
| GET | `/notification-preferences` | User notification settings |
| PUT | `/notification-preferences/:type` | Toggle a notification type |
| GET | `/bills` | List bills |
| PUT | `/bills/:id/pay` | Mark bill as paid |
| GET | `/briefings` | List strategic briefings |
| GET | `/notifications` | List in-app notifications |
| POST | `/notifications/:id/read` | Mark notification read |
| POST | `/notifications/:id/dismiss` | Dismiss notification |
| DELETE | `/notifications` | Clear all notifications |

### Auth Middleware (`src/middlewares/requireAuth.ts`)
Uses Clerk's `getAuth(req)` which reads from:
1. Session cookie (browser/WebView same-origin)
2. `Authorization: Bearer <jwt>` header (native app)

Returns `401` if no valid user is found; otherwise sets `res.locals.userId`.

### Score Engine (`src/lib/scoreEngine.ts`)
Computes the Executive Score server-side. Five weighted factors (max 1000 points total):
- Goal completion progress
- Mission completion rate
- Financial profile completeness
- Savings rate
- Bill payment rate

Score is computed on every `GET /score` call and persisted asynchronously to `score_snapshots`.

### Caching Policy
`app.ts` disables all caching globally:
```ts
app.set('etag', false);
app.use((_, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
```
This ensures fresh data in the browser preview after seeding.

---

## 5. Database — `lib/db/`

### Connection
`lib/db/src/index.ts` — exports `db` (Drizzle client) and all schema tables. Reads `DATABASE_URL` from environment (Replit-managed PostgreSQL).

### Schema Tables

| Table | File | Key Columns |
|-------|------|-------------|
| `user_profiles` | `userProfiles.ts` | `userId` (PK text), `displayName`, `avatarKey`, `onboardingComplete` |
| `financial_profiles` | `financialProfiles.ts` | `id` (UUID PK), `userId` (unique), `annualIncome` (int), `monthlyExpenses` (int), `netWorth` (int), `savingsRate` (real), `riskTolerance`, `primaryGoalType` |
| `goals` | `goals.ts` | `id` (UUID), `userId`, `title`, `description`, `targetAmount` (int), `currentAmount` (int), `targetDate`, `category`, `status`, `priority` |
| `daily_missions` | `dailyMissions.ts` | `id` (UUID), `userId`, `missionDate`, `templateId`, `title`, `description`, `status` (pending/complete/skip), `completedAt` |
| `score_snapshots` | `scoreSnapshots.ts` | `id` (UUID), `userId`, `score` (int), `tier` (text), `driversJson` (JSON), `computedAt` |
| `bills` | `bills.ts` | `id` (UUID), `userId`, `name`, `amount` (int), `dueDate`, `account`, `category`, `isPaid`, `paidAt` |
| `briefings` | `briefings.ts` | `id` (UUID), `userId`, `title`, `scheduledDate`, `type`, `summary` |
| `notifications` | `notifications.ts` | `id` (UUID), `userId`, `type`, `title`, `body`, `targetScreen`, `targetId`, `isRead`, `isDismissed` |
| `notification_preferences` | `notificationPreferences.ts` | `id` (UUID), `userId`, `type`, `enabled`; **unique index on (userId, type)** |

### Dollar Amounts Convention
All monetary values are stored as **whole integers** (dollars, no cents). The UI strips decimals on input.

### Schema Changes Workflow
1. Edit schema file in `lib/db/src/schema/`
2. Run `pnpm --filter @workspace/db run push` (Drizzle Kit push to dev DB)
3. Run `pnpm --filter @workspace/api-spec run codegen` if API contract changes
4. **Never run migrations against production without testing on dev first**

### Seed Script
```bash
USER_ID=<clerk_user_id> tsx lib/db/src/seed.ts
```
Inserts: user profile, financial profile, 5 goals, 6 bills, 3 briefings, 5 notifications, notification preferences.  
Currently seeded user: `user_3GTbVecHEFffki4um3KxuwkBlTA`

---

## 6. Authentication — Clerk

### Setup
- Clerk application keys are stored as Replit Secrets: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- The frontend uses a **custom-built Clerk UI** (not Clerk's hosted UI components) — the `SignInScreen` and `CreateAccountScreen` call Clerk's low-level JS SDK directly
- A **Clerk proxy** is set up at `/api/__clerk` (via `clerkProxyMiddleware.ts`) so that in the browser/web preview, all Clerk API calls route through the same domain (avoiding mixed-origin issues)

### Native vs Web Auth Behaviour

| Context | How it works |
|---------|-------------|
| Web / Replit preview | Clerk session cookie + optional Bearer token; `proxyUrl` routes through Replit domain |
| iOS/Android (Capacitor) | `proxyUrl` is set to `undefined`; Clerk talks directly to its servers; `getToken()` returns JWT; `customFetch` attaches `Authorization: Bearer <jwt>` |

The branch in `App.tsx`:
```ts
const isCapacitor = !!(window as any).Capacitor;
const clerkPubKey = isCapacitor
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(...)
const clerkProxyUrl = isCapacitor ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;
```

---

## 7. Native Build Process (iOS / TestFlight)

### Prerequisites (local machine)
- Node 20+, pnpm, Xcode 16+
- iOS Simulator: iPhone 17 Pro
- Android Studio (optional): `~/StudioProjects/goalsy-main`

### Steps to Build and Sync

```bash
# 1. Pull latest from main
git pull origin main

# 2. Build the web app with the remote API URL baked in, then sync to Xcode
cd artifacts/goalsy-executive
pnpm run cap:build
# This runs:
# VITE_API_BASE_URL=https://<replit-dev-domain> vite build && npx cap sync
```

`pnpm run cap:build` does two things:
1. Runs `vite build` with `VITE_API_BASE_URL` set → all `/api/...` calls become `https://replit-domain/api/...`
2. Runs `npx cap sync` → copies `dist/public` into the iOS/Android native project

```bash
# 3. Open Xcode
npx cap open ios
# OR: open ~/StudioProjects/goalsy-main/ios/App/App.xcworkspace directly

# 4. In Xcode: Product → Clean Build Folder (⌘⇧K) → Run
```

### Other Capacitor Scripts

| Script | Command | Use |
|--------|---------|-----|
| `cap:sync` | `npx cap sync` | Sync JS only without rebuilding |
| `cap:open:ios` | `npx cap open ios` | Open Xcode |
| `cap:open:android` | `npx cap open android` | Open Android Studio |

---

## 8. Running Locally in Replit

All services start automatically via Replit Workflows:

| Workflow | Command | Port | Purpose |
|----------|---------|------|---------|
| `artifacts/goalsy-executive: web` | `pnpm --filter @workspace/goalsy-executive run dev` | 24521 | Frontend dev server |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 | Backend API |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | 8081 | Design tool (internal) |

Preview the app: select **Goalsy Executive** from the preview dropdown in Replit.

---

## 9. Environment Variables & Secrets

All managed via Replit Secrets (never committed to git):

| Secret / Env Var | Where used | Description |
|------------------|-----------|-------------|
| `CLERK_PUBLISHABLE_KEY` | API server | Clerk key for `@clerk/express` |
| `CLERK_SECRET_KEY` | API server | Clerk backend secret |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (Capacitor builds) | Clerk key for native context |
| `SESSION_SECRET` | API server | Express session signing |
| `DATABASE_URL` | API server + lib/db | PostgreSQL connection string (Replit-managed) |
| `VITE_API_BASE_URL` | Frontend (set at build time for native) | Full API base URL baked into native bundle |
| `VITE_CLERK_PROXY_URL` | Frontend (web only) | Clerk proxy path for browser builds |

---

## 10. Key Architectural Decisions

| Decision | What | Why |
|----------|------|-----|
| No Vite proxy | Root-relative `/api/*` URLs | Replit's path router forwards `/api` to the API server; no proxy config needed in web mode |
| Integer dollar amounts | All monetary DB columns are `integer` | Avoids floating-point precision bugs; whole dollars only |
| Deterministic mission rotation | 14 templates, rotated by `dayOfYear % 14` | Same mission for all users on the same day; no per-user scheduling overhead |
| Server-side score computation | Score calculated on `GET /score`, snapshot saved async | Single source of truth; prevents client manipulation |
| Orval code generation | API client generated from OpenAPI spec | Type-safe, always in sync with backend; never hand-written |
| `onConflictDoUpdate` for profiles | Financial profile and notification prefs use upsert | Idempotent — safe to call repeatedly from the UI without duplicating rows |
| `isCapacitor` branch in App.tsx | Different Clerk key + no proxy URL in native | Capacitor WebView hostname is always `localhost`; Clerk's domain detection fails without this |

---

## 11. What's Still To Be Built (Pending Work)

The following features are either fully mocked, partially implemented, or have no backend at all. Each item references the exact file and line so the next developer can jump straight in.

### A. Plaid / Bank Account Integration — Fully Mocked
**Affected files:** `FinancialConnectionScreen.tsx` (line 101), `TodayScreen.tsx` (line 38), `ProfileScreen.tsx` (line 391)

The "Connect Accounts" button in Step 03 of onboarding calls `simulateAsync(mockConnectedAccounts, 1800)` — a fake 1.8-second delay that pretends to connect. No real Plaid SDK is installed.

| Screen | What's mocked | What needs building |
|--------|--------------|-------------------|
| `FinancialConnectionScreen` (Step 03) | Entire connect flow is `simulateAsync` | Integrate Plaid Link SDK (`react-plaid-link` or Capacitor equivalent); call real Plaid `/link/token/create` and exchange token endpoint; store linked institution IDs |
| `TodayScreen` (total balance card) | `totalBalance` calculated from `mockConnectedAccounts` | Pull real balances from Plaid `/accounts/balance/get` after account linking; store and serve via a new `/api/accounts/balance` endpoint |
| `ProfileScreen` (Connected Accounts section) | Renders `mockConnectedAccounts` list | Show real linked accounts from DB after Plaid integration |

---

### B. Financial Health Screen — Entire Screen is Mock Data
**File:** `FinancialHealthScreen.tsx` (line 165)  
**No backend routes exist for this screen at all.**

The credit factors section renders `mockCreditFactors` imported from `mockData.ts`. There is no `/api/financial-health` or `/api/credit` endpoint.

**What needs building:**
- Define credit/health factor data model in the DB schema
- Add `GET /api/financial-health` route to the API server
- Add to OpenAPI spec → regenerate client hooks
- Wire `FinancialHealthScreen` to real API hook

---

### C. AI Home Screen — Action Button is Mock
**File:** `AIHomeScreen.tsx` (line 25–26)

The primary action button on this screen has a code comment `// MOCK DATA - replace with a real funds-transfer API call` and calls `simulateAsync(2400, 1500)`. No real AI or funds-transfer integration exists.

**What needs building:**
- Decide what this button should actually do (initiate a transfer? trigger an AI recommendation?)
- Build the corresponding API endpoint
- Integrate a real AI provider (OpenAI/Gemini via Replit AI Integrations) for recommendations if required

---

### D. Avatar / Profile Photo — Simulated, Not Saved
**File:** `ProfileScreen.tsx` (line 138–139)

Tapping "Change Avatar" runs `simulateAsync(true, 1400)` then picks a random emoji preset from `mockAvatarPresets`. No image is uploaded, no file is stored, and the selection is not persisted to the database.

**What needs building:**
- Add Replit Object Storage (or S3-compatible) for avatar file uploads
- Add `PUT /api/profile/avatar` endpoint
- Wire the avatar picker to upload the file and update `userProfiles.avatarKey`
- On app load, resolve the avatar URL from the stored key

---

### E. Biometric Login (FaceID) — Visual Preview Only
**File:** `SignInScreen.tsx` (line 197–201)

The FaceID button runs a scanning animation then shows a toast: *"Biometric Login Coming Soon — This is a preview of the FaceID experience."* Explicitly commented: *"no real biometric check and no session is created, so it must not grant navigation."*

**What needs building:**
- Install `@capacitor-community/biometric-auth` (or `@aparajita/capacitor-biometric-auth`)
- On successful biometric verification, call Clerk's passwordless sign-in or retrieve a stored token
- Handle fallback for devices without biometric capability

---

### F. Biometrics Toggle in Profile — Local State Only
**File:** `ProfileScreen.tsx` (line 105, 281–288)

The Security & Biometrics toggle sets `biometricsEnabled` React state only. It is not persisted to the database or device keychain and resets on every app launch.

**What needs building:**
- Store biometric preference in `notification_preferences` table (new type) or a separate `security_settings` table
- On toggle, call the Capacitor Biometric API to enroll/unenroll
- Read the persisted value on app start to restore the correct toggle state

---

### G. Subscription / Billing — Fully Mock
**File:** `ProfileScreen.tsx` (line 307, 426–433)

The "Plan & Subscription" section in Profile renders `mockSubscription` (tier, price, renewal date, features list). There is no payment provider, no real subscription record, and no billing API.

**What needs building:**
- Integrate a payment provider (Stripe for web/Android; RevenueCat for iOS in-app purchase)
- Store subscription status in the DB
- Add `GET /api/subscription` endpoint
- Show real tier, renewal date, and manage subscription link

---

### H. Help & Support Articles — Static Mock
**File:** `ProfileScreen.tsx` (line 447)

The Help & Support section renders `mockHelpArticles` — a static array of three hardcoded articles. Tapping them does nothing (no navigation, no external link).

**What needs building:**
- Either wire articles to a CMS (Notion, Contentful) or to a static JSON in the API
- Add navigation to a detail view or open an external URL
- Consider in-app chat/support via Intercom or similar

---

### Summary Table

| Feature | Screen | Status | Priority |
|---------|--------|--------|----------|
| Plaid bank connection | FinancialConnection, Today, Profile | 🔴 Fully mocked | High |
| Financial Health data | FinancialHealthScreen | 🔴 No backend, all mock | High |
| AI Home action | AIHomeScreen | 🔴 Simulated delay | Medium |
| Avatar upload & persistence | ProfileScreen | 🟡 Simulated, not saved | Medium |
| FaceID / biometric login | SignInScreen | 🟡 Visual only, no auth | Medium |
| Biometrics toggle persistence | ProfileScreen | 🟡 Local state only | Low |
| Subscription & billing | ProfileScreen | 🔴 Fully mocked | Medium |
| Help & support articles | ProfileScreen | 🟡 Static mock data | Low |

---

## 12. Known Issues & Status (Active Bugs)

| Issue | Status | Notes |
|-------|--------|-------|
| Financial Profile PUT failing on TestFlight | Under investigation | Server-side error logging added in latest push. Most likely cause: old TestFlight build used broken Clerk proxy URL in native context. Fixed in latest `main` — rebuild with `pnpm run cap:build` to verify |
| Toast overlapping Dynamic Island | **Fixed** | `ToastViewport` now uses `calc(env(safe-area-inset-top, 0px) + 1rem)` as padding-top |
| iOS blank screen / 404 from `server.url` | **Fixed** | Removed `server.url` from `capacitor.config.ts`; app now loads from bundled files; `VITE_API_BASE_URL` baked in at build time |

---

## 13. Codebase Conventions

- **All API route errors must log `console.error(err)`** before returning 500 — silent catch blocks make debugging impossible (this was retrofitted on financial-profile routes)
- **Components use `AppShell`** for standard screens (handles safe-area, scroll, header) — only onboarding screens (`FinancialConnectionScreen`) use manual layout
- **No mock data in production paths** — `mockData.ts` is only used for the Plaid simulation step which is intentionally unimplemented
- **Generated files are under `lib/api-client-react/src/generated/`** — do not edit; regenerate via `pnpm --filter @workspace/api-spec run codegen`
- **Tailwind classes, not inline styles**, except for safe-area and dynamic values that CSS `env()` functions require

---

## 14. Contacts & Access

| Resource | Details |
|----------|---------|
| GitHub repo | `https://github.com/gurudeepak2001/goalsy.git` |
| Replit workspace | This repl |
| Replit dev preview | `https://b89a11ff-b052-43b2-b941-88baf72a4a02-00-1vdn0ng8937zm.kirk.replit.dev/` |
| Clerk dashboard | Replit-managed (access via Replit integrations) |
| Database | Replit-managed PostgreSQL (access via Replit DB tab) |
| TestFlight | Requires Apple Developer account; distribute via Xcode Organizer |
