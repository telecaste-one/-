
# CORE.PT 予約システム

Personal-training reservation system for CORE.PT, implemented from the
`予約システム.dc.html` Claude Design handoff (see `../README.md`,
`../chats/chat1.md`, `../project/` at the repo root for the original design
spec and iteration history).

Two apps:

- **`/book`** — the customer booking app (course → date → time → trainer →
  customer info → confirm, with a one-active-reservation-at-a-time limit).
- **`/admin`** — the store admin app (slot on/off per trainer/date, upcoming
  reservations with session-complete, customer directory, trainer
  add/remove/photo).

## Stack

Next.js (App Router) + TypeScript, Prisma + **PostgreSQL** (via
`@prisma/adapter-pg`), nodemailer (SMTP), JWT-cookie admin auth (`jose`).

Postgres (not SQLite) is the datasource on purpose — this app is meant to run
on Vercel, whose serverless functions have no persistent filesystem, so a
SQLite file wouldn't survive between requests. Any Postgres works: Neon,
Vercel Postgres, Supabase, a self-hosted instance, etc.

## Local setup

Requires a local Postgres (or a connection string to a hosted one).

```bash
npm install
cp .env.example .env        # then edit DATABASE_URL etc. if needed
npx prisma migrate deploy   # create tables
npx prisma db seed          # trainers, admin user, sample customers/reservations
npm run dev
```

Visit `http://localhost:3000` for the landing page, `/book` for the customer
app, `/admin` for the store admin app.

## Deploying (Vercel + a hosted Postgres)

1. **Push this repo to GitHub** (this project currently has no remote — create
   a repo and `git push` it there first).
2. **Create a Postgres database.** Easiest options: [Neon](https://neon.tech)
   (free tier) or Vercel's own Postgres (Storage tab → Create Database →
   Postgres, in your Vercel project once it exists). Either way you end up
   with a `postgresql://...` connection string.
3. **Import the repo into Vercel** ([vercel.com/new](https://vercel.com/new)),
   pointing it at this `core-pt/` directory as the project root if the repo
   contains more than just this app.
4. **Set environment variables** in the Vercel project settings (Settings →
   Environment Variables) — copy every key from `.env.example`, using your
   real Postgres connection string, a freshly generated
   `ADMIN_SESSION_SECRET` (`openssl rand -base64 32`), a real admin password,
   and your SMTP credentials once you have them.
5. **Deploy.** The build runs `npm run vercel-build`
   (`prisma migrate deploy && next build`, see `package.json`), which creates
   the tables on first deploy automatically. Seeding is not automatic — after
   the first successful deploy, run `npx prisma db seed` once from your local
   machine with `DATABASE_URL` pointed at the production database (e.g. via
   `vercel env pull` to get the value), so the store has its initial trainers
   and admin login.
6. **Use it**: customers go to `https://<your-domain>/book`, the store logs
   into `https://<your-domain>/admin` with the admin credentials you set in
   step 4.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used only by `prisma/seed.ts` to create the store admin login. Change the password and re-seed before going live. |
| `ADMIN_SESSION_SECRET` | Signs the admin session cookie (JWT). Set a long random value in production. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Real email delivery for the booking-confirmation emails. Until these are filled in, bookings still succeed — the email content is shown as an in-app "未送信" preview instead of being sent (see `lib/mail.ts`). |
| `MAIL_FROM` | From address for outgoing mail. |
| `STORE_EMAIL` | Where the "new booking" notification email is sent. |

## What's real vs. simplified

This is a working full-stack app (real DB, real server-side validation, real
session auth), but a few things are intentionally out of scope for this pass
— flagged here rather than silently left half-done:

- **Payments** — course prices are displayed but no payment is actually
  collected. Adding Stripe (or similar) for the course purchase step is the
  natural next step.
- **Ticket balance model** — `Customer.remaining` reflects the most recently
  booked course's remaining count (matches the original design). It doesn't
  track a running balance across multiple course purchases over time — that
  would need an explicit "buy a new pass" flow, which the design doesn't have
  yet either.
- **Customer identity** — customers aren't accounts; they're identified by
  email. The "one active reservation at a time" rule is enforced
  server-side by email, and the customer-side banner is tracked via a
  `localStorage` reservation id (see `app/book/BookingApp.tsx`). A customer
  switching devices/browsers won't see their banner, but the server-side
  restriction still applies.
- **Live sync** is polling-based (every 6s, plus on window focus), not
  websockets — simplest thing that satisfies the "admin toggles a slot off →
  customer app reflects it" requirement from the design.

## Project layout

```
app/book/            customer booking app (client component + page)
app/admin/            store admin app (client component + page), login page
app/api/public/       unauthenticated endpoints the booking app calls
app/api/admin/        session-gated endpoints the admin app calls
lib/                  shared logic: Prisma client, slot-availability rules
                      (lib/slotGrid.ts is isomorphic — same rules run in the
                      browser for optimistic UI and on the server for
                      validation), auth, mail, plans/constants/dates
prisma/schema.prisma   Trainer / SlotOverride / Customer / Reservation / AdminUser
prisma/seed.ts         seed data matching the design's sample trainers/customers
proxy.ts               redirects unauthenticated /admin/* page requests to
                        /admin/login (API routes re-check the session
                        themselves — see lib/adminGuard.ts)
```
