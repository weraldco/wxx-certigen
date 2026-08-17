# CertiGen

CertiGen connects Google Forms to a certificate workflow. Teams can configure a program, map participant fields, choose a guided certificate template, publish a cohort, and receive form submissions through a secure webhook.

## Current status

Implemented:

- Magic-link authentication with Supabase Auth
- Organization, program, cohort, recipient, and credential schema
- Row-level security and organization roles
- Guided certificate templates
- Transactional and idempotent Google Forms ingestion
- Automatic or review-based enrollment approval
- Durable issuance job records
- Public credential verification at `/verify/[id]`

Not yet implemented:

- Background worker for PDF generation
- QR-code generation and private PDF storage
- Email delivery and provider event handling
- Recipient review, revocation, and reissue dashboard screens

## Requirements

- Node.js 22.17 or newer
- A Supabase project
- A publicly deployed HTTPS URL for Google Apps Script integration

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Provide these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit `.env.local`.

## Database setup

Open the Supabase SQL Editor and apply every file in `supabase/migrations` in filename order:

1. `202607230001_mvp_foundation.sql`
2. `202607240001_publish_cohort.sql`

The first migration creates the domain tables, indexes, RLS policies, ingestion function, and verification function. The second adds authenticated cohort publishing.

## Authentication setup

In Supabase, open **Authentication → URL Configuration**.

For local development, set:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

For production, add:

```text
https://your-domain.com/auth/callback
```

Use your deployed domain as the Site URL in production.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. You will be redirected to `/login` to request a magic link.

## Publishing a cohort

1. Complete the five-step setup wizard.
2. Connect a Google Form URL and map its name and email questions.
3. Choose a certificate template and configure the email copy.
4. Select **Publish workflow**.
5. Save the displayed `CERTIGEN_URL`, `COHORT_ID`, and `WEBHOOK_SECRET`.

The webhook secret is displayed only in the current browser session. CertiGen stores its SHA-256 hash, not the original value.

## Google Forms setup

Open the Google Form, select **More → Script editor**, and follow `public/google-forms-setup.md`.

After adding the script:

1. Open **Triggers** in Google Apps Script.
2. Add a trigger for `sendToCertigen`.
3. Select **From form** as the event source.
4. Select **On form submit** as the event type.
5. Authorize the requested permissions.
6. Submit a test response and inspect **Apps Script → Executions**.

The Apps Script does not need to be deployed as a web app. The CertiGen application does need a public HTTPS deployment. Google servers cannot call `http://localhost:3000`.

## Credential issuance worker

`POST /api/jobs/process-issuance` renders queued certificates to PDF, generates a verification QR code, uploads the PDF to a private Supabase Storage bucket, and creates the `credentials` row. It is protected by a bearer token:

```
Authorization: Bearer <CRON_SECRET>
```

This project is on the Vercel Hobby plan, where native Vercel Cron only runs once per day — too infrequent for issuance. Instead, use an external scheduler to call the route roughly every minute, for example a free [cron-job.org](https://cron-job.org) job configured as:

- URL: `https://<your-deployment>/api/jobs/process-issuance`
- Method: POST
- Schedule: every minute
- Header: `Authorization: Bearer <your CRON_SECRET value>`

If this project later moves to a Vercel plan that supports per-minute Cron, replace the external scheduler with a `crons` entry in `vercel.json` targeting the same route — no code changes are needed.

## Deployment

Deploy the Next.js application to Vercel or another Node.js-compatible host.

1. Add all environment variables listed in `.env.example` to the hosting provider.
2. Add the production `/auth/callback` URL to Supabase.
3. Deploy the application.
4. Publish cohorts from the deployed application so `CERTIGEN_URL` contains the public domain.

## Data flow

1. Publishing creates a versioned cohort and hashes its webhook secret.
2. Google Apps Script posts each form response to `/api/google-forms/webhook`.
3. PostgreSQL validates the secret, deduplicates the response, and normalizes the recipient in one transaction.
4. The enrollment is approved automatically or held for review.
5. Approved enrollments create an idempotent issuance job.
6. Public verification exposes only safe credential fields and never recipient email addresses or form feedback.

## Commands

```bash
npm run dev        # Start development server
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript
npm run build      # Create production build
npm run start      # Start production server
```
