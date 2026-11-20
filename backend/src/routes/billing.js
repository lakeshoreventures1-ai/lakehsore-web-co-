import express, { Router } from "express";
import { stripe, checkoutEnabled } from "../lib/stripe.js";
import { getProspect, updateProspect, findClient, updateClient, getMeta, setMeta } from "../lib/store.js";
import { onboardBusiness } from "../lib/onboarding.js";
import { releaseNumber } from "../lib/twilio.js";
import { notifyAdmin } from "../lib/notify.js";

export const billingRouter = Router();

const siteUrl = () => process.env.SITE_URL || "https://cnddigital.org";
const trialDays = () => Number(process.env.TRIAL_DAYS ?? 30);

/** Let the static marketing site (different origin) call /api/checkout. */
billingRouter.use("/api/checkout", (req, res, next) => {
  res.set("Access-Control-Allow-Origin", siteUrl());
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/**
 * POST /api/checkout
 * Body: { slug } from a demo page, or { businessName, phone, website, email }
 * from the website's signup form. Returns { url } for Stripe Checkout:
 * a subscription with a free trial, card collected up front.
 */
billingRouter.post("/api/checkout", express.json(), async (req, res) => {
  if (!checkoutEnabled()) return res.status(503).json({ error: "Checkout is not configured." });

  const body = req.body ?? {};
  const prospect = body.slug ? getProspect(body.slug) : null;
  const businessName = prospect?.businessName ?? body.businessName;
  const phone = prospect?.phone ?? body.phone;
  const website = prospect?.website ?? body.website;
  const email = prospect?.email ?? body.email;

  if (!businessName) return res.status(400).json({ error: "businessName is required." });

  const clip = (v) => (v ? String(v).slice(0, 450) : "");
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: trialDays() > 0 ? { trial_period_days: trialDays() } : undefined,
      payment_method_collection: "always",
      customer_email: email || undefined,
      // Ask for the business phone in checkout if we don't already have it.
      phone_number_collection: { enabled: !phone },
      allow_promotion_codes: true,
      metadata: {
        businessName: clip(businessName),
        phone: clip(phone),
        website: clip(website),
        slug: clip(body.slug),
      },
      success_url: `${siteUrl()}/welcome.html`,
      cancel_url: prospect ? prospect.demoUrl : `${siteUrl()}/start.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed:", err);
    res.status(500).json({ error: "Could not start checkout." });
  }
});

/**
 * POST /webhooks/stripe
 * checkout.session.completed      -> fully automatic onboarding + welcome email
 * customer.subscription.deleted   -> turn off service + release the Twilio number
 */
billingRouter.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, req.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  // Stripe retries on slow responses; acknowledge now and do the work after.
  res.json({ received: true });

  const processed = getMeta("stripeEvents") || [];
  if (processed.includes(event.id)) return;
  setMeta("stripeEvents", [...processed, event.id].slice(-500));

  try {
    if (event.type === "checkout.session.completed") await handleCheckoutCompleted(event.data.object);
    if (event.type === "customer.subscription.deleted") await handleCancelled(event.data.object);
  } catch (err) {
    console.error(`[stripe] ${event.type} failed:`, err);
    notifyAdmin(`ACTION NEEDED: ${event.type} failed`, `Event ${event.id}\n\n${err.stack || err}`);
  }
});

async function handleCheckoutCompleted(session) {
  const m = session.metadata || {};
  const email = session.customer_details?.email || session.customer_email;
  const phone = m.phone || session.customer_details?.phone;
  const prospect = m.slug ? getProspect(m.slug) : null;

  const result = await onboardBusiness({
    businessName: m.businessName,
    phone,
    website: m.website || null,
    email,
    stripe: { customerId: session.customer, subscriptionId: session.subscription },
    demo: prospect ? { profile: prospect.profile, persona: prospect.persona } : null,
  });

  if (prospect) updateProspect(m.slug, { status: "converted", convertedAt: new Date().toISOString() });

  notifyAdmin(
    `New customer: ${m.businessName}`,
    `${m.businessName} just started a trial and was onboarded automatically.\n\nEmail: ${email}\nPhone: ${phone}\nText-back number: ${result.twilioNumber}\n\nThey've been emailed their forwarding code. Nothing for you to do.`,
  );
}

async function handleCancelled(subscription) {
  const client = findClient((c) => c.stripeSubscriptionId === subscription.id);
  if (!client) return;
  updateClient(client.twilioNumber, { active: false, cancelledAt: new Date().toISOString() });
  await releaseNumber(client.twilioNumber);
  notifyAdmin(`Cancelled: ${client.businessName}`, `${client.businessName} cancelled. Service is off and ${client.twilioNumber} was released.`);
}
