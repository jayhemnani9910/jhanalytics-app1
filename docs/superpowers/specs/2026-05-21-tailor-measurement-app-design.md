# Tailor Measurement App, Design Spec

**Date:** 2026-05-21
**Status:** Approved design, ready for implementation planning
**Intended implementer:** antigravity CLI. This spec must be self-contained enough to build the full app plus its test suite without further guessing.

## 1. Purpose

A phone-first web app for a tailor shop (Pareshbhai's shop) to store customer measurements and track orders. Staff take a customer's measurements for one or more garments, set a delivery deadline, and save the order. Later they search by customer name (or pickup token) to pull up the measurements and order details. The app behaves like a phone's call/contacts app: a dashboard of upcoming and recent work, and a contacts-style list of customers.

## 2. Users and context

- **Users:** the tailor plus a few staff (2 to 4 people) who all share the same data through a single shared shop login.
- **Device:** primarily a mobile phone, used in the shop. Layout is mobile-first and must still be usable on a larger screen.
- **Connectivity:** the shop's internet is unreliable. The app must work offline for both reading and writing, and sync when the connection returns.
- **Language:** UI labels in English or Gujarati, chosen with a toggle in Settings. Free-text fields (names, notes, custom labels, measurement values) accept any script regardless of the UI language.
- **Scale assumption:** on the order of hundreds of customers and low thousands of orders over the app's life. This fits comfortably in the offline cache, but lists must still paginate and old delivered orders must not crowd the active views.

## 3. Stack

- **Frontend:** React + Vite, built as an installable PWA. Mobile-first. Bottom tab-bar navigation. React Router for screens.
- **Client data layer:** the app subscribes with Firestore realtime listeners (`onSnapshot`) to customers, templates, and active orders, and holds them in a lightweight client store (Zustand, or React Context if preferred). All search, filtering, dashboard bucketing, and the "balance due" view are computed in memory over this store. Screens do not run their own per-view Firestore queries; they read from the store. This is what makes search and the dashboard work offline.
- **Backend:** Firebase, free Spark plan for v1.
  - **Firestore** for data, with offline persistence enabled (`persistentLocalCache` with multi-tab support).
  - **Firebase Auth** for the shared shop login (email + password), default local session persistence so staff are not logged out between visits. A logout control lives in Settings.
  - **Cloud Storage** for order photos.
- **i18n:** all UI strings come from `translations/en` and `translations/gu` maps. No hard-coded user-facing strings. Toggling language re-renders instantly. Bundle a Gujarati-capable web font (Noto Sans Gujarati) so labels never render as missing-glyph boxes.
- **Money:** all amounts are Indian rupees, formatted with the ₹ symbol.
- **Testing:** Vitest (unit), Firebase Emulator Suite (integration, security rules, offline/sync), Playwright (E2E).

Push notifications are deliberately out of v1 to stay on the free plan and avoid backend complexity. See Section 12.

## 4. Prerequisites and configuration (manual, before/after build)

Antigravity generates code but cannot provision Firebase. A human must do these once:

1. Create a Firebase project.
2. Enable Firestore, Authentication (Email/Password provider), and Cloud Storage.
3. Create the single shared shop user (email + password) in the Auth console.
4. Copy the Firebase web config into a local `.env` file. The app reads these env vars (Vite requires the `VITE_` prefix):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_APP_ID`
5. Deploy the Firestore and Storage security rules (Section 8).

The repo must include a `.env.example` listing these keys, and the code must fail with a clear message if config is missing rather than crashing obscurely.

## 5. Data model (Firestore)

One shop, one shared login, so collections are top-level.

### `customers/{id}`
| Field | Type | Notes |
|-------|------|-------|
| `name` | string | required |
| `phone` | string | optional |
| `gender` | string | optional (`female` / `male` / `other` / unset); soft hint to surface relevant templates first |
| `notes` | string | optional, free text |
| `nameLower` | string | derived, lowercased name for sorting and search matching |
| `createdAt` | timestamp | server timestamp |
| `updatedAt` | timestamp | server timestamp |

### `orders/{id}`
An order represents one customer visit/drop-off. It can hold several garments, shares one deadline, and has one combined bill.

| Field | Type | Notes |
|-------|------|-------|
| `tokenNo` | string | short human-friendly pickup code, see Section 5.1 |
| `customerId` | string | reference to `customers/{id}`; the display name is derived live from the cached customer, not stored here |
| `deadline` | string | required; calendar date as `YYYY-MM-DD`, see Section 5.2 |
| `items` | array | one or more garment line-items, see below |
| `advancePaid` | number | optional, order-level advance in ₹ |
| `notes` | string | optional, order-level |
| `photos` | array | order-level photo references, each either `local:<localId>` (not yet uploaded) or a Cloud Storage path `orders/{orderId}/{photoId}.jpg`, see Section 7 |
| `createdAt` | timestamp | server timestamp |
| `updatedAt` | timestamp | server timestamp |

Derived (computed in the client store, not stored):
- `totalPrice` = sum of each item's `price` (missing prices count as 0).
- `balance` = `totalPrice - advancePaid`.
- `statusRollup` = `delivered` if every item is delivered, else `ready` if every item is ready, else `pending`.

Each entry in `items` is a garment line-item:

| Field | Type | Notes |
|-------|------|-------|
| `itemId` | string | stable id generated at creation |
| `garmentType` | string | template name captured at creation time |
| `templateId` | string \| null | template used; null if fully custom |
| `quantity` | number | default 1 |
| `measurements` | array | ordered snapshot rows, see Section 5.3 |
| `price` | number | optional, per-garment price in ₹ |
| `status` | enum | `pending` / `ready` / `delivered`, per garment |

Measurements are stored on the line-item as a snapshot, not looked up from the template live. Editing or renaming a template later never alters historical orders.

**Concurrency note:** because items are embedded in the order document, two staff editing the same order offline at the same time resolve by last-write-wins at the document level, which can lose one edit. This is rare for a small shop and accepted in v1. If it ever matters, the hardening path is to move `items` into an `orders/{id}/items/{itemId}` subcollection read via a collection-group listener.

### `templates/{id}`
| Field | Type | Notes |
|-------|------|-------|
| `name` | string | garment name, e.g. "Blouse" |
| `fields` | array | ordered list `[{ id, label, unit }]`; `id` is a stable key, `label` is the display name |
| `gender` | string | optional soft hint matching customer gender |
| `isDefault` | boolean | true for the shipped defaults |
| `createdAt` | timestamp | server timestamp |

Ships with common default templates (Appendix A). Fully editable in-app: add garment types, rename, reorder, or remove fields. Renaming or reordering changes only `label`/order; the `id` stays stable so it can map to historical measurements. On first run the app seeds defaults, guarded against double-seeding (Section 9).

### `settings/app`
| Field | Type | Notes |
|-------|------|-------|
| `language` | enum | `en` / `gu` |
| `shopName` | string | optional |
| `seeded` | boolean | set true inside the seeding transaction so defaults load exactly once |

### 5.1 Pickup token number (`tokenNo`)

A short code staff can say out loud ("collect order 4821"). Auto IDs are unusable for this.

- Format: a 4-digit numeric string, assigned once at order creation and never changed afterward (the customer was told this number at the counter).
- Best-effort uniqueness: on creation, generate a random 4-digit code and check it against the locally cached non-delivered orders, regenerating on collision. Codes may be reused once an order is delivered and aged out.
- Two devices creating orders while both offline can pick the same code, since their caches differ. The Firestore document id is the real identity; the token is only a human convenience. Where two active orders share a token, the UI shows the customer name to disambiguate. The app does not pretend tokens are globally unique.
- Searchable: the customer/order search also matches on `tokenNo`.

### 5.2 Deadlines and date buckets

`deadline` is a calendar date stored as a `YYYY-MM-DD` string, compared against today's local date. Storing a plain date string avoids timezone drift. One shared definition, used by both the dashboard and the testing suite, evaluated against an order's `statusRollup`:

- **Overdue:** `deadline` is before today and `statusRollup` is not `delivered`.
- **Due soon:** `deadline` is today through today + 3 days inclusive and `statusRollup` is not `delivered`.
- **Upcoming:** `deadline` is later than today + 3 days.

The 3-day window is a single named constant so it can be tuned in one place.

### 5.3 Measurement rows

Each measurement row, whether it came from a template field or was added free-form, has the same shape:

`{ fieldId: string | null, label: string, value: string, unit: string }`

- `fieldId` references the template field's stable `id`, or is `null` for a custom row.
- `label` is snapshotted so the row stays readable even if the template field is later renamed or deleted.
- `value` is free text, so tailors can enter "37", "37½", "38+1", a range, or a short note like "loose". Measurement values are never coerced to numbers.
- `unit` defaults to `in`.

## 6. Screens (bottom-tab navigation)

1. **Home / Dashboard**, stacked sections in priority order, each computed from the client store: **Overdue** (red), **Due soon**, **Ready for pickup** (orders whose `statusRollup` is `ready`), **Balance due** (orders with `balance > 0`), and **Recent**. A floating "+ New order" button.
2. **Customers**, a searchable list by name, phone, or token, sorted alphabetically. Tap a customer to open their detail and order history.
3. **Orders**, all orders with status filters (Pending / Ready / Delivered / All) by `statusRollup`, sortable by deadline. Delivered orders are hidden by default (shown only via Delivered/All) so the active list stays short. Lists paginate.
4. **Customer detail**, contact info and notes, plus the list of their orders, and an entry point to add a new order.
5. **Order detail / edit**, the order's token, deadline (native date picker), shared notes, order photos, advance, and the computed total and balance. Within it, one or more garment line-items, each showing its garment template, measurement rows (template fields plus any custom rows), quantity, per-garment price, and per-garment status. Staff can add or remove garments in the order.
6. **Settings**, language toggle, manage garment templates, shop info, and logout.
7. **Login**, shared shop email + password.

**New-order pre-fill:** when adding a garment line-item for an existing customer, if that customer has an earlier line-item of the same template/garment in any order, load that line-item's measurement rows as the starting values (editable before saving). This saves re-typing for repeat customers.

**Primary flow (driving scenario):** "+ New order" -> pick or create the customer -> set the deadline -> add a garment (pick template, measurement rows appear, pre-filled if a prior matching garment exists, set quantity and price) -> optionally add more garments -> set advance -> save, which assigns a token. Later: Customers -> search "Meena" -> tap the card -> view her orders and measurements.

## 7. Offline and sync

- Firestore offline persistence is enabled, so the active dataset is cached on each device. Creating, editing, and deleting customers, orders, and templates all work offline; writes queue locally and flush automatically on reconnect.
- **Conflict rule:** last write wins at the document level (acceptable here, with the order-level caveat in Section 5).
- **Timestamps offline:** `serverTimestamp()` is null locally until a write syncs. The app reads timestamps with the SDK's estimated local values (snapshot option for pending server timestamps) so the "Recent" ordering stays correct on the device that made the write.
- **Search is client-side** over the cached store (name, phone, token), so it works offline and matches any part of the value, which a server-side Firestore query cannot do.
- **Photos** get an explicit local queue:
  - On capture, the image is compressed client-side (longest edge about 1280px, JPEG quality about 0.7, target around 150 KB) and stored as a blob in IndexedDB under a generated `localId`.
  - The order's `photos` array immediately holds `local:<localId>`, and the UI renders from the local blob.
  - A background uploader watches connectivity. When online, it uploads each pending blob to `orders/{orderId}/{photoId}.jpg`, replaces `local:<localId>` with the Storage path, and clears the blob from IndexedDB.
  - Upload failures keep the local copy and retry; they never silently drop the photo.
- **Deletion cleanup:** deleting a photo or an order also removes the associated local blobs from IndexedDB and the corresponding Cloud Storage objects, so orphans do not accumulate. Deleting an order while offline queues the Storage deletions for reconnect.
- A connection/sync indicator shows online, offline, or "syncing".

## 8. Security rules

Single shared login, so any authenticated session has full access. Acceptable for a one-shop tool.

- **Firestore:** `allow read, write: if request.auth != null;` on all collections.
- **Storage:** same, only authenticated sessions may read or write under the `orders/` path.

These rules live in the repo (`firestore.rules`, `storage.rules`) and are exercised by the emulator tests.

## 9. Error handling and edge cases

- **Required fields:** a customer requires `name`; an order requires a `deadline` and at least one garment line-item with a `garmentType`. Everything else is optional.
- **Deleting a customer who has orders:** confirm first, and by default block the delete with a clear message rather than orphaning or cascading.
- **Deleting an order or a garment line-item:** allowed (mistake entries happen); on order delete, clean up photos per Section 7.
- **Template edits versus history:** old line-items keep their saved measurement rows; renaming or removing template fields never mutates past orders.
- **First-run seeding:** seed default templates inside a transaction that checks and sets `settings/app.seeded`, so two devices launching fresh at once cannot double-seed.
- **Balance:** always derived (`totalPrice - advancePaid`), never directly editable.
- **Photo upload failure or quota:** surface a retry, never a silent drop.
- **Missing Firebase config:** fail fast with a readable message (Section 4).
- **Auth:** all reads and writes require the shop to be logged in, enforced by the security rules.
- **Inputs:** money fields use a numeric input mode; the phone field uses a `tel` input mode; the deadline uses a native date picker. Measurement values are plain text (Section 5.3).

## 10. Testing strategy

- **Unit (Vitest):** total/balance computation across multiple items; `statusRollup` derivation (mixed item statuses); client-side search/filter (name, phone, token, partial matches); deadline bucketing against Section 5.2; token generation and collision-regeneration; measurement-row mapping from a template (including stable `fieldId`); pre-fill selection of the latest matching prior line-item; i18n string lookup with fallback.
- **Integration (Firebase Emulator):** create/edit/delete customer and order; add/remove garment line-items; per-item status transitions and the resulting rollup; template edits not corrupting past orders; seeding transaction runs exactly once; security rules (only an authenticated session can read or write).
- **Offline/sync (Emulator):** write while offline (`disableNetwork`), reconnect (`enableNetwork`), assert sync; last-write-wins on a simulated conflict; estimated local timestamps keep Recent ordering offline; photo queued offline then uploaded on reconnect with the reference swapped from `local:` to the Storage path; order deletion offline cleans up Storage on reconnect.
- **E2E (Playwright):** full driving scenario, new order for a new customer with two garments sharing one deadline, set advance, save, confirm a token and the combined total; search by name and by token; appears on the dashboard in the right bucket; move one item pending -> ready, then all -> delivered, and watch the rollup and dashboard update; balance-due view lists an unpaid order; language toggle EN to GU.
- **PWA:** installable; offline app-shell loads with no network.

## 11. Deferred to a later phase

- **Push notifications.** Fully designed but not built in v1, because scheduled Cloud Functions require Firebase's Blaze plan. When wanted: a daily scheduled Cloud Function finds non-delivered orders due today or tomorrow and sends FCM web push to the shop's logged-in devices, with the FCM service worker reconciled against the PWA's Workbox service worker. The visual dashboard buckets are the v1 substitute and stay as the offline-safe fallback even after push is added.
- **Per-garment photos.** v1 attaches photos at the order level; attaching a reference photo to a specific garment line-item is a later refinement.
- **Items subcollection** for finer-grained offline concurrency (Section 5 concurrency note).

## 12. Out of scope (v1)

- Per-staff individual logins and who-did-what audit (single shared login chosen).
- Multi-shop / tenant separation.
- Invoicing/printing, SMS to customers, analytics/reporting.
- Custom multi-stage statuses beyond pending/ready/delivered.
- Partial pickup of some garments in an order before others (the rollup treats the order as one).
- Data export/backup beyond what Firebase provides. (Operational note: the whole business lives in one Firebase project; the owner should consider periodic exports.)

The data model leaves room to add these later.

## Appendix A, Default garment templates

All fields default to inches (`in`) unless noted. "(round)" means a circumference measurement. These ship pre-loaded into the `templates` collection on first run with `isDefault: true`; staff can edit, reorder, rename, or delete any of them, and add new templates. Each field also gets a stable generated `id` at seed time. Field lists come from common Indian tailoring measurement guides (see Sources) and are starting points, not gospel.

### 1. Blouse (saree blouse), gender: female
Shoulder, Bust/Chest (round), Waist (round), Blouse Length, Front Neck Depth, Back Neck Depth, Sleeve Length, Sleeve Round (bicep), Armhole (round), Dart Point

### 2. Kameez / Kurti (top), gender: female
Kameez Length, Shoulder, Chest (round), Waist (round), Hip (round), Front Neck Depth, Back Neck Depth, Sleeve Length, Sleeve Round, Armhole (round)

### 3. Salwar / Churidar (bottom), gender: female
Salwar Length, Waist (round), Hip (round), Thigh (round), Knee (round), Bottom / Ankle (round)

### 4. Dress / Gown, gender: female
Full Length, Shoulder, Bust (round), Waist (round), Waist Position (length from shoulder to waist), Hip (round), Front Neck Depth, Back Neck Depth, Sleeve Length, Sleeve Round, Armhole (round)

### 5. Shirt (men's), gender: male
Shirt Length, Collar / Neck (round), Shoulder, Chest (round), Waist (round), Sleeve Length, Cuff / Sleeve Round, Front Yoke

### 6. Pant / Trouser (men's), gender: male
Outseam Length, Waist (round), Seat / Hip (round), Thigh (round), Knee (round), Bottom (round), Inseam, Crotch / Rise

The `gender` tag is only a soft hint to surface the most relevant templates first for a customer. Staff can always pick any template regardless of the customer's gender.

## Sources (template field research)
- [How to measure a saree blouse, Utsav Fashion](https://www.utsavfashion.com/blog/how-to/measure-saree-blouse)
- [Saree blouse tutorial, Style2Designer](https://style2designer.com/pattern-cutting-cad-cam/cutting-sewing-techniques/saree-blouse-tutorial/)
- [How to measure for salwar kameez, Utsav Fashion](https://www.utsavfashion.com/blog/how-to/measure-salwar-kameez)
- [Indian suit measurements step-by-step, Lashkaraa](https://www.lashkaraa.com/blogs/lashkaraa/indian-suit-measurements)
- [Guide to a perfect men's shirt fit, Modern Tailor (PDF)](https://www.moderntailor.com/static/mt/men_shirt_measureguide.pdf)
- [How to measure guide, Tailor Store](https://www.tailorstore.com/guide/how-to/how-to-measure-guide)
