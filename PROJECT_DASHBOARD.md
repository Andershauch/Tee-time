# Tee-time

_First audited: 2026-08-09 (as a pre-code planning package) · Rewritten: 2026-08-22_

> **This file was rewritten from scratch.** The 2026-08-09 dashboard described a project consisting only of planning documents. That structure no longer exists — `Docs/` and `Media/` are gone, along with `MASTER_PLAN.md`, `PRODUCT_VISION.md`, `PHASE_1`–`PHASE_5.md`, `CODEX_REVIEW.md`, `IDEAS_BACKLOG.md` and `CLAUDE_DESIGN.md`, and the previous dashboard went with them. The project was rebuilt around a new plan (`docs/Tee-Time-Codex-Byggeplan.md`) with a different architecture. Findings from the old audit are noted below where they were resolved.

_Reconfirmed 2026-08-25: unchanged. The only commit since the last audit is the workspace-wide hygiene pass of 2026-08-22 (`.gitattributes`, and `.gitignore` where needed) — no source file was touched, and the CRLF noise that dominated previous `git status` output in this repo is now gone. Findings below stand._

## Summary
A Danish, mobile-first ordering app for a golf club restaurant. Guests order to the course, the clubhouse or the terrace; staff approve and then process the order. Pre-ordering and fast pickup, not table reservation. Guests get no account and no email — they receive a personal status link instead. The restaurant gets one operational email per server-confirmed order.

## Current Status
Went from zero code to phases 0–5 established in a single day (2026-08-14), then deployed to Vercel. Guests can create real, server-validated orders with personal status links; staff and admin can process orders and manage the menu from protected tablet routes. Phase 5 added a transactional Brevo outbox with retry, conservative PWA offline behaviour, security headers and release documentation. A production pilot is still waiting on an approved retention policy and real production environment variables.

Menu and offers currently read from a **non-production** Neon branch, and `db:migrate` explicitly refuses to run when `DEPLOYMENT_ENV=production`.

## Completion Estimate
~70% (assumption — measured against the project's own build plan and its stated pilot criteria, not against the abandoned 5-phase plan the previous audit used). The functional application is largely built and tested. What remains is the production-readiness band: real environment variables, a retention policy sign-off, production assets, and the cron cadence problem noted below. The jump from ~8% is real, but it measures against a different plan, so the two numbers are not directly comparable.

## Last Significant Changes
Three commits. `547af0f` "Initial Tee-time demo" is essentially the whole application — routes for menu, cart, checkout, order confirmation, guest status, order history and reorder; API routes for orders, staff order handling, staff sessions and admin catalog; a staff console, a menu admin, a PWA manifest, an offline page, a data-protection page, and an access-denied page. `c980408` and `12f7737` configured the Vercel deployment and demo preview retry.

The `.git` history is short because the project was rebuilt, not evolved — the planning-phase work has no commits because it predated version control.

`git status` is effectively clean: 1 changed line, zero real changes ignoring whitespace, no untracked files.

## Current Architecture
Next.js (App Router) + React + TypeScript, Tailwind, deployed on Vercel. **Neon Postgres with Drizzle, and Neon Auth** for staff/admin accounts — a deliberate change from the previously documented Supabase direction. Transactional email via **Brevo**, using an outbox pattern: committing an order writes one `email_outbox` row with a stable idempotency key inside the same Neon transaction, and the Brevo call happens only after commit, so a Brevo failure can never alter order status or the guest's receipt. `BREVO_DELIVERY_MODE` is a three-state switch (`disabled` / `sandbox` / `live`) that fails safe to `disabled` on any unknown value. Vercel Cron drives `/api/internal/email-retry` behind a `CRON_SECRET`, with locking, five retries and increasing backoff.

Roles live in server-validated `staff_profiles`, and `staff` can never perform menu-admin actions. Test accounts are read only from `.env.local` and provisioned by a script — no passwords in the repository. Quality gates: `lint`, `typecheck`, `test` (Vitest), `build`, plus `test:e2e` (Playwright).

## Resolved since the 2026-08-09 audit
- **Six open product decisions** — resolved and recorded in `docs/DECISIONS.md` with dates and consequences, including payment, guest email, staff roles, and a 30-day anonymisation policy for customer data.
- **`git init`** — done.
- **Stock image licensing** — resolved, and the answer was better than the question assumed: all images are AI-generated demo assets from Hansen-Djurhuus with no third-party rights attached. `docs/assets-and-licensing.md` records this and specifies what must happen before production.
- **Missing `AGENTS.md`** — created.
- **Phase 1 prototype** — overtaken by events; the project went straight to a working application.

## Outstanding Tasks

**High**
- [ ] Fix the email retry cadence before any real pilot. Why: `docs/RELEASE.md` states that on Vercel Hobby the cron runs **daily at 03:00 UTC**, and that it must be changed to every five minutes on a plan that supports it before operational launch. A restaurant notification that can be delayed up to 24 hours is not a notification. This is written down but not yet acted on. Complexity: low (a plan change), but it is a hard gate. Dependencies: a paid Vercel plan or an alternative job platform.
- [ ] Get the retention policy approved and the production environment variables set. Why: the README names these as the two things holding back a production pilot. The 30-day anonymisation decision exists in `DECISIONS.md`; what is missing is sign-off and the restaurant's actual legal details in the data-protection page. Complexity: low technically. Dependencies: the restaurant.

**Medium**
- [ ] Move Brevo ownership to the restaurant. Why: `RELEASE.md` §"Brevo: sikker opsætning" step 1 says the account should be owned by the restaurant, not a private developer account — a good call that gets progressively harder to unwind after launch. Complexity: low. Dependencies: the restaurant creating the account.
- [ ] Replace the AI-generated demo assets with approved production images, and record rights holder, source, usage scope and any expiry per asset. Why: `assets-and-licensing.md` specifies exactly this as a pre-production step. Complexity: low. Dependencies: the restaurant supplying real photography.
- [ ] Resolve the three open decisions listed at the foot of `DECISIONS.md`: how the shared account is administered and rotated, the exact restaurant address / sender domain / Brevo configuration, and the final image strategy. Complexity: low. Dependencies: the restaurant.

**Low**
- [ ] Accept and document the at-least-once email guarantee operationally. Why: `RELEASE.md` is honest that a timeout after Brevo may have been accepted without the app knowing, so staff must be able to handle a rare duplicate email. That expectation currently lives only in a developer document. Complexity: trivial. Dependencies: none.
- [x] ~~Add `.gitattributes`~~ — done 2026-08-22 as part of the workspace-wide hygiene pass.

## Technical Debt
Low, and mostly deliberate:

- The email retry cadence is knowingly wrong for production and documented as such.
- Demo assets stand in for production imagery, documented as such.
- The abandoned planning package leaves the project with no written record of *why* the architecture moved from Supabase to Neon + Brevo. `DECISIONS.md` records that it did, and the consequence, but not the reasoning. Given that Ready! made the same Brevo choice a week earlier for concrete reasons, the connection is probably worth writing down.

## Bugs
None identified. This was a read-only review with nothing executed. Note the project has real test coverage (Vitest unit tests plus Playwright e2e) and a `typecheck` gate, so a passing local run would be meaningful evidence — but it was not run here.

## Ideas
- The outbox pattern here is the most careful piece of engineering in the workspace: idempotency key inside the order transaction, provider call strictly after commit, three-state delivery mode that fails safe, secret-guarded retry route, and logging that deliberately excludes token, name, phone, email, notes and provider response. That last detail — logging only technical IDs and error codes — is a GDPR decision made at the logging layer rather than the policy layer, which is where it actually holds.
- `db:migrate` refusing `DEPLOYMENT_ENV=production` is the structural version of the problem Ready! has by convention (production and development sharing one database). Worth noting that the newer project learned the lesson the older one is still carrying.
- The rollback and environment tables in `RELEASE.md` are written for someone who will be tired and under pressure. That is the right audience for a runbook.

## Next Recommended Actions
1. Settle the cron cadence question, because it decides whether a pilot is possible at all — everything else on this list is preparation for a launch that a 24-hour notification delay would make pointless.
2. Get the retention policy approved and the restaurant's legal details into the data-protection page, since both are named as pilot blockers and neither requires code.
3. Have the restaurant create and own the Brevo account before it becomes load-bearing.
4. Swap the demo assets for real imagery with rights recorded, following the process already written in `assets-and-licensing.md`.
5. Write down why the architecture moved from Supabase to Neon + Brevo, while the reasoning is still recoverable.

The ordering puts the one technical gate first and then follows the project's own pre-production checklist. Notably, nothing on this list is a feature — the application appears to be functionally there, and every remaining item is either an operational decision or something only the restaurant can provide.
