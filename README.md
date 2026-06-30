# Agriport — B2B Wholesale Trading Platform

A centralized **B2B wholesale trading, inventory & sales-automation platform**.
This repository is a monorepo split into independent **frontend** and **backend** modules.

```
Agriport/
├── frontend/   ← React 19 + TS + MUI + Tailwind (active — Customer app built)
└── backend/    ← Node.js + Express API (Phase 2 — placeholder)
```

## Current phase — Frontend (UI)

The focus right now is the **frontend only**, with no backend required. The app runs
entirely on a self-contained mock data layer, so every screen is fully interactive.

**Built so far — the Customer application (B2B buyer experience):**

- **Auth** — Email/password & mobile-OTP login, multi-field business signup, OTP
  verification, forgot/reset password.
- **Home** — Hero, category grid, promotional banners, featured & new-arrival products.
- **Marketplace** — Product listing with category filters, sort, in-stock toggle and
  URL-driven search.
- **Product detail** — Image gallery, **lot-based wholesale pricing** with live
  per-quantity price resolution, specs, add-to-cart / buy-now.
- **Cart** — Live lot-price recalculation, quantity steppers, order summary.
- **Checkout** — Online & offline payment method selection, billing & pickup details.
- **Orders** — Status tabs (Placed / Confirmed / Completed / Cancelled), order tracking
  timeline, **downloadable invoice & gate pass**, reorder.
- **Profile** — Personal details, business info, document upload (drag-and-drop) with
  verification status, transaction history.

**Built — the Admin Control Panel (`/admin`):**

- **Dashboard** — 8 KPI cards (revenue, orders, users, pending payments, managers,
  executives, stock, monthly sales) + Recharts revenue trend, orders-per-month and
  category-share visuals + recent orders.
- **Product Management** — MUI DataGrid with search, add/edit/delete dialog and
  auto-generated lot-pricing preview.
- **Order & Payment Management** — status-tabbed DataGrid with confirm / verify-payment /
  cancel actions and on-the-fly invoice generation.
- **User Management** — DataGrid with suspend / block / activate and document verification.
- **Sales Team** — manager performance vs. target, executive approval queue, dynamic
  incentive/commission configuration.
- **Inventory** — stock-approval workflow (approve/reject manager requests).
- **Reports** — combined revenue/orders, category pie, growth trend, export.

**Built — the Sales Manager workspace (`/manager`):**

- **Dashboard** — team revenue trend, target gauge, top-performer leaderboard, recent sales.
- **Team Management** — executive roster with performance vs. target + add-executive
  (routed to admin approval).
- **Product Selling** — full selling flow (customer details, product, live lot pricing,
  payment mode) + recent sales.
- **Product Purchase** — vendor procurement form + purchase history.
- **Stock Requests** — raise add/update/new-product requests, track approval status.
- **Incentives** — earned-vs-target charts, commission + override breakdown.
- **Sales Analytics** — revenue/deals composed chart, per-executive contribution.

**Built — the Sales Executive app (`/executive`):**

- **Dashboard** — personal sales/target, today's follow-ups, recent sales.
- **Customer Management** — CRM list with lifecycle stages, add-customer, follow-up tracker.
- **Sales Operations** — order creation via the shared selling flow.
- **My Incentives** — earned-vs-target performance.

All four role areas (Customer, Admin, Manager, Executive) plus Auth are now complete.

### Performance

Routes are **code-split with `React.lazy`** so each area ships its own chunk — the
customer app never downloads the admin panel's DataGrid (~426 KB) or Recharts (~323 KB),
and vice-versa. Layout shells stay mounted while page chunks stream in behind a Suspense
fallback.

### Tech stack (frontend)

React 19 · Vite · TypeScript · Redux Toolkit + RTK Query · React Router v7 ·
React Hook Form + Zod · Material UI · Tailwind CSS · Recharts · Day.js ·
React Hot Toast · React Dropzone.

### Run it

```bash
cd frontend
npm install
npm run dev
```

> Auth is mocked — any credentials sign you in. On the OTP screen, any 6 digits verify.

See [backend/README.md](backend/README.md) for the planned API module structure.
