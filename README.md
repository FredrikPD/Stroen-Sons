# Strøen Søns

Private club platform for member communication, events, media, and finance operations.

## Overview

Strøen Søns is a Next.js application used to run day-to-day club workflows:

- member dashboard with upcoming events, invoices, and activity
- posts/news and event publishing
- photo gallery with uploads
- membership and role management
- balance, transactions, and invoice/payment request handling
- admin tools for finance and system configuration
- email + push notifications, plus PWA/offline support

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** PostgreSQL + Prisma
- **Auth:** Clerk
- **File uploads:** UploadThing
- **Email:** Resend
- **Styling/UI:** Tailwind CSS v4, Sonner toasts
- **Hosting:** Vercel (cron jobs configured in `vercel.json`)

## Project Structure

```text
src/
  app/                  # App Router pages, layouts, API routes
    (auth)/             # Sign-in and password recovery
    (protected)/        # Authenticated member and admin areas
    api/                # Server routes (cron, uploadthing, admin APIs, push)
  components/           # UI, layout, feature components
  server/               # DB client, auth guards, server actions, push/email logic
  lib/                  # Shared utilities and validators
prisma/
  schema.prisma         # Data model
  migrations/           # SQL migrations
scripts/                # Operational and utility scripts
public/                 # Static assets + service worker
```

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database
- Clerk project (auth keys)
- UploadThing app/token (for media uploads)

## Environment Variables

Create a `.env` file in the project root.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Primary Prisma/Postgres connection used by the app |
| `CLERK_SECRET_KEY` | Yes | Clerk server-side auth key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk client key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in route (typically `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Sign-up route (typically `/sign-up`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | Redirect after sign-in (typically `/dashboard`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | Redirect after sign-up (typically `/dashboard`) |
| `UPLOADTHING_TOKEN` | Yes | UploadThing token for file upload endpoints |
| `CRON_SECRET` | Yes (prod) | Bearer secret for scheduled cron routes |
| `NEXT_PUBLIC_APP_URL` | Recommended | Absolute app URL used in email links |
| `RESEND_API_KEY` | Optional | Enables transactional email sending |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Public key for web push subscription |
| `VAPID_PRIVATE_KEY` | Optional | Private key for sending push signals |
| `VAPID_SUBJECT` | Optional | Web push contact, e.g. `mailto:team@example.com` |
| `PRISMA_MGMT_TOKEN` | Optional | Prisma Data Platform usage metrics in admin system view |
| `PRISMA_DATABASE_ID` | Optional | Database ID used with Prisma Management API |
| `DIRECT_URL` | Optional | Dev direct Postgres URL for maintenance scripts |
| `DIRECT_URL_PROD` | Optional | Prod direct Postgres URL for maintenance scripts |
| `DATABASE_URL_PROD` | Optional | Prod DB URL used by `scripts/db-push-prod.sh` |

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run database migrations locally:
   ```bash
   npx prisma migrate dev
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Scripts

### npm scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run pwa:vapid` - generate VAPID keys for push notifications

### utility scripts (manual/ops)

- `bash scripts/db-push-prod.sh` - push Prisma schema to production database URL
- `bash scripts/db-copy-db-dev2prod.sh` - refresh dev DB from prod while keeping selected local tables
- `npx tsx scripts/migrate-roles.ts` - migrate enum roles to dynamic `UserRole` records
- `npx tsx scripts/seed-members.ts` - create dummy member records

## Background Jobs (Cron)

Configured in `vercel.json`:

- `0 0 1 * *` -> `GET /api/cron/generate-fees`
- `0 9 * * *` -> `GET /api/cron/invoice-deadlines`

Both routes require:

```http
Authorization: Bearer <CRON_SECRET>
```

## Authentication and Authorization

- Clerk middleware protects all non-public routes.
- Member identity is synchronized to Prisma via `ensureMember()`.
- Admin permissions use:
  - legacy enum role checks (`Role.ADMIN`, etc.)
  - dynamic path-based roles (`UserRole.allowedPaths`)

## PWA and Push Notifications

- Service worker is registered in production only.
- Offline fallback route: `/offline`
- Push notifications are resolved via subscription endpoint `/api/push/latest-by-subscription`
- Use `npm run pwa:vapid` to generate VAPID key pair

## Deployment Notes

Recommended target is Vercel.

1. Configure all required environment variables in the deployment environment.
2. Ensure database migrations are applied for production (`npx prisma migrate deploy`).
3. Keep cron configuration aligned with `vercel.json`.
4. Confirm `NEXT_PUBLIC_APP_URL` points to the deployed domain.

## Known Gaps

- No automated test suite is configured yet (`npm test` is not defined).
- Email features are disabled when `RESEND_API_KEY` is missing.
- Push features are disabled when VAPID keys are missing.
