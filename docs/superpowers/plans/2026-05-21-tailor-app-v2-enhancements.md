# Tailor App v2, Ease-of-Use Enhancements, Implementation Plan

**For the building agent (Antigravity):** This plan enhances the EXISTING app in this repo. Read `AGENTS.md` and `docs/superpowers/specs/2026-05-21-tailor-measurement-app-design.md` first. Build task by task, follow test-driven development for the pure-logic tasks (full code is given), and commit + push after each task with a Conventional Commit message. Honor the existing footguns in AGENTS.md (measurement values stay strings, all UI text via `useT` with both `en` and `gu` keys, derive customer name from the store, etc.).

**Goal:** Make the daily flows faster and the app easier for non-technical shop staff: inline customer search/add when starting an order, faster measurement entry, one-tap whole-order status plus call/WhatsApp, a bundle of small friction removers, and a light theme with a larger-text option.

**Why these:** grounded in walking the real screens. The customer dropdown in `OrderEditor.tsx` has no search and forces a tab-bounce to add a walk-in; measurement values use a small text box that pops the full keyboard; marking an order done takes one toggle per garment; phone numbers are not tappable; the dashboard title is hardcoded.

**Conventions:** match existing code style (2-space indent, single quotes, inline `styles` objects, TypeScript strict). Run a single test with `npm run test -- src/domain/<file>.test.ts`. Definition of done: `npm run test`, emulator integration tests, `npm run e2e`, and `npm run build` all pass.

---

## Phase 1: Pure logic helpers (TDD, full code)

### Task 1.1: Whole-order status advance

**Files:**
- Modify: `src/domain/status.ts`
- Create test: `src/domain/status.test.ts` (extend existing)

- [ ] **Step 1: Add failing tests** to `src/domain/status.test.ts`

```ts
import { nextBulkStatus, setAllItemsStatus } from './status';

describe('nextBulkStatus', () => {
  it('pending advances to ready', () => { expect(nextBulkStatus('pending')).toBe('ready'); });
  it('ready advances to delivered', () => { expect(nextBulkStatus('ready')).toBe('delivered'); });
  it('delivered has no next', () => { expect(nextBulkStatus('delivered')).toBeNull(); });
});

describe('setAllItemsStatus', () => {
  it('sets every item to the given status', () => {
    const items = [
      { itemId: 'a', garmentType: 'X', templateId: null, quantity: 1, measurements: [], status: 'pending' as const },
      { itemId: 'b', garmentType: 'Y', templateId: null, quantity: 1, measurements: [], status: 'ready' as const },
    ];
    const out = setAllItemsStatus(items, 'delivered');
    expect(out.every((i) => i.status === 'delivered')).toBe(true);
    expect(out).not.toBe(items); // returns a new array
  });
});
```

- [ ] **Step 2: Run, expect fail.** `npm run test -- src/domain/status.test.ts`

- [ ] **Step 3: Implement** in `src/domain/status.ts` (append, keep existing `orderStatusRollup`)

```ts
import type { OrderItem, OrderStatus } from '../types';

export function nextBulkStatus(rollup: OrderStatus): OrderStatus | null {
  if (rollup === 'pending') return 'ready';
  if (rollup === 'ready') return 'delivered';
  return null;
}

export function setAllItemsStatus(items: OrderItem[], status: OrderStatus): OrderItem[] {
  return items.map((i) => ({ ...i, status }));
}
```

- [ ] **Step 4: Run, expect pass. Step 5: Commit.** `git add -A && git commit -m "feat: whole-order status advance helpers" && git push`

### Task 1.2: Contact links (tel + WhatsApp, India numbers)

**Files:**
- Create: `src/domain/contact.ts`, `src/domain/contact.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizePhoneIN, buildTelHref, buildWhatsAppHref } from './contact';

describe('normalizePhoneIN', () => {
  it('adds 91 to a 10-digit number', () => { expect(normalizePhoneIN('9876543210')).toBe('919876543210'); });
  it('strips spaces, dashes, plus', () => { expect(normalizePhoneIN('+91 98765-43210')).toBe('919876543210'); });
  it('keeps an already-prefixed number', () => { expect(normalizePhoneIN('919876543210')).toBe('919876543210'); });
  it('returns empty for empty', () => { expect(normalizePhoneIN('')).toBe(''); });
});

describe('hrefs', () => {
  it('builds a tel href', () => { expect(buildTelHref('9876543210')).toBe('tel:+919876543210'); });
  it('builds a wa.me href with encoded message', () => {
    expect(buildWhatsAppHref('9876543210', 'Order ready')).toBe('https://wa.me/919876543210?text=Order%20ready');
  });
  it('returns empty when no phone', () => { expect(buildWhatsAppHref('', 'x')).toBe(''); });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** `src/domain/contact.ts`

```ts
export function normalizePhoneIN(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits === '') return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildTelHref(phone: string): string {
  const n = normalizePhoneIN(phone);
  return n ? `tel:+${n}` : '';
}

export function buildWhatsAppHref(phone: string, message: string): string {
  const n = normalizePhoneIN(phone);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4: Run, expect pass. Step 5: Commit.** `git add -A && git commit -m "feat: tel and whatsapp link helpers" && git push`

### Task 1.3: Date arithmetic for deadline chips

**Files:**
- Modify: `src/domain/deadline.ts`, `src/domain/deadline.test.ts`

- [ ] **Step 1: Failing test** (append)

```ts
import { addDays } from './deadline';

describe('addDays', () => {
  it('adds days across month boundaries', () => { expect(addDays('2026-06-28', 7)).toBe('2026-07-05'); });
  it('adds zero', () => { expect(addDays('2026-06-01', 0)).toBe('2026-06-01'); });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** (append to `src/domain/deadline.ts`)

```ts
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
```

- [ ] **Step 4: Run, expect pass. Step 5: Commit.** `git add -A && git commit -m "feat: addDays helper for deadline chips" && git push`

---

## Phase 2: Inline customer search and add in the new order flow

### Task 2.1: CustomerPicker component

**Files:**
- Create: `src/components/CustomerPicker.tsx`
- Reuse: `matchesQuery` (`src/domain/search.ts`), `createCustomer` (`src/firebase/repo.ts`)

Behavior: a text input that filters the cached `customers` from the store with `matchesQuery` (match name and phone). Show up to ~8 matches as a tappable list. When the typed text matches no customer exactly, show a row "＋ Add \"<typed>\"" that creates the customer inline (name = typed text, optional phone field shown in a tiny inline form, default gender from a prop or 'female'), then calls `onSelect(newCustomerId)`. Props: `value: string` (selected customerId), `onSelect: (id: string) => void`, `disabled?: boolean` (locked when editing an existing order). When a customer is selected, show their name with a "change" affordance.

- [ ] **Step 1: Implement the component** following the existing inline-style pattern (see `Customers.tsx` for the modal/list styling to match). Use a controlled query state, debounce not required (in-memory). New-customer inline create uses:

```tsx
const ref = await createCustomer({ name: typed.trim(), phone: phone.trim() || undefined, gender });
onSelect(ref.id);
```

- [ ] **Step 2: Component test** `src/components/CustomerPicker.test.tsx` (Testing Library): renders matches for a query, and clicking a match calls `onSelect`. Mock the store with two customers.

- [ ] **Step 3: Run tests. Step 4: Commit.** `git add -A && git commit -m "feat: searchable customer picker with inline add" && git push`

### Task 2.2: Use CustomerPicker in OrderEditor

**Files:**
- Modify: `src/screens/OrderEditor.tsx` (replace the `<select>` customer block, currently around lines 208-233)

- [ ] **Step 1:** Replace the customer `<select>` with `<CustomerPicker value={customerId} onSelect={setCustomerId} disabled={!!existingOrder} />`. Keep the existing "locked" display when editing. Remove the now-unused `sortedCustomers` if nothing else uses it.

- [ ] **Step 2: Manual check** the new-order flow: type a partial name, pick a match; type a brand-new name, add inline, confirm it selects.

- [ ] **Step 3: Commit.** `git add -A && git commit -m "feat: inline customer search/add in order editor" && git push`

---

## Phase 3: Faster measurement entry

### Task 3.1: Numeric keypad, bigger inputs, Enter-to-next

**Files:**
- Modify: `src/components/GarmentItemEditor.tsx` (value inputs around lines 220-226)

- [ ] **Step 1:** On each measurement value input, add `inputMode="decimal"` (keep `type="text"` so "½" and "loose" still work) and widen `styles.valueInput` (e.g. min-height 44px, larger font). On the label input for custom rows keep text.

- [ ] **Step 2: Enter advances focus.** Give each value input a ref in an array; on `onKeyDown` with `e.key === 'Enter'`, `e.preventDefault()` and focus the next value input (or blur on the last). This lets staff type a number, press Enter, keep going.

- [ ] **Step 3:** Add a small "½" button beside the value input that appends "½" to the current value (a one-line handler), since half-inches are the most common fraction.

- [ ] **Step 4: Manual check** on a narrow viewport. Step 5: Commit. `git add -A && git commit -m "feat: faster measurement entry, numeric keypad and enter-to-next" && git push`

### Task 3.2: Optional full-screen Measure Mode

**Files:**
- Create: `src/components/MeasureMode.tsx`
- Modify: `src/components/GarmentItemEditor.tsx` (add a "Measure mode" button that opens it when a template is selected)

Behavior: a full-screen overlay that steps through the current item's measurement rows one at a time: big field label, a large value input (`inputMode="decimal"`), a numeric-friendly layout, and Back / Next buttons (Next on the last row closes and saves). Writes back into the item's `measurements` via the same `onChange`. This is for calling out numbers with a customer present.

- [ ] **Step 1: Implement** MeasureMode with props `{ rows, onChange, onClose }`. Step 2: wire the open button. Step 3: manual check. Step 4: Commit. `git add -A && git commit -m "feat: full-screen measure mode" && git push`

---

## Phase 4: One-tap order status and contact actions

### Task 4.1: Whole-order advance button

**Files:**
- Modify: `src/screens/OrderDetail.tsx` (add a primary action button), and the dashboard/orders cards if you want it inline (optional)

Behavior: read the order's rollup with `orderStatusRollup(order.items)`. Compute `nextBulkStatus(rollup)`. If non-null, show a big primary button labelled "Mark ready" or "Mark delivered" (via `useT`, add keys `orders.markReady`, `orders.markDelivered`). On tap, `updateOrder(order.id, { items: setAllItemsStatus(order.items, next) })`. Keep the existing per-garment controls for partial cases.

- [ ] **Step 1: Implement** the button on OrderDetail. Step 2: manual check (pending order shows "Mark ready", tapping flips all items and the rollup). Step 3: Commit. `git add -A && git commit -m "feat: one-tap whole-order status advance" && git push`

### Task 4.2: Tap-to-call and WhatsApp

**Files:**
- Modify: `src/screens/CustomerDetail.tsx`, `src/screens/OrderDetail.tsx`, and the customer card phone row in `src/screens/Customers.tsx` (lines ~175-191)

Behavior: wherever a phone is shown, render a call action using `buildTelHref(phone)` as an `<a href>`, and a WhatsApp action using `buildWhatsAppHref(phone, msg)` where `msg` is a localized "your order is ready for pickup" string (add `contact.readyMessage` to `en`/`gu`). Only render when a phone exists. On a customer card, make tapping the phone icon call without navigating into the customer (stop propagation).

- [ ] **Step 1: Implement** the two link buttons on OrderDetail and CustomerDetail, and a tap-to-call on the customer card phone. Step 2: manual check on a phone (tel opens dialer, wa.me opens WhatsApp). Step 3: Commit. `git add -A && git commit -m "feat: tap-to-call and whatsapp ready message" && git push`

---

## Phase 5: Quick-wins bundle

### Task 5.1: Auto-add first garment + deadline chips + mark fully paid

**Files:**
- Modify: `src/screens/OrderEditor.tsx`

- [ ] **Step 1: Auto-add first garment.** In the new-order init effect (no `existingOrder`), if `items.length === 0`, seed one blank item (reuse `handleAddItem`'s item shape). So the editor opens ready to fill.

- [ ] **Step 2: Deadline chips.** Next to the date input (around line 238), add buttons "+7", "+10", "+15" days that set `deadline` to `addDays(todayStr(), n)`. Add `todayStr` import from `../domain/deadline`.

- [ ] **Step 3: Mark fully paid.** Near the advance input, add a small button "Fully paid" that sets `advancePaid` to `orderTotal(mockOrder)`. 

- [ ] **Step 4: Manual check. Step 5: Commit.** `git add -A && git commit -m "feat: auto-add garment, deadline chips, mark fully paid" && git push`

### Task 5.2: Home global search

**Files:**
- Create: `src/components/GlobalSearch.tsx`
- Modify: `src/screens/Dashboard.tsx` (add it near the top, under the welcome banner)

Behavior: a search box that, as you type, matches ORDERS by token and by their customer's name/phone, and customers by name/phone, using `matchesQuery`. Show a short result list: order results link to `/orders/:id`, customer results link to `/customers/:id`. This is the "someone's at the counter" fast path. Empty query shows nothing.

- [ ] **Step 1: Implement** GlobalSearch reading `orders` and `customers` from the store; for each order build search fields `{ name: customerName, phone: customerPhone, token: order.tokenNo }`. Step 2: wire into Dashboard. Step 3: manual check. Step 4: Commit. `git add -A && git commit -m "feat: home global search by name, phone, token" && git push`

### Task 5.3: Wire up the shop name

**Files:**
- Modify: `src/firebase/repo.ts` (add a settings setter), `src/screens/Settings.tsx` (add a shop-name input), `src/screens/Dashboard.tsx` (use it)

- [ ] **Step 1:** In `repo.ts`, add:

```ts
import type { Language, AppSettings } from '../types';
export async function updateSettings(patch: Partial<AppSettings>) {
  return setDoc(doc(db, 'settings', 'app'), patch, { merge: true });
}
```
(Keep `setLanguage` or reimplement it to call `updateSettings({ language })`.)

- [ ] **Step 2:** In `Settings.tsx`, add a "Shop name" text input bound to `settings?.shopName`, saving with `updateSettings({ shopName })` on blur.

- [ ] **Step 3:** In `Dashboard.tsx` line ~128, replace the hardcoded `Pareshbhai Tailor` with `settings?.shopName || 'Tailor'` (read `settings` from the store).

- [ ] **Step 4: Manual check. Step 5: Commit.** `git add -A && git commit -m "feat: configurable shop name" && git push`

---

## Phase 6: Light theme and larger-text option (largest task, do last)

This is the most invasive change because every screen uses inline `styles` objects with hardcoded colors and px sizes. The approach: drive colors and a font-scale from CSS custom properties on the root element, set from settings, and migrate the inline literals to reference those variables.

### Task 6.1: Extend settings type and store

**Files:**
- Modify: `src/types.ts` (extend `AppSettings`)

- [ ] **Step 1:** Add to `AppSettings`: `theme?: 'dark' | 'light'` and `textScale?: 'normal' | 'large'`. (The store already subscribes to `settings/app`, so no store change is needed.)

- [ ] **Step 2: Commit.** `git add -A && git commit -m "feat: add theme and textScale to settings type" && git push`

### Task 6.2: Theme tokens and applier

**Files:**
- Create: `src/theme/tokens.ts`, `src/theme/tokens.test.ts`, `src/theme/applyTheme.ts`

- [ ] **Step 1: Failing test** for tokens

```ts
import { describe, it, expect } from 'vitest';
import { THEME_TOKENS, fontScaleFor } from './tokens';

describe('theme tokens', () => {
  it('has light and dark with the same keys', () => {
    expect(Object.keys(THEME_TOKENS.light).sort()).toEqual(Object.keys(THEME_TOKENS.dark).sort());
  });
  it('light bg differs from dark bg', () => {
    expect(THEME_TOKENS.light['--bg']).not.toBe(THEME_TOKENS.dark['--bg']);
  });
  it('large scale is bigger than normal', () => {
    expect(fontScaleFor('large')).toBeGreaterThan(fontScaleFor('normal'));
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** `src/theme/tokens.ts` (define a token set covering the colors used across screens: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--accent`, `--danger`, `--warning`, `--success`)

```ts
export type ThemeName = 'dark' | 'light';
export type TextScale = 'normal' | 'large';

export const THEME_TOKENS: Record<ThemeName, Record<string, string>> = {
  dark: {
    '--bg': '#111827', '--surface': 'rgba(255,255,255,0.05)', '--surface-2': 'rgba(255,255,255,0.02)',
    '--text': '#ffffff', '--text-muted': '#9ca3af', '--border': 'rgba(255,255,255,0.1)',
    '--accent': '#3b82f6', '--danger': '#ef4444', '--warning': '#f59e0b', '--success': '#10b981',
  },
  light: {
    '--bg': '#f5f6f8', '--surface': '#ffffff', '--surface-2': '#f0f1f4',
    '--text': '#111827', '--text-muted': '#4b5563', '--border': 'rgba(0,0,0,0.12)',
    '--accent': '#2563eb', '--danger': '#dc2626', '--warning': '#b45309', '--success': '#047857',
  },
};

export function fontScaleFor(scale: TextScale): number {
  return scale === 'large' ? 1.18 : 1.0;
}
```

- [ ] **Step 4:** Implement `src/theme/applyTheme.ts` that sets the variables on `document.documentElement`:

```ts
import { THEME_TOKENS, fontScaleFor, type ThemeName, type TextScale } from './tokens';

export function applyTheme(theme: ThemeName = 'dark', scale: TextScale = 'normal') {
  const root = document.documentElement;
  const tokens = THEME_TOKENS[theme];
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  root.style.setProperty('--font-scale', String(fontScaleFor(scale)));
}
```

- [ ] **Step 5:** Call `applyTheme(settings?.theme, settings?.textScale)` from a small effect high in the tree (e.g. inside `AuthGate` after settings load, or in `App.tsx` reading the store) so it re-applies whenever settings change.

- [ ] **Step 6: Run tests, manual check default still dark. Step 7: Commit.** `git add -A && git commit -m "feat: theme tokens and applier via css variables" && git push`

### Task 6.3: Migrate screen styles to tokens

**Files (migrate one per commit to keep diffs reviewable):**
- `src/screens/Dashboard.tsx`, `src/screens/Customers.tsx`, `src/screens/CustomerDetail.tsx`, `src/screens/Orders.tsx`, `src/screens/OrderEditor.tsx`, `src/screens/OrderDetail.tsx`, `src/screens/Settings.tsx`, `src/screens/Templates.tsx`, `src/screens/Login.tsx`, `src/components/*` , `src/index.css`

For each file: replace hardcoded color literals in the `styles` object with `var(--token)` (background `var(--surface)`, text `var(--text)`, muted `var(--text-muted)`, borders `var(--border)`, the gradient page background can become `var(--bg)`), and wrap font sizes with the scale, for example change `fontSize: '14px'` to `fontSize: 'calc(14px * var(--font-scale))'`. Keep the layout and radii unchanged.

- [ ] Do this file by file. After each file: `npm run build` then commit, e.g. `git add -A && git commit -m "refactor: tokenize Dashboard styles for theming" && git push`. Repeat per file.

### Task 6.4: Theme and text-size toggles in Settings

**Files:**
- Modify: `src/screens/Settings.tsx`

- [ ] **Step 1:** Add two toggle groups mirroring the existing language toggle: Theme (Dark / Light) writing `updateSettings({ theme })`, and Text size (Normal / Large) writing `updateSettings({ textScale })`. Add `useT` keys `settings.theme`, `settings.textSize`, `settings.dark`, `settings.light`, `settings.normal`, `settings.large` in both `en` and `gu`.

- [ ] **Step 2: Manual check** toggling each updates the whole app live (the store -> applyTheme effect). Step 3: Commit. `git add -A && git commit -m "feat: theme and text-size toggles in settings" && git push`

---

## Phase 7: Tests and i18n coverage

### Task 7.1: Extend E2E and i18n

**Files:**
- Modify: `tests/e2e/scenario.spec.ts`, `src/i18n/en.ts`, `src/i18n/gu.ts`

- [ ] **Step 1:** Confirm every new `useT` key added above exists in both `en` and `gu`.
- [ ] **Step 2:** Add E2E steps: start a new order, use the customer picker to add a new customer inline, use a deadline chip, mark fully paid, save; from the dashboard global search find the order by token; open it and tap "Mark ready"; toggle Light theme and Large text in Settings and assert the app still renders.
- [ ] **Step 3:** `npm run test`, run emulator integration, `npm run e2e`, `npm run build`. Step 4: Commit. `git add -A && git commit -m "test: e2e and i18n coverage for v2 enhancements" && git push`

---

## Self-review checklist (run before declaring done)

- [ ] Every selected feature has tasks: inline customer search/add, faster measurement entry (keypad, enter-to-next, measure mode), one-tap status, call/WhatsApp, quick-wins (global search, deadline chips, fully-paid, auto-add garment, shop name), light theme + large text.
- [ ] Measurement values are still strings; nothing coerces them to numbers.
- [ ] All new UI text is in both `en` and `gu`.
- [ ] Customer name is still derived from the store, never stored on orders.
- [ ] Default theme is still dark when no setting is present; toggles persist via `settings/app` and apply live.
- [ ] `npm run test`, emulator integration, `npm run e2e`, and `npm run build` all pass.
```
