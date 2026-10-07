# QMS Frontend - Quotation Management System

Next.js 16 (App Router) + Tailwind CSS 4 + TanStack Query + React Hook Form. Arabic (RTL) and English (LTR), wired to the `qms-backend` API.

## Run it (Windows / any OS)

1. Start the backend first (`qms-backend`, default http://localhost:3001).
2. In this folder:

```bash
npm install
copy .env.example .env.local      # cp on Linux/Mac; set API_URL if the backend is not on localhost:3001
npm run dev                       # http://localhost:3000
```

Sign in with the seeded technical manager (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` of the backend). Other people register at `/register` and a general manager activates them under **Users**.

## How it talks to the backend

The browser only calls this Next.js server. `next.config.ts` rewrites `/api/*` and `/uploads/*` to `API_URL`, so the httpOnly auth cookie is same-origin: no CORS and no cookie headaches.
**`API_URL` is read when you run `npm run build`** (rewrites are baked into the build), so set it before building for production.

## Screens

| Route | What |
|---|---|
| `/login`, `/register` | Sign in / self sign-up (account waits for activation) |
| `/dashboard` | Greeting + issuing company, quotations by status (the palette pill stack), latest quotations |
| `/quotations` | Full search, status pills, locked filter, date range, pagination |
| `/quotations/new`, `/quotations/[id]/edit` | Form with live per-currency totals; customer and material pickers search as you type |
| `/quotations/[id]` | Items, totals per currency, status buttons (only the allowed ones), edit, duplicate, print/PDF in Arabic or English, "include cost" for managers |
| `/customers`, `/materials` | Search, create/edit in a dialog, activate/deactivate (manager+) |
| `/companies`, `/users` | General manager+: companies with logo upload, user activation and roles |
| `/settings` | Everyone: pick the issuing company (every new quotation uses it). Manager+ also get two more tabs: **Theme** (change the five brand colours with a live preview card, then save for the whole site) and **Audit log** (who did what, filterable) |
| `/search?q=` | One search over quotations, customers and materials |

Roles: technical manager and general manager can do everything and cannot change each other; a manager can edit only the quotations he created; an employee also edits only his own and never sees locked quotations. Cost fields exist only for manager and above. The backend enforces every rule again.

## Language and numbers

- Language is stored in the `lang` cookie (Arabic by default) and switched from the top bar; `dir` flips automatically.
- Numbers are always Western digits (976876). Dictionaries: `src/lib/i18n/ar.ts` and `en.ts` (Arabic must have the same keys as English; TypeScript checks it).
- API error `code`s are translated under `err.*`; unknown codes show the server message.

## Look and feel

Palette from your image, plus white and black: `ink #291C0E`, `cocoa #6E473B`, `clay #A78D78`, `stone #BEB5A9`, `sand #E1D4C2` (defined in `src/app/globals.css`, used as `bg-ink`, `text-cocoa`, ...). Quotation statuses use the same five colours as stacked pills, like the swatch image. Font: Cairo (bundled through `@fontsource/cairo`, works offline).

## Production

```bash
set API_URL=https://api.yourdomain.com   (or put it in .env.production)
npm ci && npm run build && npm start
```

cPanel "Setup Node.js App": application startup file `server.js`, run `npm ci` and `npm run build` first. The Next.js server and the NestJS API are two separate Node apps. The browser must reach this app over HTTPS and the backend should have `COOKIE_SECURE=true`.

## Structure

```
src/app/(auth)/        login, register
src/app/(app)/         dashboard, quotations, customers, materials, companies, users, settings, search
src/components/        ui.tsx (buttons, fields, cards, modal, pill stack), Shell.tsx, QuotationForm.tsx, AsyncPick.tsx, Totals.tsx
src/lib/               api.ts (fetch wrapper), types.ts, money.ts (same maths as the backend), i18n/, errors.ts
```
