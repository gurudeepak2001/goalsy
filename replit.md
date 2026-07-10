# Goalsy Executive

A dark, mobile-first executive finance application with a complete onboarding flow, AI-driven dashboard, financial health tracking, calendar, goals, and profile/score screens. Built to match the provided Figma reference pixel-for-pixel.

## Run & Operate

- `pnpm --filter @workspace/goalsy-executive run dev` — run the Goalsy Executive web app
- `pnpm --filter @workspace/api-server run dev` — run the shared API server (not used by the frontend)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + wouter
- UI: Custom dark executive design system built on top of the scaffold
- API: Shared Express server (currently unused by the frontend; all screens are static)

## Where things live

- Onboarding screens: `artifacts/goalsy-executive/src/pages/SplashScreen.tsx`, `WelcomeScreen.tsx`, `SignInScreen.tsx`, `CreateAccountScreen.tsx`, `FinancialConnectionScreen.tsx`
- Dashboard screens: `artifacts/goalsy-executive/src/pages/AIHomeScreen.tsx`, `FinancialHealthScreen.tsx`, `CalendarScreen.tsx`, `GoalsOverviewScreen.tsx`, `ProfileScreen.tsx`, `ScoreScreen.tsx`
- Shared components: `artifacts/goalsy-executive/src/components/`
- Theme: `artifacts/goalsy-executive/src/index.css`
- Figma references: `attached_assets/figma/`
- Screenshots: `screenshots/`

## Architecture decisions

- Static example data for all screens — no backend integration required for the current MVP.
- All dashboard screens share `AppShell` with a fixed `BottomNav` for consistent navigation.
- Custom reusable components (not shadcn) are used for all executive UI elements.
- Dark theme is enforced globally by adding the `dark` class to `document.documentElement` in `App.tsx`.
- Unused shadcn UI scaffold components were removed to keep the repo clean.

## Product

Goalsy Executive is a premium financial intelligence app for ambitious professionals. It delivers strategic AI insights, financial health scoring, a financial calendar, goal tracking, and credit intelligence in a dark executive interface.

## User preferences

- Match Figma exactly; do not redesign without explicit approval.
- Dark executive theme is mandatory for all screens.
- Mobile-first design, max-w-md centered layout.

## Gotchas

- The app is always dark; do not rely on the `prefers-color-scheme` media query.
- Vite workflow must be restarted after `index.css` or component changes to refresh the proxy preview.
- Bottom navigation requires `AppShell` with `activeTab` to render correctly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Figma reference images are in `attached_assets/figma/` for all future screens.
