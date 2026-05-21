# Tailor Measurement App, Implementation Plan

> **For the building agent (Antigravity):** Build this task-by-task, top to bottom. Each task is small on purpose. Follow test-driven development: write the test, watch it fail, write the minimal code, watch it pass, then commit and push. Do not skip ahead. The full design rationale is in `docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md`; project rules and commands are in `AGENTS.md`. Steps use `- [ ]` checkboxes so progress is trackable.

**Goal:** A phone-first, offline-capable PWA for a tailor shop to store customer measurements and track multi-garment orders, backed by Firebase, with a shared shop login and an English/Gujarati toggle.

**Architecture:** React + Vite PWA. Firestore with offline persistence is the store; the app subscribes with realtime listeners into a single in-memory client store (Zustand) and computes all search, dashboard buckets, totals, and status rollups in memory so everything works offline. Pure domain logic is isolated in `src/domain/` with no Firebase imports, so it is fully unit-testable. Firebase access is isolated in `src/firebase/`. UI reads only from the store.

**Tech Stack:** React 18, Vite, TypeScript, Zustand, React Router, Firebase (Firestore, Auth, Storage), `vite-plugin-pwa` (Workbox), `browser-image-compression`, `idb` (IndexedDB helper), Vitest + Testing Library, Firebase Emulator Suite, Playwright.

---

## Conventions used throughout this plan

- Indentation: 2 spaces. Quotes: single. TypeScript strict mode on.
- Money is a number in rupees. Measurement values are strings. Dates (`deadline`) are `YYYY-MM-DD` strings.
- Commit message style: Conventional Commits (`feat:`, `test:`, `fix:`, `chore:`). After each task's final step, commit and push (see AGENTS.md).
- Run a single Vitest file with: `npm run test -- src/domain/money.test.ts`.

---

## Phase 0: Project scaffold

### Task 0.1: Create the Vite + React + TypeScript project

**Files:**
- Create: whole project skeleton in repo root (already a git repo with `docs/`, `AGENTS.md`, `.gitignore`, `.env.example` present, do not overwrite them).

- [ ] **Step 1: Scaffold into the current directory**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
If it warns about existing files (`docs`, `AGENTS.md`, etc.), choose "Ignore files and continue". Do not delete existing files.

- [ ] **Step 2: Install dependencies**

```bash
npm install firebase zustand react-router-dom browser-image-compression idb
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-plugin-pwa @playwright/test
```

- [ ] **Step 3: Add scripts to `package.json`**

Ensure the `scripts` block contains:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "emulators": "firebase emulators:start --only firestore,auth,storage",
  "e2e": "playwright test"
}
```

- [ ] **Step 4: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tailor App',
        short_name: 'Tailor',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111827',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```

- [ ] **Step 5: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Verify it builds and tests run**

Run: `npm run build` then `npm run test`
Expected: build succeeds; Vitest runs and reports "no tests found" (acceptable at this point).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite react-ts pwa project" && git push
```

### Task 0.2: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write the types**

```ts
export type Gender = 'female' | 'male' | 'other';
export type OrderStatus = 'pending' | 'ready' | 'delivered';
export type Language = 'en' | 'gu';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  gender?: Gender;
  notes?: string;
  nameLower: string;
  createdAt: number; // epoch ms (estimated locally while offline)
  updatedAt: number;
}

export interface TemplateField {
  id: string;
  label: string;
  unit: string; // default 'in'
}

export interface Template {
  id: string;
  name: string;
  fields: TemplateField[];
  gender?: Gender;
  isDefault: boolean;
  createdAt: number;
}

export interface MeasurementRow {
  fieldId: string | null; // null for custom rows
  label: string;
  value: string; // free text: '37', '37½', 'loose'
  unit: string;
}

export interface OrderItem {
  itemId: string;
  garmentType: string;
  templateId: string | null;
  quantity: number;
  measurements: MeasurementRow[];
  price?: number;
  status: OrderStatus;
}

export interface Order {
  id: string;
  tokenNo: string;
  customerId: string;
  deadline: string; // YYYY-MM-DD
  items: OrderItem[];
  advancePaid?: number;
  notes?: string;
  photos: string[]; // 'local:<id>' or storage path
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  language: Language;
  shopName?: string;
  seeded: boolean;
}

export type DeadlineBucket = 'overdue' | 'due-soon' | 'upcoming';
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add shared domain types" && git push
```

---

## Phase 1: Pure domain logic (fully TDD, no Firebase)

All functions live under `src/domain/` and import nothing from Firebase. Each has a `.test.ts` beside it.

### Task 1.1: Money (totals and balance)

**Files:**
- Create: `src/domain/money.ts`, `src/domain/money.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { orderTotal, orderBalance } from './money';
import type { Order } from '../types';

const baseItem = { itemId: 'i1', garmentType: 'Blouse', templateId: null, quantity: 1, measurements: [], status: 'pending' as const };
const order = (over: Partial<Order>): Order => ({
  id: 'o1', tokenNo: '1234', customerId: 'c1', deadline: '2026-06-01',
  items: [], photos: [], createdAt: 0, updatedAt: 0, ...over,
});

describe('orderTotal', () => {
  it('sums item prices, treating missing prices as 0', () => {
    const o = order({ items: [{ ...baseItem, price: 600 }, { ...baseItem, itemId: 'i2', price: 450 }, { ...baseItem, itemId: 'i3' }] });
    expect(orderTotal(o)).toBe(1050);
  });
  it('is 0 for no items', () => {
    expect(orderTotal(order({ items: [] }))).toBe(0);
  });
});

describe('orderBalance', () => {
  it('is total minus advance', () => {
    const o = order({ items: [{ ...baseItem, price: 1000 }], advancePaid: 300 });
    expect(orderBalance(o)).toBe(700);
  });
  it('treats missing advance as 0', () => {
    const o = order({ items: [{ ...baseItem, price: 1000 }] });
    expect(orderBalance(o)).toBe(1000);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm run test -- src/domain/money.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { Order } from '../types';

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
}

export function orderBalance(order: Order): number {
  return orderTotal(order) - (order.advancePaid ?? 0);
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm run test -- src/domain/money.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: order total and balance" && git push
```

### Task 1.2: Status rollup

**Files:**
- Create: `src/domain/status.ts`, `src/domain/status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { orderStatusRollup } from './status';
import type { OrderItem } from '../types';

const item = (status: OrderItem['status']): OrderItem => ({ itemId: 'x', garmentType: 'B', templateId: null, quantity: 1, measurements: [], status });

describe('orderStatusRollup', () => {
  it('is delivered only when all items delivered', () => {
    expect(orderStatusRollup([item('delivered'), item('delivered')])).toBe('delivered');
  });
  it('is ready when all ready (none pending, not all delivered)', () => {
    expect(orderStatusRollup([item('ready'), item('ready')])).toBe('ready');
  });
  it('is ready when mix of ready and delivered', () => {
    expect(orderStatusRollup([item('ready'), item('delivered')])).toBe('ready');
  });
  it('is pending when any item pending', () => {
    expect(orderStatusRollup([item('pending'), item('delivered')])).toBe('pending');
  });
  it('is pending for empty list', () => {
    expect(orderStatusRollup([])).toBe('pending');
  });
});
```

- [ ] **Step 2: Run, expect fail.** `npm run test -- src/domain/status.test.ts`

- [ ] **Step 3: Implement**

```ts
import type { OrderItem, OrderStatus } from '../types';

export function orderStatusRollup(items: OrderItem[]): OrderStatus {
  if (items.length === 0) return 'pending';
  if (items.some((i) => i.status === 'pending')) return 'pending';
  if (items.every((i) => i.status === 'delivered')) return 'delivered';
  return 'ready';
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: order status rollup" && git push`

### Task 1.3: Deadline buckets

**Files:**
- Create: `src/domain/deadline.ts`, `src/domain/deadline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { deadlineBucket, DUE_SOON_DAYS } from './deadline';

// today is fixed as 2026-06-01 for these tests
const today = '2026-06-01';

describe('deadlineBucket', () => {
  it('overdue when before today and not delivered', () => {
    expect(deadlineBucket('2026-05-30', today, 'pending')).toBe('overdue');
  });
  it('due-soon when within DUE_SOON_DAYS inclusive and not delivered', () => {
    expect(deadlineBucket('2026-06-01', today, 'pending')).toBe('due-soon');
    expect(deadlineBucket('2026-06-04', today, 'ready')).toBe('due-soon'); // +3 days
  });
  it('upcoming when beyond the window', () => {
    expect(deadlineBucket('2026-06-05', today, 'pending')).toBe('upcoming');
  });
  it('delivered orders are never overdue or due-soon (treated as upcoming/none)', () => {
    expect(deadlineBucket('2026-05-30', today, 'delivered')).toBe('upcoming');
  });
  it('DUE_SOON_DAYS is 3', () => {
    expect(DUE_SOON_DAYS).toBe(3);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```ts
import type { DeadlineBucket, OrderStatus } from '../types';

export const DUE_SOON_DAYS = 3;

// Parse a YYYY-MM-DD string to a UTC-midnight epoch day count to avoid timezone drift.
function toDayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function deadlineBucket(deadline: string, today: string, rollup: OrderStatus): DeadlineBucket {
  if (rollup === 'delivered') return 'upcoming';
  const diff = toDayNumber(deadline) - toDayNumber(today);
  if (diff < 0) return 'overdue';
  if (diff <= DUE_SOON_DAYS) return 'due-soon';
  return 'upcoming';
}

// Helper for callers: today's local date as YYYY-MM-DD.
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: deadline bucketing" && git push`

### Task 1.4: Token generation (best-effort unique)

**Files:**
- Create: `src/domain/token.ts`, `src/domain/token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateToken } from './token';

describe('generateToken', () => {
  it('returns a 4-digit string', () => {
    const t = generateToken(new Set(), () => 0.12345);
    expect(t).toMatch(/^\d{4}$/);
  });
  it('avoids tokens already in use, regenerating', () => {
    const values = [0.1, 0.1, 0.5]; // first two map to the same code
    let i = 0;
    const rng = () => values[i++];
    const taken = new Set([code(0.1)]);
    const t = generateToken(taken, rng);
    expect(taken.has(t)).toBe(false);
  });
});

// mirror of the production mapping, used only to set up the test
function code(r: number): string {
  return String(1000 + Math.floor(r * 9000));
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```ts
// Generates a best-effort-unique 4-digit token. rng is injectable for tests.
export function generateToken(takenActiveTokens: Set<string>, rng: () => number = Math.random): string {
  const make = () => String(1000 + Math.floor(rng() * 9000));
  let token = make();
  let attempts = 0;
  while (takenActiveTokens.has(token) && attempts < 50) {
    token = make();
    attempts++;
  }
  return token;
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: best-effort unique token generation" && git push`

### Task 1.5: Search and filter

**Files:**
- Create: `src/domain/search.ts`, `src/domain/search.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { matchesQuery } from './search';

describe('matchesQuery', () => {
  it('matches partial name case-insensitively', () => {
    expect(matchesQuery({ name: 'Meena', phone: '98765', token: '4821' }, 'een')).toBe(true);
  });
  it('matches phone fragment', () => {
    expect(matchesQuery({ name: 'Meena', phone: '9876543210', token: '4821' }, '654')).toBe(true);
  });
  it('matches token', () => {
    expect(matchesQuery({ name: 'Meena', phone: '', token: '4821' }, '4821')).toBe(true);
  });
  it('empty query matches everything', () => {
    expect(matchesQuery({ name: 'X', phone: '', token: '' }, '')).toBe(true);
  });
  it('no match returns false', () => {
    expect(matchesQuery({ name: 'Meena', phone: '12', token: '99' }, 'zzz')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```ts
export interface SearchableFields {
  name: string;
  phone: string;
  token: string;
}

export function matchesQuery(fields: SearchableFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return [fields.name, fields.phone, fields.token]
    .some((f) => (f ?? '').toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: client-side search matching" && git push`

### Task 1.6: Measurement rows from a template, and pre-fill from history

**Files:**
- Create: `src/domain/measurements.ts`, `src/domain/measurements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { rowsFromTemplate, prefillRows } from './measurements';
import type { Template, Order } from '../types';

const template: Template = {
  id: 't1', name: 'Blouse', isDefault: true, createdAt: 0,
  fields: [
    { id: 'f1', label: 'Shoulder', unit: 'in' },
    { id: 'f2', label: 'Waist', unit: 'in' },
  ],
};

describe('rowsFromTemplate', () => {
  it('creates one empty row per field, snapshotting label and unit', () => {
    const rows = rowsFromTemplate(template);
    expect(rows).toEqual([
      { fieldId: 'f1', label: 'Shoulder', value: '', unit: 'in' },
      { fieldId: 'f2', label: 'Waist', value: '', unit: 'in' },
    ]);
  });
});

describe('prefillRows', () => {
  it('returns rows from the customer\'s most recent matching item, by templateId', () => {
    const orders: Order[] = [
      { id: 'o1', tokenNo: '1', customerId: 'c1', deadline: '2026-01-01', photos: [], createdAt: 10, updatedAt: 10,
        items: [{ itemId: 'i1', garmentType: 'Blouse', templateId: 't1', quantity: 1, status: 'delivered',
          measurements: [{ fieldId: 'f1', label: 'Shoulder', value: '14', unit: 'in' }, { fieldId: 'f2', label: 'Waist', value: '30', unit: 'in' }] }] },
      { id: 'o2', tokenNo: '2', customerId: 'c1', deadline: '2026-03-01', photos: [], createdAt: 99, updatedAt: 99,
        items: [{ itemId: 'i2', garmentType: 'Blouse', templateId: 't1', quantity: 1, status: 'delivered',
          measurements: [{ fieldId: 'f1', label: 'Shoulder', value: '15', unit: 'in' }, { fieldId: 'f2', label: 'Waist', value: '31', unit: 'in' }] }] },
    ];
    const rows = prefillRows(orders, 't1', template);
    expect(rows?.find((r) => r.fieldId === 'f1')?.value).toBe('15'); // from the newer order (createdAt 99)
  });
  it('returns null when no matching history', () => {
    expect(prefillRows([], 't1', template)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```ts
import type { Template, Order, MeasurementRow } from '../types';

export function rowsFromTemplate(template: Template): MeasurementRow[] {
  return template.fields.map((f) => ({ fieldId: f.id, label: f.label, value: '', unit: f.unit }));
}

// Pre-fill from the customer's most recent order item using the same template.
// `orders` must already be filtered to a single customer.
export function prefillRows(orders: Order[], templateId: string, template: Template): MeasurementRow[] | null {
  const matches = orders
    .flatMap((o) => o.items.filter((i) => i.templateId === templateId).map((i) => ({ createdAt: o.createdAt, item: i })))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (matches.length === 0) return null;
  const prev = matches[0].item.measurements;
  // Re-key onto the current template fields so renamed/added fields still line up.
  return template.fields.map((f) => {
    const found = prev.find((r) => r.fieldId === f.id);
    return { fieldId: f.id, label: f.label, value: found?.value ?? '', unit: f.unit };
  });
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: template rows and history pre-fill" && git push`

### Task 1.7: Default templates constant

**Files:**
- Create: `src/domain/defaultTemplates.ts`, `src/domain/defaultTemplates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_TEMPLATES } from './defaultTemplates';

describe('DEFAULT_TEMPLATES', () => {
  it('has the six starter garments', () => {
    expect(DEFAULT_TEMPLATES.map((t) => t.name)).toEqual([
      'Blouse', 'Kameez / Kurti', 'Salwar / Churidar', 'Dress / Gown', 'Shirt', 'Pant / Trouser',
    ]);
  });
  it('every field has a non-empty label and unit', () => {
    for (const t of DEFAULT_TEMPLATES) {
      for (const f of t.fields) {
        expect(f.label.length).toBeGreaterThan(0);
        expect(f.unit.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** (field ids are assigned at seed time, see Task 5.1; here store label/unit/gender only)

```ts
import type { Gender } from '../types';

export interface DefaultTemplate {
  name: string;
  gender?: Gender;
  fields: { label: string; unit: string }[];
}

const inch = (labels: string[]) => labels.map((label) => ({ label, unit: 'in' }));

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  { name: 'Blouse', gender: 'female', fields: inch(['Shoulder', 'Bust/Chest (round)', 'Waist (round)', 'Blouse Length', 'Front Neck Depth', 'Back Neck Depth', 'Sleeve Length', 'Sleeve Round (bicep)', 'Armhole (round)', 'Dart Point']) },
  { name: 'Kameez / Kurti', gender: 'female', fields: inch(['Kameez Length', 'Shoulder', 'Chest (round)', 'Waist (round)', 'Hip (round)', 'Front Neck Depth', 'Back Neck Depth', 'Sleeve Length', 'Sleeve Round', 'Armhole (round)']) },
  { name: 'Salwar / Churidar', gender: 'female', fields: inch(['Salwar Length', 'Waist (round)', 'Hip (round)', 'Thigh (round)', 'Knee (round)', 'Bottom / Ankle (round)']) },
  { name: 'Dress / Gown', gender: 'female', fields: inch(['Full Length', 'Shoulder', 'Bust (round)', 'Waist (round)', 'Waist Position', 'Hip (round)', 'Front Neck Depth', 'Back Neck Depth', 'Sleeve Length', 'Sleeve Round', 'Armhole (round)']) },
  { name: 'Shirt', gender: 'male', fields: inch(['Shirt Length', 'Collar / Neck (round)', 'Shoulder', 'Chest (round)', 'Waist (round)', 'Sleeve Length', 'Cuff / Sleeve Round', 'Front Yoke']) },
  { name: 'Pant / Trouser', gender: 'male', fields: inch(['Outseam Length', 'Waist (round)', 'Seat / Hip (round)', 'Thigh (round)', 'Knee (round)', 'Bottom (round)', 'Inseam', 'Crotch / Rise']) },
];
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: default garment templates" && git push`

---

## Phase 2: Firebase layer and client store

### Task 2.1: Firebase initialization with offline persistence and config guard

**Files:**
- Create: `src/firebase/config.ts`

- [ ] **Step 1: Implement (no unit test; covered later by emulator tests)**

```ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_APP_ID'] as const;
for (const key of required) {
  if (!import.meta.env[key]) {
    throw new Error(`Missing Firebase config: ${key}. Copy .env.example to .env and fill it in (see AGENTS.md / spec section 4).`);
  }
}

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);
export const storage = getStorage(app);
```

- [ ] **Step 2: Commit.** `git add -A && git commit -m "feat: firebase init with offline persistence and config guard" && git push`

### Task 2.2: Firestore converters and timestamp handling

**Files:**
- Create: `src/firebase/converters.ts`

Document the rule: when reading snapshots, use `snapshot.data({ serverTimestamps: 'estimate' })` so `createdAt`/`updatedAt` are never null offline. Store timestamps via `serverTimestamp()` on write, and convert Firestore `Timestamp` to epoch ms (`.toMillis()`) on read.

- [ ] **Step 1: Implement**

```ts
import { Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';

const ESTIMATE: SnapshotOptions = { serverTimestamps: 'estimate' };

export function tsToMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
}

export function readData(snap: QueryDocumentSnapshot<DocumentData>): DocumentData & { id: string } {
  return { id: snap.id, ...snap.data(ESTIMATE) };
}
```

- [ ] **Step 2: Commit.** `git add -A && git commit -m "feat: snapshot reader with estimated timestamps" && git push`

### Task 2.3: The client store (Zustand) with live listeners

**Files:**
- Create: `src/store/useStore.ts`

Responsibilities: subscribe to `customers`, `templates`, and `orders` (active set: non-delivered OR updated within last 90 days, see note), expose them as arrays, expose `settings`, `online` status, and a `syncing` flag. UI components read from this store only.

Active-orders note: subscribe to all orders for v1 simplicity (scale assumption is low thousands). Add a `where('updatedAt', '>=', ninetyDaysAgo)` secondary listener only if performance demands; not required for v1.

- [ ] **Step 1: Implement**

```ts
import { create } from 'zustand';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { readData, tsToMillis } from '../firebase/converters';
import type { Customer, Order, Template, AppSettings } from '../types';

interface StoreState {
  customers: Customer[];
  orders: Order[];
  templates: Template[];
  settings: AppSettings | null;
  online: boolean;
  ready: boolean;
  init: () => () => void; // returns unsubscribe
}

function mapCustomer(d: any): Customer { return { ...d, createdAt: tsToMillis(d.createdAt), updatedAt: tsToMillis(d.updatedAt) }; }
function mapOrder(d: any): Order { return { ...d, createdAt: tsToMillis(d.createdAt), updatedAt: tsToMillis(d.updatedAt), photos: d.photos ?? [], items: d.items ?? [] }; }
function mapTemplate(d: any): Template { return { ...d, createdAt: tsToMillis(d.createdAt), fields: d.fields ?? [] }; }

export const useStore = create<StoreState>((set) => ({
  customers: [], orders: [], templates: [], settings: null, online: navigator.onLine, ready: false,
  init: () => {
    const unsubs = [
      onSnapshot(collection(db, 'customers'), (snap) => set({ customers: snap.docs.map((s) => mapCustomer(readData(s))) })),
      onSnapshot(collection(db, 'orders'), (snap) => set({ orders: snap.docs.map((s) => mapOrder(readData(s))), ready: true })),
      onSnapshot(collection(db, 'templates'), (snap) => set({ templates: snap.docs.map((s) => mapTemplate(readData(s))) })),
    ];
    const on = () => set({ online: true });
    const off = () => set({ online: false });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { unsubs.forEach((u) => u()); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  },
}));
```

- [ ] **Step 2: Commit.** `git add -A && git commit -m "feat: zustand store with live firestore listeners" && git push`

### Task 2.4: Repository functions (writes)

**Files:**
- Create: `src/firebase/repo.ts`

Expose typed write helpers so UI never touches Firestore directly: `createCustomer`, `updateCustomer`, `deleteCustomer` (guards against existing orders), `createOrder`, `updateOrder`, `deleteOrder`, `upsertTemplate`, `deleteTemplate`, `setLanguage`. All set `updatedAt: serverTimestamp()`; creates also set `createdAt: serverTimestamp()`.

- [ ] **Step 1: Implement (representative subset; mirror the pattern for the rest)**

```ts
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './config';
import type { Customer, Order, Template } from '../types';

export async function createCustomer(data: Omit<Customer, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'customers'), { ...data, nameLower: data.name.toLowerCase(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function deleteCustomer(customerId: string) {
  const orders = await getDocs(query(collection(db, 'orders'), where('customerId', '==', customerId)));
  if (!orders.empty) throw new Error('This customer has orders. Delete or reassign those first.');
  await deleteDoc(doc(db, 'customers', customerId));
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'orders'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  return updateDoc(doc(db, 'orders', id), { ...patch, updatedAt: serverTimestamp() });
}

export async function upsertTemplate(t: Template) {
  return setDoc(doc(db, 'templates', t.id), t, { merge: true });
}
```

- [ ] **Step 2: Commit.** `git add -A && git commit -m "feat: firestore write repository" && git push`

---

## Phase 3: i18n

### Task 3.1: Translation maps and hook

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/gu.ts`, `src/i18n/useT.ts`, `src/i18n/useT.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { translate } from './useT';

describe('translate', () => {
  it('returns the string for the active language', () => {
    expect(translate('en', 'dashboard.overdue')).toBe('Overdue');
  });
  it('falls back to english when a gujarati key is missing', () => {
    expect(translate('gu', '__missing__')).toBe(translate('en', '__missing__'));
  });
  it('returns the key itself if missing in both', () => {
    expect(translate('en', 'totally.unknown.key')).toBe('totally.unknown.key');
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

`src/i18n/en.ts` (extend with every UI string as you build screens):
```ts
export const en: Record<string, string> = {
  'dashboard.overdue': 'Overdue',
  'dashboard.dueSoon': 'Due soon',
  'dashboard.ready': 'Ready for pickup',
  'dashboard.balanceDue': 'Balance due',
  'dashboard.recent': 'Recent',
  'nav.home': 'Home',
  'nav.customers': 'Customers',
  'nav.orders': 'Orders',
  'nav.settings': 'Settings',
  'common.newOrder': 'New order',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
};
```

`src/i18n/gu.ts` (Gujarati strings; fill all keys):
```ts
export const gu: Record<string, string> = {
  'dashboard.overdue': 'મુદત વીતી',
  'dashboard.dueSoon': 'જલ્દી આવનાર',
  'dashboard.ready': 'લેવા તૈયાર',
  'dashboard.balanceDue': 'બાકી રકમ',
  'dashboard.recent': 'તાજેતરના',
  'nav.home': 'હોમ',
  'nav.customers': 'ગ્રાહકો',
  'nav.orders': 'ઓર્ડર',
  'nav.settings': 'સેટિંગ',
  'common.newOrder': 'નવો ઓર્ડર',
  'common.save': 'સાચવો',
  'common.cancel': 'રદ કરો',
};
```

`src/i18n/useT.ts`:
```ts
import { en } from './en';
import { gu } from './gu';
import { useStore } from '../store/useStore';
import type { Language } from '../types';

const maps: Record<Language, Record<string, string>> = { en, gu };

export function translate(lang: Language, key: string): string {
  return maps[lang][key] ?? maps.en[key] ?? key;
}

export function useT() {
  const lang = useStore((s) => s.settings?.language ?? 'en');
  return (key: string) => translate(lang, key);
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Add Noto Sans Gujarati**

Add to `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
```
And set the body font stack to include both in `src/index.css`.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: i18n maps, hook, gujarati font" && git push`

---

## Phase 4: Auth and app shell

### Task 4.1: Auth gate and login screen

**Files:**
- Create: `src/auth/AuthGate.tsx`, `src/screens/Login.tsx`
- Modify: `src/App.tsx`

Behavior: `AuthGate` subscribes to `onAuthStateChanged`. While unknown, show a splash. If no user, render `Login`. If user, render children and call `useStore.getState().init()` once. Login is email + password (`signInWithEmailAndPassword`), shows errors inline. Logout (`signOut`) lives in Settings.

- [ ] **Step 1: Implement AuthGate**

```tsx
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useStore } from '../store/useStore';
import { Login } from '../screens/Login';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { if (user) return useStore.getState().init(); }, [user]);
  if (user === undefined) return <div className="splash">…</div>;
  if (!user) return <Login />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Implement Login** (email/password form, calls `signInWithEmailAndPassword(auth, email, password)`, catches and shows error text).

- [ ] **Step 3: Wire `App.tsx`** to wrap routes in `<AuthGate>`.

- [ ] **Step 4: Manual check** Run `npm run dev`, confirm the login screen renders. (Real sign-in needs the emulator or a real user; covered in Phase 11.)

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: auth gate and login screen" && git push`

### Task 4.2: Navigation shell (bottom tabs + routing)

**Files:**
- Create: `src/components/TabBar.tsx`, `src/components/ConnectionBadge.tsx`
- Modify: `src/App.tsx`

Routes: `/` Dashboard, `/customers`, `/orders`, `/settings`, `/customers/:id`, `/orders/new`, `/orders/:id`. Bottom tab bar with the four primary tabs (labels via `useT`). `ConnectionBadge` reads `online` from the store and shows offline/syncing.

- [ ] **Step 1: Implement TabBar + routing, Step 2: ConnectionBadge, Step 3: manual check, Step 4: commit.**

```bash
git add -A && git commit -m "feat: bottom tab navigation and connection badge" && git push
```

---

## Phase 5: Templates

### Task 5.1: First-run seeding (transaction-guarded)

**Files:**
- Create: `src/firebase/seed.ts`

Behavior: read `settings/app`. If it does not exist or `seeded !== true`, run a transaction that re-checks `seeded`, writes each default template (generate stable `id` per template and per field via `crypto.randomUUID()`), and sets `settings/app` `{ language: 'en', seeded: true }`. The transaction re-check prevents two devices double-seeding.

- [ ] **Step 1: Implement**

```ts
import { doc, runTransaction, collection } from 'firebase/firestore';
import { db } from './config';
import { DEFAULT_TEMPLATES } from '../domain/defaultTemplates';

export async function ensureSeeded() {
  const settingsRef = doc(db, 'settings', 'app');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    if (snap.exists() && snap.data().seeded === true) return;
    for (const t of DEFAULT_TEMPLATES) {
      const id = crypto.randomUUID();
      tx.set(doc(collection(db, 'templates'), id), {
        id, name: t.name, gender: t.gender ?? null, isDefault: true,
        fields: t.fields.map((f) => ({ id: crypto.randomUUID(), label: f.label, unit: f.unit })),
        createdAt: new Date(),
      });
    }
    tx.set(settingsRef, { language: 'en', seeded: true });
  });
}
```

Call `ensureSeeded()` once after auth in `AuthGate` (after `init`).

- [ ] **Step 2: Commit.** `git add -A && git commit -m "feat: transaction-guarded first-run seeding" && git push`

### Task 5.2: Template management screen

**Files:**
- Create: `src/screens/Templates.tsx` (reached from Settings)

Behavior: list templates from the store; add a template (name + gender); edit a template's fields (add row, rename label, change unit, reorder, delete row); delete a template. Writes via `repo.upsertTemplate` / `repo.deleteTemplate`. New fields get `crypto.randomUUID()` ids; existing field ids never change on rename.

- [ ] **Step 1: Implement, Step 2: manual check, Step 3: commit.**

```bash
git add -A && git commit -m "feat: template management screen" && git push
```

---

## Phase 6: Customers

### Task 6.1: Customer list with search

**Files:**
- Create: `src/screens/Customers.tsx`, `src/components/SearchBar.tsx`

Behavior: read customers from store, sort by `nameLower`, filter with `matchesQuery` (build `SearchableFields` with name, phone, and the customer's order tokens joined). Debounce input ~200ms. Tap navigates to `/customers/:id`. A "+ Add customer" action opens a form (name required, phone, gender, notes) calling `repo.createCustomer`.

- [ ] **Step 1: Implement, Step 2: manual check, Step 3: commit.**

```bash
git add -A && git commit -m "feat: customer list, search, and add" && git push
```

### Task 6.2: Customer detail with order history

**Files:**
- Create: `src/screens/CustomerDetail.tsx`

Behavior: show name/phone/gender/notes (editable), a "+ New order" button that routes to `/orders/new?customerId=:id`, and the list of this customer's orders (token, garments summary, deadline, `orderStatusRollup`, total/balance). Delete-customer button calls `repo.deleteCustomer` and surfaces the "has orders" error.

- [ ] **Step 1: Implement, Step 2: manual check, Step 3: commit.**

```bash
git add -A && git commit -m "feat: customer detail and order history" && git push
```

---

## Phase 7: Orders (multi-garment)

### Task 7.1: Order editor, structure and items

**Files:**
- Create: `src/screens/OrderEditor.tsx`, `src/components/GarmentItemEditor.tsx`

Behavior (covers `/orders/new` and `/orders/:id`):
- Order-level: customer (preselected via query param or picker), deadline (native `<input type="date">`), advance (numeric), notes, and the live total/balance from `orderTotal`/`orderBalance`.
- Items: a list of `GarmentItemEditor`s. Add item: pick a template (filtered to suggest the customer's gender first), which calls `rowsFromTemplate`; if the customer has matching history, `prefillRows` populates values and the UI flags "pre-filled from last order". Each item has quantity, per-garment price, per-item status, the measurement rows (editable label/value for custom rows, value-only for template rows), and "add custom row" / "remove item".
- Save: on create, compute `tokenNo` via `generateToken` using the set of tokens from currently non-delivered orders in the store, then `repo.createOrder`; on edit, `repo.updateOrder`. Validation: deadline required, at least one item with a garment.

- [ ] **Step 1: Implement GarmentItemEditor, Step 2: implement OrderEditor, Step 3: manual check the full create flow, Step 4: commit.**

```bash
git add -A && git commit -m "feat: multi-garment order editor with prefill and tokens" && git push
```

### Task 7.2: Order detail / status controls

**Files:**
- Create: `src/screens/OrderDetail.tsx`

Behavior: read-only-ish view of an order with prominent token, per-item status steppers (pending -> ready -> delivered) writing via `repo.updateOrder`, total/balance, photos, edit button to `/orders/:id`, and delete-order (with photo cleanup, Phase 8).

- [ ] **Step 1: Implement, Step 2: manual check, Step 3: commit.**

```bash
git add -A && git commit -m "feat: order detail and per-item status controls" && git push
```

---

## Phase 8: Photos (offline queue)

### Task 8.1: IndexedDB photo queue

**Files:**
- Create: `src/photos/queue.ts`, `src/photos/queue.test.ts`

Behavior: store compressed blobs keyed by `localId`; list pending; delete by `localId`. Use `idb`. Test with `fake-indexeddb` (add dev dep `npm i -D fake-indexeddb` and import `fake-indexeddb/auto` in the test).

- [ ] **Step 1: Write failing test (put a blob, read it back, delete it), Step 2: run/fail, Step 3: implement with idb, Step 4: run/pass, Step 5: commit.**

```bash
git add -A && git commit -m "feat: indexeddb photo queue" && git push
```

### Task 8.2: Capture, compress, reference, upload, cleanup

**Files:**
- Create: `src/photos/usePhotos.ts`
- Modify: `src/screens/OrderEditor.tsx`, `src/screens/OrderDetail.tsx`

Behavior:
- On capture: compress with `browser-image-compression` (`maxWidthOrHeight: 1280`, `initialQuality: 0.7`, target ~150KB), store blob under a new `localId`, push `local:<localId>` into the order's `photos`, render from the blob (object URL).
- Uploader: when `online` becomes true, for each `local:<id>` in any order, upload the blob to `orders/{orderId}/{photoId}.jpg` via Storage `uploadBytes`, then `repo.updateOrder` swapping the reference to the storage path and remove the blob from the queue. Retry on failure; never drop.
- Cleanup: deleting a photo or order removes local blobs and calls Storage `deleteObject` for uploaded paths (queue the delete if offline).

- [ ] **Step 1: Implement usePhotos, Step 2: wire into editor/detail, Step 3: manual check offline-then-online via DevTools, Step 4: commit.**

```bash
git add -A && git commit -m "feat: photo capture, offline queue, upload and cleanup" && git push
```

---

## Phase 9: Dashboard, orders list, balance due

### Task 9.1: Dashboard selectors

**Files:**
- Create: `src/domain/dashboard.ts`, `src/domain/dashboard.test.ts`

Pure selectors over `Order[]`: `bucketOrders(orders, today)` returning `{ overdue, dueSoon, ready, balanceDue, recent }`, using `orderStatusRollup`, `deadlineBucket`, `orderBalance`, and recency by `createdAt`. `recent` is the latest N (e.g. 10).

- [ ] **Step 1: Write failing test (mix of orders across buckets), Step 2: run/fail, Step 3: implement, Step 4: run/pass, Step 5: commit.**

```bash
git add -A && git commit -m "feat: dashboard bucket selectors" && git push
```

### Task 9.2: Dashboard, Orders list screens

**Files:**
- Create: `src/screens/Dashboard.tsx`, `src/screens/Orders.tsx`

Dashboard renders the five sections from `bucketOrders` (overdue in red), each item a card (token, customer name via store lookup, garment summary, deadline). Orders screen lists all orders with status-filter tabs (by rollup), hides delivered by default, paginates (e.g. 30 at a time), sortable by deadline.

- [ ] **Step 1: Implement both, Step 2: manual check, Step 3: commit.**

```bash
git add -A && git commit -m "feat: dashboard and orders list screens" && git push
```

---

## Phase 10: PWA polish

### Task 10.1: Manifest, icons, offline shell, install

**Files:**
- Create: `public/pwa-192.png`, `public/pwa-512.png` (simple placeholder icons)
- Verify: `vite-plugin-pwa` config from Task 0.1

- [ ] **Step 1: Add icons, Step 2: `npm run build && npm run preview`, Step 3: in the browser confirm installable and that a hard reload offline still loads the shell, Step 4: commit.**

```bash
git add -A && git commit -m "feat: pwa manifest, icons, offline shell" && git push
```

---

## Phase 11: Security rules and emulator integration tests

### Task 11.1: Security rules

**Files:**
- Create: `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 2: Write `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /orders/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 3: Configure `firebase.json`** with firestore rules, storage rules, and emulator ports (firestore 8080, auth 9099, storage 9199).

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat: firestore and storage security rules + emulator config" && git push`

### Task 11.2: Emulator integration tests

**Files:**
- Create: `tests/integration/orders.emulator.test.ts` (and similar for customers, templates, rules)

Use `@firebase/rules-unit-testing` (`npm i -D @firebase/rules-unit-testing`). Cover: authed create/read/edit/delete; unauthenticated access denied; status transitions and rollup; template edit not corrupting saved order rows; seeding transaction runs once; offline write then `enableNetwork` sync; simulated last-write-wins.

- [ ] **Step 1: Write the tests, Step 2: run against `npm run emulators`, Step 3: make them pass, Step 4: commit.**

```bash
git add -A && git commit -m "test: emulator integration and security-rule tests" && git push
```

---

## Phase 12: End-to-end (Playwright)

### Task 12.1: Full scenario E2E

**Files:**
- Create: `tests/e2e/scenario.spec.ts`, `playwright.config.ts`

Configure Playwright to run the app (`npm run preview`) against the emulator. Scenario: log in; create a new customer; start a new order with two garments sharing one deadline; set an advance; save; assert a 4-digit token and the combined total appear; search by name and by token; confirm the order shows in the Due-soon (or correct) dashboard bucket; move one item to ready then all to delivered and confirm the rollup and dashboard update; open the balance-due view and confirm an unpaid order is listed; toggle language EN to GU and confirm a label changes.

- [ ] **Step 1: Write the spec, Step 2: `npm run e2e` against the emulator, Step 3: make it pass, Step 4: commit.**

```bash
git add -A && git commit -m "test: end-to-end driving scenario" && git push
```

---

## Phase 13: Docs and deploy notes

### Task 13.1: README and deploy

**Files:**
- Modify: `README.md`

Document: prerequisites (Section 4 of the spec), how to set `.env`, `npm run dev`, running emulators, running tests, building, and deploying (Firebase Hosting: `firebase init hosting`, `firebase deploy`). Note the manual Firebase console steps and that push notifications are a deferred phase.

- [ ] **Step 1: Write README, Step 2: commit.**

```bash
git add -A && git commit -m "docs: readme with setup, test, and deploy instructions" && git push
```

---

## Self-review checklist (for the building agent, before declaring done)

- [ ] Every spec section maps to a task: customers/orders/templates/settings model, multi-garment items, token, deadline buckets, measurement rows, search, offline persistence, photo queue, security rules, i18n, dashboard buckets including balance-due, pre-fill, PWA, tests at all four levels.
- [ ] No measurement value is coerced to a number anywhere.
- [ ] `customerName` is never stored on orders; names are derived from the store.
- [ ] Timestamps read with estimated server timestamps; no null-timestamp ordering bug.
- [ ] Token generation checks against non-delivered orders only.
- [ ] Seeding cannot run twice (transaction guard).
- [ ] All UI strings go through `useT`; both `en` and `gu` maps cover every key used.
- [ ] All four test layers pass: `npm run test`, emulator integration, `npm run e2e`, and a clean `npm run build`.
