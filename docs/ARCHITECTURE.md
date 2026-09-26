# Architecture notes

Deeper notes on the parts of Matjari that carry the most risk: money, orders, tenancy and subscriptions.

---

## 1. The WhatsApp order flow

The order is **always written before WhatsApp opens**. Orders that are created but never sent stay visible to the merchant as «طلبات غير مكتملة» (abandoned checkouts).

```
Customer taps «إرسال الطلب عبر واتساب»
  │
  ├─ POST /api/public/orders { slug, items[{ productId, quantity, selectedOptions }], customer…, zoneId }
  │     server: re-reads every product price from the database (client prices are ignored),
  │             checks active / stock / options / zone / minimum order,
  │             locks the store row, orderCounter + 1, inserts Order + OrderItems (one transaction),
  │             freezes productName, unitPrice and zoneName,
  │             builds the message text and the wa.me URL
  │     ← { id, orderNumber, total, whatsappNumber, message, whatsappUrl }
  │
  ├─ router.push(/s/{slug}/thank-you/{orderNumber})
  ├─ fetch PATCH /api/public/orders/{id}/whatsapp-opened   (keepalive)
  └─ window.location.href = whatsappUrl
```

- The sequence lives in `placeOrderThenOpenWhatsapp` (`packages/shared/src/utils/checkout-flow.ts`). If order creation throws, WhatsApp never opens.
- Link format: `https://wa.me/{number}?text={encodeURIComponent(message)}` — the whole message is encoded exactly **once**.
- Phone numbers are normalised on the way in (`normalizePhone`): digits only, international, no `+`, no leading zero. `0944 123 456` → `963944123456`.
- If the encoded URL would exceed ~1800 characters, trailing items are replaced by «… و{n} منتجات أخرى — التفاصيل الكاملة برقم الطلب».
- The thank-you page can reopen WhatsApp and re-marks the order as sent.

Message template:

```
مرحباً، طلب جديد من {storeName}
رقم الطلب: #{orderNumber}

- {productName} ({options}) × {qty} — {lineTotal}

المجموع: {subtotal}
التوصيل: {deliveryFee}
الإجمالي: {total}

الاسم: {customerName}
الهاتف: {customerPhone}
المنطقة: {zoneName}
العنوان: {customerAddress}
ملاحظات: {notes || '—'}
```

---

## 2. Order status machine

```
        ┌──────────┐     ┌────────────┐     ┌──────────┐     ┌────────────┐
        │   new    │ ──▶ │ preparing  │ ──▶ │ shipped  │ ──▶ │ delivered  │ (terminal)
        └────┬─────┘     └─────┬──────┘     └────┬─────┘     └────────────┘
             │                 │                 │
             └────────────────►┴────────────────►┴──────────▶ cancelled (terminal)
```

| From | Allowed next |
|---|---|
| `new` | `preparing`, `cancelled` |
| `preparing` | `shipped`, `cancelled` |
| `shipped` | `delivered`, `cancelled` |
| `delivered` | — |
| `cancelled` | — |

Anything else returns **422 `INVALID_TRANSITION`**.

Entering `delivered` deducts stock for every item whose product tracks stock, inside a transaction with the order row locked, and only when `stockDeducted = false` — so stock is never deducted twice.

Revenue in the dashboard counts **delivered orders only**, using each order's frozen totals.

---

## 3. Multi-tenancy

- `requireAuth` → `requireStore` resolves the signed-in user's store **once per request** and attaches `req.storeId` plus the subscription access state.
- Every merchant query goes through `scopedRepo(Entity, storeId)`, which injects `storeId` into every read, write, soft-delete and reorder.
- A record belonging to another store is indistinguishable from a missing one: **404, never 403**. Same for malformed UUIDs.
- Uploads are stored per store (`uploads/{storeId}/…`) and a record can only reference files from its own folder.

---

## 4. Subscriptions

Plans are fixed durations — monthly, 6 months, yearly — whose prices, currency and on/off switch the admin sets. Payment is manual (Sham Cash, USDT, cash handover; Syriatel/MTN Cash and transfers can be enabled too).

**Subscribing:** on `/dashboard/subscription` the merchant picks a plan and a payment method, pays, then submits a request with the transaction reference and an optional receipt image (uploadable even when the store is locked). The admin reviews it in `/admin/requests`: **approve** activates the plan with the amount and duration frozen at request time; **reject** records a reason the merchant sees. One pending request per store.

### Store lifecycle

```
trial ──ends──▶ grace (N days, warning banner) ──ends──▶ expired
  │                 │                                       │
  └─ admin activates ┴──────────── admin activates ─────────┘──▶ active ──ends──▶ grace ──▶ expired

any state ──admin suspends──▶ suspended ──admin lifts──▶ back to its subscription state
```

| State | Storefront | Merchant dashboard |
|---|---|---|
| `trial`, `active` | visible | full access (banner when ≤ 3 days remain) |
| `grace` | visible | full access + warning banner |
| `expired` | hidden («غير متاح حالياً») | only `/dashboard/subscription` — the API returns **402 `SUBSCRIPTION_EXPIRED`** |
| `suspended` | hidden | only `/dashboard/subscription`, showing the reason — **402 `STORE_SUSPENDED`** |

- Data is never deleted; renewing restores everything immediately.
- Activating while time remains **adds** to the current end date — paying early never loses days.
- State is computed from dates on every request (`computeAccess` in `packages/shared/src/schemas/subscription.ts`), so no cron job is needed. Admin lists filter on a SQL mirror of the same rules, and a test asserts the two agree.

---

## 5. Rendering and caching

- **Storefronts** are Server Components with `revalidate = 60` (ISR) and `generateStaticParams()` returning `[]`, so each store renders on first visit and is then cached.
- Merchant edits (products, categories, design, zones) and admin actions (activate, suspend) call the web app's `POST /api/revalidate` with a shared secret, which expires that store's cache tag — changes appear immediately instead of waiting out the window.
- The dashboard is client-side with TanStack Query; the storefront ships almost no JavaScript (cart widgets and the gallery only).
- The design page previews unsaved changes by posting them (debounced 400 ms) into the storefront iframe, which applies CSS variables and the `data-template` attribute without reloading.

---

## 6. Security notes

- Access token: JWT, 15 minutes, kept **in memory** and sent as `Authorization: Bearer`. Refresh token: JWT, 7 days, `httpOnly` + `sameSite=lax` cookie scoped to `/api/auth`. One in-flight refresh promise prevents refresh storms.
- Passwords: bcrypt, cost 12. Login compares against a dummy hash when the email is unknown, so response time doesn't reveal which emails exist.
- Password reset stores a SHA-256 of the token, never the token itself; `/auth/forgot-password` always answers 200.
- Uploads: JPEG/PNG/WEBP verified by magic bytes, 5 MB limit, UUID filenames, original names discarded.
- The admin API answers **404** to non-admins, so its existence isn't advertised. Admin rights are granted only from the command line (`npm run make-admin`).
- zod validates every body, query and param; responses are built from explicit DTOs, so `passwordHash` and reset tokens can't leak.
- CSV export escapes formula-injection prefixes (`=`, `+`, `-`, `@`) and ships a UTF-8 BOM for Excel.

---

## 7. Data model

```
User ─1:1─ Store ─1:1─ Subscription
                  ├─1:N─ Category ─1:N─ Product
                  ├─1:N─ DeliveryZone
                  ├─1:N─ Order ─1:N─ OrderItem   (productId nullable, SET NULL)
                  ├─1:N─ SubscriptionRequest
                  └─1:N─ SubscriptionPayment
PlatformSettings (singleton row: plans, currency, trial/grace days, payment methods)
```

- Money: `bigint` minor units with a TypeORM transformer to `number`.
- Soft delete (`deletedAt`) on `Product` and `Category` only — orders keep their frozen copies.
- Unique `(storeId, orderNumber)`; indexes on `(storeId, isActive)` for products and `(storeId, status, createdAt)` for orders.
