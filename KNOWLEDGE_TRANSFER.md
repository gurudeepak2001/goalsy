# Goalsy Executive — Knowledge Transfer Document

> **Prepared for:** Lead / Stakeholder briefing  
> **Last updated:** August 2026  
> **Author:** Replit Agent (via codebase analysis)

---

## 1. What Is This App?

**Goalsy Executive** is a dark-themed, mobile-first personal finance command centre for professionals. It helps users track and grow their wealth through:

- **Executive Score** (0–1,000 composite health score)
- **Financial Goals** with progress tracking and behind-schedule alerts
- **Daily Missions** aligned to financial goals
- **Bills & Calendar** — upcoming payment tracking
- **AI Briefings** — daily financial insight summaries
- **Notifications** — smart alerts for score changes, overdue bills, goal milestones
- **Financial Health** — credit and net-worth view
- **Profile & Security** — biometric toggle, preferences

**Target user:** High-net-worth / ambitious professionals who want an executive-grade finance overview at a glance.

**Platforms:** iOS (primary), Android, and web browser.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Routing | Wouter |
| Server state / caching | TanStack React Query |
| UI primitives | Radix UI |
| Icons | Lucide React |
| Animation | Framer Motion |
| Auth | Clerk (custom low-level UI — no Clerk-hosted pages) |
| Backend | Express 5 + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| API contract | OpenAPI YAML → Orval (auto-generates typed hooks + Zod schemas) |
| Mobile shell | Capacitor 8 (wraps the Vite web build for iOS/Android) |
| Package manager | pnpm (monorepo via pnpm workspaces) |
| Logging | Pino (structured JSON logs on server) |
| Hosting | Replit (dev + preview); Xcode/Capacitor for native builds |

---

## 3. Monorepo Structure

```
goalsy/                         ← repo root
├── artifacts/
│   ├── goalsy-executive/       ← Frontend web + Capacitor shell
│   │   ├── src/                ← React app source
│   │   ├── ios/                ← Xcode native project
│   │   ├── android/            ← Android Studio native project
│   │   └── capacitor.config.ts
│   ├── api-server/             ← Express API backend
│   │   └── src/
│   │       ├── app.ts          ← Express app setup
│   │       ├── index.ts        ← Server entry point
│   │       ├── routes/         ← Route modules
│   │       └── score-engine/   ← Score calculation logic
│   └── mockup-sandbox/         ← Internal design preview server (dev only)
├── lib/
│   ├── db/                     ← Drizzle schema, migrations, seed
│   ├── api-spec/               ← openapi.yaml (single source of truth)
│   ├── api-client-react/       ← Orval-generated React Query hooks
│   └── api-zod/                ← Orval-generated Zod types/validators
└── scripts/                    ← Workspace utilities
```

### Key principle: `lib/api-spec/openapi.yaml` is the contract
Any new API endpoint: (1) add to `openapi.yaml`, (2) run Orval to regenerate the typed hooks in `lib/api-client-react`, (3) implement the route in `api-server`. Never write raw fetch calls in the frontend.

---

## 4. Database Schema

All money stored as **whole-dollar integers** (no floats, no cents).

| Table | Purpose |
|---|---|
| `user_profiles` | Name, avatar, username, join date |
| `financial_profiles` | Net worth, income, credit score, savings rate |
| `goals` | Goal name, type, target amount, target date, status |
| `goal_progress_entries` | Contribution history per goal |
| `daily_missions` | Day's tasks linked to goals |
| `score_snapshots` | Historical Executive Score records |
| `bills` | Bill name, amount, due date, paid status |
| `briefings` | AI-generated daily summaries |
| `notifications` | Alert records with type, read status, deep-link target |
| `notification_preferences` | Per-user notification on/off settings |

---

## 5. Authentication Flow

Goalsy uses **Clerk** with fully custom UI (no Clerk-hosted sign-in pages).

### Web flow
1. User enters credentials on `/signin` or `/create-account` (custom React screens).
2. Clerk SDK validates → returns session JWT.
3. `ApiClientBootstrap` component calls `clerk.session.getToken()` and passes it to `initApiClient`.
4. All API requests include `Authorization: Bearer <JWT>`.
5. Server `requireAuth` middleware calls Clerk's `getAuth(req)` → extracts `userId` → sets `res.locals.userId`.
6. Web uses a Clerk proxy route (`/api/__clerk`) to relay Clerk requests — avoids CORS issues.

### Native (iOS/Android Capacitor) quirk — important
Clerk's dev-mode session token (`__clerk_db_jwt`) lives only in JavaScript memory. When the iOS app is **force-killed**, WebView memory is wiped, so the user appears signed out on reopen.

**Fix implemented (commit `87b28c3` → `1632d27`):**
- On cold start, `preloadDbJwt()` reads the saved token from Capacitor `Preferences` (key: `cm_clerk_db_jwt`).
- `restoreDbJwtIntoUrl()` writes it into the page URL (`?__clerk_db_jwt=...`) via `history.replaceState` **before** `ClerkProvider` mounts.
- Clerk adopts it natively through its own URL-reading logic and cleans the URL.
- A **1.5-second boot gate** ensures ClerkProvider never mounts before restore completes (prevents a race condition).
- A **passive fetch interceptor** watches outgoing FAPI requests and response headers to keep the saved token updated; it never injects — only reads and saves.
- Native builds bypass the Clerk proxy and talk directly to Clerk's FAPI.

### Session lifetime
- Configured in Clerk Dashboard → Configure → Sessions.
- Currently set to **30 days** maximum session lifetime.
- No inactivity timeout — users stay signed in unless they explicitly sign out.

---

## 6. Frontend Screens

| Route | Screen | Purpose |
|---|---|---|
| `/welcome` | WelcomeScreen | Signed-out landing; sign in / create account CTAs |
| `/signin` | SignInScreen | Custom Clerk email+password login |
| `/create-account` | CreateAccountScreen | Custom Clerk registration |
| `/today` | TodayScreen | Dashboard: score, total balance, daily briefing, missions, key stats |
| `/goals` | GoalsScreen | List of financial goals with progress |
| `/goals/:id` | GoalDetailScreen | Single goal: contributions, progress chart, behind-schedule alert |
| `/calendar` | CalendarScreen | Bills calendar with upcoming/overdue payments |
| `/ai-home` | AIHomeScreen | AI briefings and insights |
| `/notifications` | NotificationsScreen | All notifications; tap to deep-link to relevant screen |
| `/profile` | ProfileScreen | User info, preferences, security (biometric toggle) |
| `/financial-health` | FinancialHealthScreen | Credit score, net-worth view |

### Navigation
- **Bottom tab bar** (5 tabs): Today · Goals · Calendar · AI · Profile
- `AppShell` component wraps every authenticated screen — provides the sticky animated header, safe-area padding, and tab bar.
- Clerk `routerPush`/`routerReplace` delegate to Wouter for SPA routing.

---

## 7. API Server

Base path: `/api`

All routes require a valid Clerk session (401 otherwise).

| Route group | Endpoints |
|---|---|
| Goals | CRUD for goals + progress entries |
| Missions | Today's missions, mark complete |
| Score | Current score + historical snapshots |
| Bills | CRUD, mark paid |
| Briefings | Latest AI briefing |
| Notifications | List, mark read, preferences |
| Profile | User profile + financial profile |

Score calculation lives in `artifacts/api-server/src/score-engine/` — it aggregates goals, bills, missions, and financial profile into the 0–1,000 composite score.

---

## 8. Mobile (Capacitor) Setup

Capacitor wraps the Vite build as a native iOS/Android app — no separate React Native codebase.

**Key config (`capacitor.config.ts`):**
- `appId`: `com.goalsy.executive`
- `webDir`: `dist/public` (Vite output)
- No `server.url` — the app loads its own **bundled files** (not a remote server). The API URL is baked in at build time via `VITE_API_BASE_URL`.
- `contentInset: 'never'` on iOS — CSS handles all safe areas via `env(safe-area-inset-*)`. Setting this to `'always'` caused a bug where the tab bar had a dead band beneath it (native inset + CSS inset doubled up).
- Keyboard plugin: `resize: 'body'` + `resizeOnFullScreen: true` — keyboard pushes the body up, not the viewport.

**iOS native project:** `artifacts/goalsy-executive/ios/App` (Xcode)  
**Android native project:** `artifacts/goalsy-executive/android/app` (Android Studio)

---

## 9. Environment Variables & Secrets

| Variable | Where used | Purpose |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (web + native) | Clerk public key |
| `CLERK_PUBLISHABLE_KEY` | API server | Clerk public key (server proxy) |
| `CLERK_SECRET_KEY` | API server | Clerk secret (auth verification) |
| `VITE_CLERK_PROXY_URL` | Frontend web only | Routes Clerk requests through `/api/__clerk` |
| `VITE_API_BASE_URL` | Native build only | Baked-in Replit API base URL |
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `PORT` | API server | Assigned by Replit per artifact |
| `SESSION_SECRET` | Available (reserved) | Not currently active in code |

Secrets are managed via Replit Secrets — never committed to git.

---

## 10. How to Run Locally (Dev)

```bash
# Install all workspace dependencies
pnpm install

# Start the API server (terminal 1)
pnpm --filter @workspace/api-server run dev

# Start the frontend (terminal 2)
pnpm --filter @workspace/goalsy-executive run dev

# Type-check everything
pnpm run typecheck

# Run frontend tests (Vitest)
pnpm --filter @workspace/goalsy-executive run test
```

DB commands:
```bash
# Push schema changes to the database
pnpm --filter @workspace/db run push

# Seed data for a specific Clerk user
USER_ID=<clerk_user_id> tsx lib/db/src/seed.ts
```

---

## 11. How to Build for iOS

Run this sequence after every code change:

```bash
# 1. Pull latest code
git pull origin main

# 2. Go to the frontend artifact
cd artifacts/goalsy-executive

# 3. Build + sync to native (sets VITE_API_BASE_URL, runs vite build, then npx cap sync)
pnpm run cap:build

# 4. Open in Xcode
npx cap open ios
```

In Xcode:
- Select your target device / simulator
- **Cmd + Shift + K** (Clean Build Folder) — especially after Capacitor config changes
- **Cmd + R** (Run)

For TestFlight / App Store: Xcode Organizer → Archive → Distribute.

> **Important:** After any `capacitor.config.ts` change, you must run `cap:build` (not just `cap:sync`) and do a Clean Build in Xcode.

---

## 12. Significant Bugs Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| Force-kill signs user out (iOS) | Clerk dev-token lives in JS memory; WebView wipe = signed out | Persist token to Capacitor Preferences; restore into URL before Clerk init; 1.5s boot gate for race |
| Blank screen on native load | `server.url` pointed to Replit dev server (unreachable from app store build) | Removed `server.url`; app now loads bundled files; API URL baked at build |
| Dead band below tab bar (iOS) | `contentInset: 'always'` + CSS safe areas = double inset | Set `contentInset: 'never'`; CSS handles safe areas alone |
| Dynamic Island content overlap | No top safe-area padding on header | Added `pt-safe` + `--safe-top` CSS variable |
| Keyboard hiding form fields | Default WebView keyboard resize | Capacitor Keyboard plugin with `resize: 'body'` + `resizeOnFullScreen: true` |

---

## 13. Known Pending Work

| Area | Status |
|---|---|
| Behind-schedule warning on contribution-rate goal detail | Proposed (task #36) |
| Silent failure when contribution-rate goal has no saved amount | Proposed (task #37) |
| Plaid integration (real bank balance sync) | Not started |
| Real Financial Health backend | UI exists; backend/schema not wired |
| Biometric FaceID | Toggle exists visually; not functionally wired |
| Avatar upload / persistent storage | Not started |
| AI home real provider | Placeholder screen |
| Subscriptions / billing | Not started |
| Remove temporary debug tooling | Pending confirmation of session-restore fix |

---

## 14. Repository

**GitHub:** `github.com/gurudeepak2001/goalsy` (branch: `main`)  
**Hosting:** Replit (preview + API server)  
**Native builds:** Xcode (iOS), Android Studio (Android)
