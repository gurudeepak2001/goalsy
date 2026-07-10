---
name: Figma matching vs. functionality
description: When matching a Figma design in a React app, preserve semantic components and accessibility instead of replacing dynamic screens with static background images.
---

**Rule:** Use full-screen Figma background images only for genuinely static onboarding screens (splash, welcome, sign-in, create-account, financial connection). For main app screens that contain dynamic content, lists, toggles, or charts, keep component-based implementations and style them to match the Figma.

**Why:** Replacing a dynamic screen with a static image and a few hotspot overlays removes real UI elements, breaks keyboard/screen-reader accessibility, and makes future changes brittle. A code review on this project flagged the AI Home, Goals Overview, and Financial Health screens as critical regressions when they were converted to static images.

**How to apply:**
1. Decide per screen whether the content is static or dynamic.
2. For static screens, use a Figma PNG as the background and overlay only the interactive elements (e.g., buttons, links).
3. For dynamic screens, keep the existing components and adjust their props/styling to match the Figma. Add accessibility attributes (`aria-label`, `htmlFor`) to any visually overlaid inputs.
4. Always run typecheck, production build, and a code review after sweeping visual changes.
