# Gondia Forest Division — GIS Portal Login

A **tab-scoped login application** for the Gondia Forest Division GIS Dashboard.

Any link opens the login page first. After a correct login, the GIS dashboard
opens right here (embedded). The session is verified against the backend API on
every visit, and **pasting the URL into a new tab asks for login again**.

![Login screen](public/Maha_Logo.jpeg)

## ✨ Features

- **Login page** matching the official Maharashtra Forest Department design
  - Circular departmental logo
  - "Gondia Forest Division" heading in deep red
  - Pill-shaped Username / Password inputs with red borders
  - Maroon → teal gradient **Sign in** button
- **Tab-scoped sessions** — the token lives in `sessionStorage`, so a new tab
  to the same URL starts empty and asks for login again.
- **Route protection + session management**
  - Every visit is immediately verified against the backend (`GET /api/auth/me`).
  - Re-validates every 3 minutes and whenever the tab regains focus.
  - Revoked / expired sessions are auto-logged-out with a clear warning.
- **Embedded dashboard** — after login, the existing Gondia GIS Dashboard is
  shown inside the app on the same URL (no redirect to a separate site).
- **scrypt-hashed passwords** with per-user salt; server-side session rows with
  8-hour expiry and per-request bearer-token validation.

## 🔑 Seed account configuration

The demo accounts are seeded on first login. Configure `SEED_USER_PASSWORD` and
`SEED_ADMIN_PASSWORD` in your local `.env` file or deployment environment. These
values are required and must be kept private; do not commit `.env` or share the
passwords in source code or documentation. Usernames are case-insensitive.

## 🧱 Tech stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** components
- **Prisma ORM** (SQLite) for accounts & sessions
- **scrypt** password hashing (Node `crypto`)
- **Framer Motion** for UI animations
- **z-ai-web-dev-sdk** (available for AI features)

## 🚀 Getting started

### 1. Install dependencies

```bash
bun install
# or
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and set private seed passwords:

```env
DATABASE_URL="file:./db/custom.db"
SEED_USER_PASSWORD="choose-a-private-user-password"
SEED_ADMIN_PASSWORD="choose-a-private-admin-password"
```

Never commit `.env`; it is excluded by `.gitignore`.

Create the database schema:

```bash
bun run db:push
# or
npx prisma db push
```

### 3. Run the dev server

```bash
bun run dev
# or
npm run dev
```

Open <http://localhost:3000> — the seed accounts are created automatically on
first login attempt.

### 4. Build for production

```bash
bun run build
bun run start
```

## 📁 Project structure

```
prisma/
  schema.prisma          # Account + Session models
src/
  app/
    page.tsx             # Login ↔ embedded-dashboard switcher
    layout.tsx
    api/auth/
      login/route.ts     # POST  validates credentials, issues session token
      logout/route.ts    # POST  revokes the current session
      me/route.ts        # GET   verifies a bearer token (route protection)
      sessions/route.ts  # GET/DELETE  list / revoke sessions
  components/auth/
    login-form.tsx       # the login card UI
  hooks/
    use-session-guard.ts # verify-on-mount + periodic + on-focus re-check
  lib/
    auth.ts              # scrypt hashing, session tokens, seed accounts
    session-store.ts     # tab-scoped sessionStorage helpers
    db.ts                # Prisma client
public/
  Maha_Logo.jpeg         # Maharashtra Forest Department logo
```

## 🔐 How the tab-scoped login works

1. The user signs in with Username + Password.
2. The server validates the credentials (scrypt) and creates a `Session` row
   with a random 256-bit token.
3. The token is stored in **`sessionStorage`** — scoped to the *current
   browser tab only* (NOT localStorage, NOT cookies).
4. On every load, the `useSessionGuard` hook immediately calls
   `GET /api/auth/me` with the token. If the server says invalid/expired, the
   user is forced back to the login screen.
5. Opening the same URL in a **new tab** → `sessionStorage` is empty → the
   login screen appears again. ✅

## ☁️ Deploying (Vercel)

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new> and import the repo.
3. Add `DATABASE_URL`, `SEED_USER_PASSWORD`, and `SEED_ADMIN_PASSWORD` as
   deployment environment variables (or point the database at a real
   Postgres/MySQL instance by changing `prisma/schema.prisma`).
4. Deploy. Vercel will run `next build` automatically.
5. The seed accounts are created on first request to `/api/auth/login`.

> Note: the embedded dashboard URL points to
> `https://gondiaforestdivisiongisdashboard.vercel.app/`. To use a different
> dashboard, change the `DASHBOARD_URL` constant in `src/app/page.tsx`.

## Publishing to GitHub

Before pushing this repository, rotate the seed account passwords and any
credentials that have ever been committed. The current `.env` is ignored and
`.env.example` contains placeholders, but earlier commits include `.env` and
login credentials in the README. Removing those files from the latest version
does not remove them from Git history. Use a private repository unless public
release is approved.

After rotating the credentials, create an empty repository on GitHub, review
the files to be included, then push the existing Git history:

```bash
git status --short
git add -A
git diff --cached --name-only
git commit -m "Prepare project for GitHub"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

If an `origin` remote is already configured, keep it or update it instead of
adding it again. Do not add `.env`; keep local secrets in the ignored file and
set deployment secrets in the hosting provider.

## 📝 License

Internal use — Gondia Forest Division, Maharashtra Forest Department.
