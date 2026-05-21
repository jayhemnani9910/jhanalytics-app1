# jhanalytics-app1, Tailor Measurement App

A phone-first, offline-capable PWA for a tailor shop to store customer measurements and track multi-garment orders. Shared shop login, English/Gujarati toggle, built on Firebase.

This repository currently contains the design spec, the implementation plan, and the agent rules. The application code is built by following the plan.

## Documents

- **Design spec:** [`docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md`](docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md)
- **Implementation plan:** [`docs/superpowers/plans/2026-05-21-tailor-measurement-app.md`](docs/superpowers/plans/2026-05-21-tailor-measurement-app.md)
- **Agent rules:** [`AGENTS.md`](AGENTS.md)

## Tech stack

React + Vite + TypeScript PWA, Zustand, React Router, Firebase (Firestore, Auth, Storage), Vitest, Firebase Emulator Suite, Playwright.

## Manual setup (one time, before running)

1. Create a Firebase project.
2. Enable Firestore, Authentication (Email/Password), and Cloud Storage.
3. Create the single shared shop user (email + password) in the Auth console.
4. Copy `.env.example` to `.env` and fill in the Firebase web config.
5. Deploy security rules (`firestore.rules`, `storage.rules`) once they exist.

## Common commands

```bash
npm install         # install dependencies
npm run dev         # start the dev server
npm run test        # run unit tests
npm run emulators   # start Firebase emulators (firestore, auth, storage)
npm run e2e         # run Playwright end-to-end tests
npm run build       # production build
```

## Status

Push notifications are a deferred phase (requires the Firebase Blaze plan). v1 ships visual deadline highlighting only. See the spec for the full scope and accepted tradeoffs.
