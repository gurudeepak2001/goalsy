---
name: Onboarding overlay alignment
description: How to keep Figma PNG backgrounds and transparent tap targets aligned without click/tap offset.
---

When onboarding screens use a full-screen Figma PNG background with transparent interactive overlays, the overlay positions must stay proportional to the visible elements in the image. If the container or image is cropped/scaled independently, the visible buttons shift relative to the hit targets and clicks land in the wrong place.

**Why:** Background images rendered with `object-cover` in a responsive container are cropped to fill the box. The visible portion of the image changes with viewport size and container aspect ratio, while absolutely-positioned overlays stay at fixed pixel coordinates. On a 390×844 Figma export placed in a `max-w-md` (448px) container, the image is cropped both horizontally and vertically, so the visible buttons no longer sit where the overlays are.

**Rule:** Keep the onboarding container locked to the Figma frame’s native aspect ratio (e.g., `aspect-[390/844]` with `max-w-[390px]` and `max-h-[100dvh]`), and position all overlays with percentages instead of pixels. Percentages scale with the container, so the hit targets move with the visible elements.

**Files to watch:**
- `src/components/OnboardingShell.tsx` — shared wrapper that enforces the fixed aspect ratio.
- `src/pages/SplashScreen.tsx`, `WelcomeScreen.tsx`, `SignInScreen.tsx`, `CreateAccountScreen.tsx`, `FinancialConnectionScreen.tsx` — should use the shared wrapper and percentage-based overlays.

**Why:** This preserves the Figma-exact visual while making the tap targets align at any viewport size, including the Replit preview iframe.
