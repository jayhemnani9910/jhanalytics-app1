# AGENTS.md, Tailor Measurement App

Project rules for any AI agent (Antigravity, etc.) working in this repo. Read this first, every session.

## What this is

A phone-first, offline-capable PWA for a tailor shop to store customer measurements and track multi-garment orders, backed by Firebase, with a shared shop login and an English/Gujarati toggle.

- **Full design and rationale:** `docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md`
- **Step-by-step build plan (follow this):** `docs/superpowers/plans/2026-05-21-tailor-measurement-app.md`

Build the app by following the plan top to bottom, one task at a time.

## Tech stack

React 18 + Vite + TypeScript (strict). Zustand for the client store. React Router. Firebase (Firestore, Auth, Storage). `vite-plugin-pwa` (Workbox). `browser-image-compression` + `idb` for offline photos. Vitest + Testing Library, Firebase Emulator Suite, Playwright.

## Commands

- Dev server: `npm run dev`
- Unit tests: `npm run test` (single file: `npm run test -- path/to/file.test.ts`)
- Emulators: `npm run emulators`
- E2E: `npm run e2e`
- Build (must pass before done): `npm run build`

## How to work

- **Test-driven.** For each task: write the failing test, run it and confirm it fails, write the minimal code, run it and confirm it passes. The plan gives exact test and implementation code for the domain layer; follow it.
- **Small steps.** Do one plan step at a time. Do not batch many features into one change.
- **Architecture boundaries (do not cross):**
  - `src/domain/` is pure logic. It must not import anything from `firebase` or React. It is the unit-tested core.
  - `src/firebase/` is the only place that talks to Firestore/Auth/Storage.
  - `src/store/` holds the Zustand store fed by realtime listeners.
  - UI in `src/screens/` and `src/components/` reads from the store and calls `src/firebase/repo.ts` for writes. UI never queries Firestore directly.

## Non-obvious rules (these are real footguns, honor them)

- **Measurement values are strings, never numbers.** Tailors write "37½", "38+1", "loose". Money (price, advance) is numeric.
- **`deadline` is a `YYYY-MM-DD` string,** compared as a date. Do not store it as a timestamp (timezone drift).
- **Never store `customerName` on an order.** Derive the display name from the cached customer by `customerId`. Denormalizing it causes stale names after a rename.
- **Read snapshots with estimated server timestamps** (`snapshot.data({ serverTimestamps: 'estimate' })`) so `createdAt`/`updatedAt` are not null while offline; otherwise "Recent" ordering breaks on the writing device.
- **Measurements are an array of rows** `{ fieldId, label, value, unit }` with `label` snapshotted, so renaming or deleting a template field never corrupts old orders. Template fields carry a stable `id`.
- **Orders are multi-garment:** an order has `items[]`, one shared `deadline`, one combined bill (advance at order level, price per item), and one `tokenNo`. Total, balance, and the order status rollup are computed, not stored.
- **First-run template seeding must be transaction-guarded** against a `settings/app.seeded` flag so two devices can't double-seed.
- **Tokens are best-effort unique** 4-digit codes, checked against non-delivered orders only, stable after creation. The Firestore doc id is the real identity.
- **Photos work offline:** compress, store the blob in IndexedDB, reference as `local:<id>`, upload on reconnect and swap to the Storage path, clean up blobs and Storage objects on delete.
- **All user-facing text goes through `useT`.** Add every new key to both `src/i18n/en.ts` and `src/i18n/gu.ts`.

## Secrets and config

- Firebase config comes from a local `.env` (Vite `VITE_` prefix). See `.env.example`.
- **Never commit `.env` or any real keys.** It is git-ignored. The app should fail fast with a readable message if config is missing.
- The Firebase project, the Email/Password provider, the shared shop user, and security-rule deployment are manual one-time human steps (spec Section 4). Do not attempt to provision Firebase from code.

## Git workflow (important)

- This repo is connected to GitHub (`origin`, public). After completing each plan task, **commit and push**:
  - Commit messages use Conventional Commits (`feat:`, `test:`, `fix:`, `chore:`, `docs:`).
  - `git add -A && git commit -m "<message>" && git push`
- Make one commit per task so history stays granular and reviewable. Do not squash multiple tasks into one commit.
- Never commit `.env`, `node_modules`, build output, or Firebase service-account keys.

## Definition of done

All four pass: `npm run test`, the emulator integration tests, `npm run e2e`, and a clean `npm run build`. Then run the self-review checklist at the end of the plan.
