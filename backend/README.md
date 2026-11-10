# CND Digital — Missed Call Text Back onboarding backend

Separate from the static marketing site (`index.html` etc. one level up, which
stays a plain GitHub Pages site with no backend). This is a small Node/Express
service that automates onboarding a new client onto the Missed Call Text Back
product:

1. **Scrape** the client's website for hours, services, service area, tone, FAQs.
2. **Generate** (via Claude) the first auto-text and a persona/system prompt the
   AI receptionist uses for any follow-up SMS conversation.
3. **Provision** a dedicated Twilio number for that client, with its voice and
   SMS webhooks pointed at this service.
4. **Hand back** carrier-specific instructions for the client to forward their
   *existing* number to the new Twilio number only when a call goes unanswered
   — their current phone line, voicemail, and everything else about it is
   untouched.

At runtime: an unanswered call on the client's real line forwards to their
dedicated Twilio number → this service's `/webhooks/twilio/voice` fires →
it immediately texts the caller back as the business → any reply the caller
sends hits `/webhooks/twilio/sms`, which uses Claude (with that business's
generated persona + the live conversation) to keep the conversation going.

## Why each client gets their own Twilio number

Multiple clients' calls land on this one service. The only way to tell which
business an inbound call/text belongs to is the Twilio number it arrived on
(`To`), so onboarding buys a fresh number per client rather than sharing one.
At ~$1/month per number this is cheap relative to the $197/mo you're charging.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
```

You need:
- An **Anthropic API key** (console.anthropic.com) — separate from Claude Code,
  this is for the backend's own Claude API calls.
- A **Twilio account** (twilio.com) with its Account SID + Auth Token from the
  console. No need to buy a number yourself first — onboarding buys one
  per client automatically.

## Deploying

This needs to run on an always-on host that Twilio can reach — **not** GitHub
Pages (static only). Render, Fly.io, or Railway all work with a free/cheap
tier. Once deployed:

1. Set `PUBLIC_BASE_URL` in your host's environment to the deployed URL
   (e.g. `https://cnd-onboarding.onrender.com`) — the webhooks Twilio calls
   are built from this.
2. `npm start`

## Running locally

```bash
npm run dev
```

Twilio webhooks need a public URL even in development — use a tunnel (e.g.
`ngrok http 3000`) and set `PUBLIC_BASE_URL` to the tunnel's `https://` URL
before onboarding a test client, since that URL gets baked into the number's
webhook config at purchase time.

## API

**`POST /api/onboard`**
```json
{ "businessName": "Sure Flow Plumbing", "phone": "9205551234", "website": "https://sureflowplumbing.com" }
```
Returns the new Twilio number, the generated missed-call text, and
carrier-by-carrier forwarding instructions to send the client.

**`GET /api/clients`** — lists onboarded clients (for your own reference; no auth yet — see below).

**`POST /webhooks/twilio/voice`** / **`POST /webhooks/twilio/sms`** — Twilio-only, configured automatically per number during onboarding.

## Known gaps (fine for a first few clients, fix before scaling)

- **Storage** is a flat JSON file (`data/clients.json`). Move to a real
  database (Postgres, SQLite, etc.) once you have more than a handful of
  clients or need concurrent-write safety.
- **No auth** on `/api/onboard` or `/api/clients` — add a shared secret or
  real auth before exposing this publicly, so a stranger can't onboard fake
  clients on your Twilio bill.
- **Caller-ID on forwarded calls** can vary by carrier — most pass the
  original caller's number through correctly, but test with each client's
  actual carrier before relying on it.
- **No Calendly/booking integration yet** — the AI receptionist can discuss
  hours/services but can't book a call itself. A natural next step: give
  Claude a tool that calls the Calendly API to check/book availability
  (same API already wired up elsewhere in this project).
