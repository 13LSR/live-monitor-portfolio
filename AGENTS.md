# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 16 App Router project for a live-monitor portfolio. Current app code lives in `app/`, with `app/page.tsx` holding the demo that embeds a live site and polls UptimeFlare. Shared styles live in `app/globals.css`; static assets belong in `public/`. Product intent and scope are defined in `项目需求文档.md`.

As the project grows, keep routes in `app/` and colocate non-routable code in private folders such as `app/_components/`, `app/_lib/`, and `app/_data/`. Prefer small feature-specific components over expanding `app/page.tsx` further.

## Build, Test, and Development Commands

- `npm run dev` starts the local Next.js dev server.
- `npm run build` creates the production build; use this before deployment validation.
- `npm run start` serves the production build locally.
- `npm run lint` runs ESLint with the Next.js core-web-vitals and TypeScript rules.

## Coding Style & Naming Conventions

Use TypeScript, 2-space indentation, and strict typing. Name React components in `PascalCase`, helpers in `camelCase`, and route folders with lowercase names. In Next.js 16, pages and layouts are Server Components by default; add `"use client"` only for UI that needs `useEffect`, state, browser APIs, or iframe interaction toggles.

Keep monitoring and site URLs out of hard-coded component logic when possible. Use `.env.local` for runtime configuration, and expose values to the browser only with `NEXT_PUBLIC_` when truly required.

## Testing Guidelines

No test runner is configured yet. At minimum, every feature PR must pass `npm run lint` and include manual verification notes for iframe rendering, UptimeFlare status updates, and offline/error states. When tests are added, prefer `*.test.ts(x)` for unit tests and `*.spec.ts` for end-to-end coverage.

## Commit & Pull Request Guidelines

Git history currently contains only the initial scaffold commit, so no mature convention exists yet. Use short imperative commit messages such as `feat: extract live project card` or `fix: handle offline monitor state`.

PRs should include: purpose, screenshots or short recordings for UI changes, affected routes, environment/config changes, and manual test steps. Link the relevant section of `项目需求文档.md` when implementing a planned module.

## Architecture Notes

This project targets a Bento-style monitoring portfolio. Core work should progress in this order: extract reusable live-card components, add a typed UptimeFlare data layer, build the multi-module Bento layout, then finalize deployment headers and iframe embedding policies for monitored sites.
