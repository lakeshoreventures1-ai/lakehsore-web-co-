import { Router } from "express";
import { requireAdmin } from "../lib/auth.js";
import { getProspect, updateProspect, listProspects, unsubscribe } from "../lib/store.js";
import { createProspect, sendProspectEmail, unsubscribeToken } from "../lib/prospects.js";
import { renderDemoPage } from "../lib/demoPage.js";
import { notifyAdmin } from "../lib/notify.js";
import { checkoutEnabled } from "../lib/stripe.js";

export const demoRouter = Router();

/** Public: a prospect's personalized demo page. First view pings the owner (hot lead). */
demoRouter.get("/demo/:slug", (req, res) => {
  const prospect = getProspect(req.params.slug);
  if (!prospect) return res.status(404).send("This page doesn't exist.");

  // Ignore link-preview bots so a view means a real person looked.
  const bot = /bot|crawl|spider|preview|slurp|facebookexternalhit|curl/i.test(req.get("user-agent") || "");
  if (!bot) {
    const views = (prospect.views || 0) + 1;
    updateProspect(req.params.slug, { views, lastViewedAt: new Date().toISOString() });
    if (views === 1) {
      notifyAdmin(
        `Hot lead: ${prospect.businessName} opened their demo`,
        `${prospect.businessName} just viewed their demo page.\n\nPhone: ${prospect.phone || "?"}\nEmail: ${prospect.email || "?"}\nSite: ${prospect.website || "?"}\nDemo: ${prospect.demoUrl}\n\nA quick call in the next hour is your best shot at closing them.`,
      );
    }
  }

  res.set("Cache-Control", "no-store");
  res.send(
    renderDemoPage({
      slug: req.params.slug,
      prospect,
      checkoutEnabled: checkoutEnabled(),
      calendlyUrl: process.env.CALENDLY_URL,
    }),
  );
});

/** Admin: generate one prospect's demo + email draft. */
demoRouter.post("/api/prospects", requireAdmin, async (req, res) => {
  try {
    res.json(await createProspect(req.body ?? {}));
  } catch (err) {
    console.error("[prospects] failed:", err);
    res.status(400).json({ error: String(err.message ?? err) });
  }
});

/** Admin: pipeline overview. */
demoRouter.get("/api/prospects", requireAdmin, (_req, res) => {
  const rows = Object.entries(listProspects()).map(([slug, p]) => ({
    slug,
    businessName: p.businessName,
    email: p.email,
    status: p.status,
    views: p.views,
    demoUrl: p.demoUrl,
    subject: p.outreach?.subject,
  }));
  res.json(rows);
});

/** Admin: send a prospect's email now (manual mode). */
demoRouter.post("/api/prospects/:slug/send", requireAdmin, async (req, res) => {
  try {
    res.json(await sendProspectEmail(req.params.slug, { followUp: Boolean(req.body?.followUp) }));
  } catch (err) {
    res.status(400).json({ error: String(err.message ?? err) });
  }
});

/** Public: one-click unsubscribe from outreach. */
demoRouter.get("/unsubscribe", (req, res) => {
  const { e: email, t } = req.query;
  if (!email || t !== unsubscribeToken(email)) return res.status(400).send("Invalid unsubscribe link.");
  unsubscribe(email);
  for (const [slug, p] of Object.entries(listProspects())) {
    if (p.email && p.email.toLowerCase() === String(email).toLowerCase()) updateProspect(slug, { status: "unsubscribed" });
  }
  res.send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:40px 16px;text-align:center"><h2>You're unsubscribed.</h2><p>You won't get any more emails from us. Sorry for the bother.</p></body>`);
});
