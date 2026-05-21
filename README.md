# Tailor Measurement App 🪡

A phone-first, offline-capable Progressive Web App (PWA) designed for small tailor shops to record customer measurements, track multi-garment orders, manage custom garment templates, and queue photos offline.

This application is engineered with an **offline-first** architecture backed by Firestore persistent cache, a local IndexedDB photo queue, and a pure unit-tested domain layer. It uses a single shared shop credential for all employees to keep operations simple and cost-free on Firebase's free tier.

---

## 📖 Key Project Documents

For high-level specifications and technical guidelines:
- **Design Specification:** [docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md](file:///home/po/projects/work/bardoliapp/pareshbhai-tailor/docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md)
- **Step-by-Step Build Plan:** [docs/superpowers/plans/2026-05-21-tailor-measurement-app.md](file:///home/po/projects/work/bardoliapp/pareshbhai-tailor/docs/superpowers/plans/2026-05-21-tailor-measurement-app.md)
- **Agent Rules & Boundaries:** [AGENTS.md](file:///home/po/projects/work/bardoliapp/pareshbhai-tailor/AGENTS.md)

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core:** React 18, Vite, TypeScript (Strict Mode)
- **State Management:** Zustand (Client-side single source of truth fed by realtime Firestore listeners)
- **Database & Auth:** Firebase Auth (Email/Password), Cloud Firestore (with Offline Persistence enabled), Cloud Storage (Garment Photos)
- **Service Worker / PWA:** `vite-plugin-pwa` (Workbox)
- **Offline Photos:** `browser-image-compression` + IndexedDB via `idb` for deferred uploads
- **Testing Suite:** Vitest (Unit/Integration), Playwright (E2E), Firebase Emulator Suite

### Architectural Boundaries
To ensure codebase maintainability and testability, we strictly enforce these boundaries:
1. `src/domain/`: Pure logical layer. Highly unit-tested core. It **must never** import React or Firebase.
2. `src/firebase/`: Isolated infrastructure layer. This is the only module allowed to interact with Firestore, Firebase Auth, and Storage.
3. `src/store/`: The Zustand client store which listens to realtime updates and exposes readable states.
4. UI Components (`src/screens/` and `src/components/`): Read exclusively from the store and dispatch writes via `src/firebase/repo.ts`. UI components never query Firestore directly.

---

## ⚙️ Prerequisites & Manual Setup (One-time)

Before launching the application or running the local environment, a human operator must perform these manual steps:

1. **Create a Firebase Project:**
   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.

2. **Configure Firebase Services:**
   - **Firestore Database:** Enable Firestore in test or production mode (rules are managed locally).
   - **Authentication:** Enable the **Email/Password** sign-in provider.
   - **Cloud Storage:** Enable Cloud Storage to host garment photos.

3. **Create the Shared Shop Account:**
   In the Firebase Auth Console, manually create a single shared credential (e.g. `shop@example.com` / `password123`) that all staff members will use to access the app.

4. **Prepare Security Rules:**
   Rules are defined locally in `firestore.rules` and `storage.rules` and can be deployed via Firebase CLI.

---

## 🔑 Environment Configuration

The application uses Vite environment variables. 
1. Copy the example configuration to a local `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your unique Firebase Web SDK credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_APP_ID=your_app_id
   ```

> [!WARNING]
> Never commit `.env` or real API keys to the repository. The `.env` file is git-ignored by default.

---

## 🚀 Development and Emulators

The app is built to run entirely locally using the Firebase Emulator Suite for hermetic testing and development.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Firebase Emulators
Start Firestore, Auth, and Storage emulators locally on standard ports:
```bash
npm run emulators
```
*Emulators run Firestore on `8080`, Auth on `9099`, and Storage on `9199`.*

### 3. Launch the Local Dev Server
In a separate terminal panel, start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The app automatically detects the local environment and connects to the running emulators.

---

## 🧪 Testing Pipeline

Our testing pipeline includes three levels of verification: pure domain unit testing, emulator-backed integration testing, and full browser E2E scenario testing.

### Run Unit and Integration Tests
Uses Vitest to run all domain unit tests and repository-level emulator integration tests:
```bash
npm run test
```
*Note: Excludes E2E spec files from running in Vitest. Integration tests will automatically target the Firestore, Auth, and Storage emulators.*

### Run End-to-End Tests (Playwright)
Executes our full hermetic E2E driving scenario (logging in, creating customers, multi-garment orders, testing search, offline status rollups, and language toggling):
```bash
npm run e2e
```
*This command launches a production preview server and runs Playwright assertions against the emulators.*

---

## 📦 Production Compiling & Building

To verify code syntax, TypeScript strict mode, and bundle output, compile the production distribution:
```bash
npm run build
```
This generates the optimized, production-ready static assets and service workers inside the `dist/` directory.

---

## 🌐 Deploying to Firebase Hosting

To host the application live on the web:

1. **Install Firebase CLI globally:**
   ```bash
   npm install -g firebase-tools
   ```
2. **Log into Firebase:**
   ```bash
   firebase login
   ```
3. **Initialize Hosting:**
   Run the setup wizard (if not initialized) and select your Firebase project:
   ```bash
   firebase init hosting
   ```
   - Select your public directory as `dist`
   - Configure as a single-page app: `Yes`
   - Set up automatic builds and deploys with GitHub: `No` (or as desired)
4. **Deploy Assets and Security Rules:**
   ```bash
   firebase deploy --only hosting,firestore:rules,storage:rules
   ```

---

## 📳 Push Notifications Note

Push notifications are a deferred feature. Real push notifications require a service worker subscription mechanism, a server/cloud-function worker, and the Firebase Blaze plan (due to API access). For v1, the app relies on visual deadline indicators, red alerts for overdue items, and a persistent tab layout to ensure no orders are forgotten.
