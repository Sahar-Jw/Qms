# QMS Backend — Quotation Management System API

NestJS 11 · TypeORM · MySQL/MariaDB · JWT (httpOnly cookie) · decimal.js · Puppeteer (PDF)
Built from `QMS_SRS_final.docx` (v1.2). Node 20+.

## Quick start (Windows / any OS)

```bash
npm install                 # set PUPPETEER_SKIP_DOWNLOAD=true first if you don't need local PDF generation
copy .env.example .env      # (cp on Linux/Mac) then set DB_* and unique JWT/seed-admin secrets
# create an empty database first:  CREATE DATABASE qms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
npm run start:dev           # DB_SYNC=true in .env creates the tables automatically (dev only)
npm run seed                # 4 roles, quotation counter, first TECHNICAL MANAGER
npm run seed:demo           # OPTIONAL: demo data for testing everything (see "Demo data" below)
```

- API: `http://localhost:3001/api` — Swagger UI (dev only): `http://localhost:3001/api/docs`
- The seeded account is the **Technical Manager** (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; set a unique password before seeding). There is no default admin password. Everyone else registers themselves; a general/technical manager activates the account and sets the role.
- Tests: `npm test` (calculation rules from SRS §13).

## Structure

```
src/
  auth/ users/ roles/            self sign-up (inactive until the general manager activates), login lockout, 4 roles
  companies/ customers/ materials/ settings/   (settings = which company the user issues quotations from + the site-wide colour theme)
  audit/                         audit log: a global interceptor records every create / update / delete / sign-in; `GET audit-log`
  calc/                          ALL money math (per currency, decimal.js) + unit tests
  quotations/                    numbering, items, statuses, duplicate, full search, print endpoints
  search/                        one search box over quotations + customers + materials
  pdf/                           HTML template (AR/EN) + Chromium PDF
  common/                        guards, decorators, validators, error filter, base entity
  database/                      data-source, seed, migrations/ (InitialSchema, ... AuditLogAndThemeSettings)
```

## Endpoints (prefix `/api`)

| Area | Endpoints | Who |
|---|---|---|
| Auth | `POST auth/register` · `POST auth/login` · `POST auth/logout` · `GET auth/me` · `POST auth/change-password` | public / any |
| Users | `GET users` · `GET/PATCH users/:id` (name, phone, role) · `PATCH users/:id/activate\|deactivate` — no create / no password reset (users register themselves) | general manager+ |
| | `GET users/lookup` (id + name of active users, for dropdowns) | any |
| Roles | `GET roles` | general manager+ |
| Companies | `GET companies[/:id]` | any |
| | `POST companies` · `PATCH companies/:id` · `PATCH companies/:id/active` · `POST companies/:id/logo` (png/jpg/webp ≤1 MB, field `file`) | general manager+ |
| Customers / Materials | `GET` (list `?q=&status=active\|inactive\|all&page=&limit=`) · `GET :id` · `POST` · `PATCH :id` | any |
| | `PATCH :id/active` | manager+ |
| Settings | `GET settings/companies` (active companies to pick from: id, names, logo) · `GET settings` · `PATCH settings` `{ issuingCompanyId }` — the company ALL of this user's new quotations are issued from | any user |
| | `GET settings/theme` → `{ colors: { ink, cocoa, clay, stone, sand } }` (the site-wide palette, same for everyone) | any user |
| | `PATCH settings/theme` `{ colors: { ink, cocoa, clay, stone, sand } }` (each `#RRGGBB`) · `DELETE settings/theme` (back to the defaults) | manager+ |
| Audit log | `GET audit-log` (`q` user/record, `action`, `entity`, `userId`, `from`, `to` as `YYYY-MM-DD`, `page`, `limit`) — newest first. Rows are written automatically for every successful `POST/PATCH/PUT/DELETE` and for failed sign-ins; submitted data is stored with passwords/tokens removed | manager+ (employees get 403) |
| Quotations | `GET quotations` (`q,status,archived`, `companyId,customerId,responsibleUserId,from,to,page,limit`; `archived=true` = locked only) · `POST` · `GET :id` · `PATCH :id` · `POST :id/duplicate` · `POST :id/status` | any (see rules) |
| Search | `GET search?q=&limit=` → `{ quotations, customers, materials }` | any |
| Print | `GET quotations/:id/print?lang=ar\|en[&autoprint=true][&includeCost=true]` (HTML) · `GET quotations/:id/pdf?lang=…` (PDF) | any (`includeCost`: manager+) |

Logos are served at `/uploads/logos/<file>` (the `logo` field of a company).

## Rules implemented

- **Roles (4 only)**: Manager and employee are **not tied to a company/branch**.
  - `technical_manager` and `general_manager` are equals: full access to everything, and **neither can deactivate, demote or edit the other** (or another account of their tier). They manage all manager / employee accounts and can give any role to them.
  - `manager`: everything a manager can do, except **editing quotations he did not create** (he can still view them, change their status and duplicate them - the copy is his).
  - `employee`: edits only his own quotations, and **never sees locked quotations** (list, search, detail, print, PDF all answer as if they did not exist).
- **Accounts**: self sign-up creates an inactive Employee; the general manager (or technical manager) activates it and assigns the role. Nobody creates accounts for others and nobody can see/reset another user's password. 3 failed logins → locked 15 min (`MAX_FAILED_LOGINS`, `LOCK_MINUTES`). Deactivation / role change applies immediately (the account is re-checked on every request). You can't deactivate or change the role of your own account.
- **Quotation number**: sequential across all companies, gap-free (row-locked counter), `QUOTATION_PREFIX` + 6 digits → `QT-000001`.
- **Items**: price/cost/shipping/customs each have their own currency. Per currency: `value = qty × price`, `cost = qty × unit cost`, `required = value + customs + shipping` (cost is NOT part of required). Currencies are never summed together or converted; totals are per currency. Server recalculates on every save; the client never sends totals.
- **Snapshots**: item stores material code/names; later material edits don't change old quotations.
- **Status**: `draft → issued → expired / locked / invoiced`. `locked` and `invoiced` are read-only; only general manager+ can unlock (locked → issued); `invoiced` is final. No deletion of quotations, customers, materials: deactivate instead.
- **Cost**: only manager and above can set or change cost; an employee's edit preserves existing costs.
- **Notes** (quotation and item) are internal and never printed. Tax % (quotation) and commission % (item) are stored but not used in any formula (SRS leaves them undefined).
- **Customer payment way**: one plain text field on the quotation (`customerPaymentMethod`, max 100 chars). The user types how the client will pay, in any language; it is printed exactly as typed. No select, no lookup table. Send `""` or `null` to clear.
- **Print/PDF**: Arabic (RTL) or English (LTR) chosen per print; Cairo font embedded, logo inlined. Customer/material names print in the chosen language (fallback to the other one).

## Item payload semantics (important for the frontend form)

`items` is the **full list**: lines with `id` are updated, lines without `id` are created, existing lines that are missing are deleted. Omitted optional fields on a line are cleared (e.g. a missing `shippingCost` removes the shipping). For a new line, `unitPrice` / `priceCurrency` default from the material. Money and quantities are **decimal strings** in responses (`"600.0000"`); send strings or numbers.

## Frontend (Next.js) integration

The ready-made frontend is the separate `qms-frontend` project. It proxies `/api` and `/uploads` to this server (same origin, so the httpOnly cookie needs no CORS tricks).

- Errors: `{ statusCode, code, message, details? }` - the frontend maps `code` (e.g. `ACCOUNT_LOCKED`, `QUOTATION_READ_ONLY`) to Arabic/English text.
- `GET quotations/:id` returns `editable` and `allowedStatuses` for the current user, so the UI drives its buttons from them.
- Print: `/api/quotations/:id/print?lang=ar&autoprint=true` (works without Chromium) or `/pdf`.
- PDF needs Chromium: set `PUPPETEER_EXECUTABLE_PATH` if the bundled one is not installed. If Chromium dies the service starts a new one on the next request.

## Production / cPanel

1. `PUPPETEER_SKIP_DOWNLOAD=true npm ci` → `npm run build` (or build locally and upload `dist/`).
2. `.env`: `NODE_ENV=production`, `DB_SYNC=false`, `DB_MIGRATIONS_RUN=true` (creates tables at startup), strong `JWT_SECRET`, `COOKIE_SECURE=true`, `FRONTEND_URLS=https://…`, `COOKIE_DOMAIN=.yourdomain` if web and api are on sibling subdomains.
3. cPanel → *Setup Node.js App*: startup file `dist/main.js`; run once `npm run seed:prod`.
4. Chromium usually can't run on shared hosting → `/pdf` returns `503 PDF_ENGINE_UNAVAILABLE`; use `/print` (browser "Save as PDF"), or set `PUPPETEER_EXECUTABLE_PATH` if the host provides Chrome.
5. Back up the database and the `uploads/` folder.

## Notes

- `migration:generate` on **MariaDB** emits spurious `CHANGE … NULL` / FK statements (TypeORM quirk). The shipped `InitialSchema` was generated on an empty database and verified; for later changes generate on MySQL 8 or review/trim the file by hand.
- Dependencies are pinned to NestJS 11 (CommonJS) on purpose; bcryptjs (pure JS) is used instead of bcrypt so it installs on Windows and shared hosting without native builds.

## Boss notes (highlighted in the SRS) → what was done

| # | Note in the SRS | Implementation |
|---|---|---|
| 1 | Several companies / branches, restricting the manager to a company — **غير مطلوب** (not required) | No company scoping anywhere. Companies exist only as the issuing letterhead; `users.company_id` removed. |
| 2 | Company comes from the settings, not chosen per quotation | Each user picks the company in Settings (`PATCH settings`). The quotation **carries** that company (`companyId`, returned as `company`): on create it is filled from the settings — the form may send `companyId` (must equal the setting, else `COMPANY_MISMATCH`) or omit it. It cannot be changed on an existing quotation, so changing the setting never alters old quotations. Duplicates use the current setting. Nothing set + exactly one active company → used automatically; otherwise `ISSUING_COMPANY_NOT_SET`. |
| 3 | Manager / employee **not** tied to a company/branch | Same as 1. |
| 4 | Notes field on the quotation **and** on each item, **not printed** for the customer | `notes` on `quotations` and `quotation_items`; the print/PDF template never renders them (verified). |
| 5 | Users create their own accounts; the general manager **activates** (does not create) | `POST auth/register` → inactive; `PATCH users/:id/activate`. No create-user endpoint. |
| 6 | Four roles only: technical manager, general manager, manager, employee | `RoleCode` + seed; hierarchy in `ROLE_RANK`. |
| 7 | **Full** search across quotations, customers, materials | Quotation `?q=` searches header fields, company, customer, responsible user and item lines; customers/materials search every text field; `GET search?q=` queries all three. |
| 8 | A quotation can be fully copied from a previous one, then edited | `POST quotations/:id/duplicate` (optional `customerId`; company = current setting): new number, today's date, draft; items/costs/notes copied; edit with `PATCH`. |
| 9 | Numbers: Arabic (976876) | Printed numbers use 0-9 in both languages (no Arabic-Indic option). |
| 10 | Nobody edits locked / invoiced quotations | Nobody can edit `locked` / `invoiced` (409 `QUOTATION_READ_ONLY`); only technical / general manager can unlock. Employees do not even see locked ones. |
| 11 | "There are tables that need no discussion at all" (heading 7.1, detailed ERD) | Not actionable from the text — which tables? Ask the boss; nothing removed so far. |

## Other decisions (change if wrong)

1. Status transition permissions: see `TRANSITIONS` in `quotations.service.ts`.
2. Employees can read cost data but not write it.
3. Tax / commission formulas and whether they print: stored only.
4. `validity` is free text — no automatic expiry yet.
5. A customer / material needs a name in Arabic **or** the foreign language.

## Demo data (to test everything)

```bash
npm run seed:demo           # adds the demo data (does nothing if it is already there)
npm run seed:demo:reset     # wipes quotations / customers / materials / companies / demo users and builds it again
# production build: npm run seed:demo:prod   (reset in production needs:  node dist/database/seed-demo.js --reset --force)
```

Creates 3 companies (one inactive), 8 users, 12 customers (one inactive, some with one name only), 21 materials (USD / EUR / SYP / TRY / AED, one inactive) and 23 quotations in all five statuses, created by different users, with several currencies per quotation, costs, shipping, customs, notes and customer payment text. Each user's issuing company is already set in Settings.

All demo accounts use the password **Demo@12345**:

| Account | Role | Good for testing |
|---|---|---|
| `admin@example.com` (your `SEED_ADMIN_*`) | technical manager | everything |
| `tech2@demo.test` | technical manager | cannot be changed by the general manager |
| `gm@demo.test` | general manager | everything; cannot change the technical managers |
| `manager1@demo.test`, `manager2@demo.test` | manager | edit own quotations only; try editing the other manager's |
| `employee1@demo.test`, `employee2@demo.test` | employee | no locked quotations anywhere |
| `pending@demo.test` | employee, not activated | activate it from Users |
| `deactivated@demo.test` | employee, deactivated | cannot sign in |
