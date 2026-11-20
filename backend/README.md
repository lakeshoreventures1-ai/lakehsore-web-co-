# CND Digital: Missed Call Text Back on autopilot

This service runs the whole business loop with no manual steps:

```
 find leads ─► personalized demo page + cold email ─► prospect opens demo (you get a "hot lead" alert)
                                                              │
     weekly "calls we saved you" email ◄── live in minutes ◄── clicks "Start free 30 days" ─► Stripe checkout
                                                 ▲
             scrape site ─► AI writes their text ─► buy Twilio number ─► email forwarding code
```

| Piece | What it does | Where |
|---|---|---|
| **Personalized demos** | For each lead: scrapes their website, has Claude write *their* missed-call text + a realistic sample conversation, and publishes a private page at `/demo/<slug>` with a lost-revenue calculator and a trial button. | `lib/prospects.js`, `lib/demoPage.js` |
| **Cold email engine** | Claude writes a short, specific email per lead linking to their demo. Optional autopilot sends them (daily cap, weekdays only) plus one 3-day follow-up, with one-click unsubscribe and your postal address (CAN-SPAM). | `lib/prospects.js`, `scripts/prospect.js` |
| **Hot-lead alerts** | The first time a real person opens a demo, you get an email: the best moment to call them. | `routes/demo.js` |
| **Self-serve checkout** | Stripe Checkout subscription, 30-day free trial, card up front. Works from demo pages and from `start.html` on the site. | `routes/billing.js` |
| **Zero-touch onboarding** | When checkout completes: provisions a Twilio number, reuses the exact text they saw on their demo, emails them carrier forwarding codes. | `lib/onboarding.js` |
| **AI receptionist** | Missed call ➜ instant text ➜ Claude carries the SMS conversation as the business. | `routes/webhooks.js` |
| **Retention** | Monday email to each client: "N missed callers got your text this week, M replied." | `lib/reports.js` |
| **Cancellation** | Subscription cancelled ➜ service off, Twilio number released (stops the $1/mo). | `routes/billing.js` |

## Unit economics (per client, monthly)

| | |
|---|---|
| Price | $249 |
| Twilio number | ~$1.15 |
| SMS (~150 segments) | ~$2 |
| Claude API (receptionist replies) | ~$1–5 |
| Stripe fees | ~$7.50 |
| **Gross margin** | **~$230 (≈ 92%)** |

Hosting is a flat ~$8/mo total. 20 clients ≈ $4.6k/mo; 100 clients ≈ $23k/mo.
These are cost estimates at current list prices, not promises of revenue.

## Setup (one-time, ~1 hour)

1. **Accounts:** Anthropic API key, Twilio (upgrade from trial), Stripe, Resend
   (verify `cnddigital.org` as a sending domain).
2. **Stripe:** create a product "Missed Call Text Back", recurring **$249/month**;
   copy its `price_...` ID.
3. **Deploy:** on Render choose *New → Blueprint* and pick this repo (uses `/render.yaml`).
   Fill in the secret values. Set `PUBLIC_BASE_URL` to the Render URL.
4. **Stripe webhook:** add endpoint `<PUBLIC_BASE_URL>/webhooks/stripe` with events
   `checkout.session.completed` and `customer.subscription.deleted`; put its secret in
   `STRIPE_WEBHOOK_SECRET`.
5. **Website:** set `window.CND_API` in `/js/config.js` to the backend URL and push.
   The "Start My Free 30 Days" button on the site goes live.
6. **Twilio A2P 10DLC:** register your brand + campaign in the Twilio console
   (required for business SMS in the US; takes a few days to be approved).

## Daily use

Generate demos for a list of leads (CSV header: `businessName,website,phone,email,firstName,city`):

```bash
cd backend
npm run prospects -- leads.csv           # writes outreach-<time>.csv with every demo link + email
npm run prospects -- leads.csv --send    # also sends the first email now
```

Run the CLI on the server, or point it at the same `DATA_DIR`, so the server can find the demo pages.

Or via the API (all admin endpoints need `Authorization: Bearer $ADMIN_TOKEN`):

```bash
curl -X POST $URL/api/prospects -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"businessName":"Sure Flow Plumbing","website":"https://sureflow.com","phone":"9205551234","email":"dan@sureflow.com","firstName":"Dan","city":"Green Bay"}'
```

To go fully hands-off, set `OUTREACH_AUTOSEND=1`: every hour on weekdays 9am–4pm it
sends new prospects their email (up to `OUTREACH_DAILY_LIMIT`/day) and a single
follow-up 3 days later to anyone who hasn't bought or unsubscribed.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/demo/:slug` | public | Personalized demo page |
| GET | `/unsubscribe` | signed link | One-click unsubscribe |
| POST | `/api/checkout` | public | Start Stripe checkout (`{slug}` or `{businessName, phone, website, email}`) |
| POST | `/webhooks/stripe` | Stripe signature | Auto-onboard / cancel |
| POST | `/webhooks/twilio/voice`, `/sms` | Twilio signature | Missed call text + AI replies |
| POST | `/api/prospects` | admin | Generate one demo + email |
| GET | `/api/prospects` | admin | Pipeline: status, views |
| POST | `/api/prospects/:slug/send` | admin | Send email now (`{"followUp":true}` for follow-up) |
| POST | `/api/outreach/run` | admin | Run one outreach pass now |
| POST | `/api/onboard` | admin | Manually onboard (for clients paying outside Stripe) |
| GET | `/api/clients` | admin | Paying clients |
| POST | `/api/reports/send` | admin | Send weekly reports now |

## Before scaling past ~50 clients

- **Storage** is a JSON file on a persistent disk. Move to Postgres/SQLite for
  concurrent writes and backups.
- **Email deliverability:** send cold email from a *separate* domain
  (e.g. `trycnddigital.com`) warmed up over 2–3 weeks, so your main domain's
  reputation stays clean. Keep daily volume modest.
- **Caller ID on forwarded calls** varies by carrier. Test with each client's carrier.
- Booking integration (Calendly tool for the AI receptionist) is a natural upsell.
