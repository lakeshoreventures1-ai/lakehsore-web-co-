import { Router } from "express";
import { requireAdmin } from "../lib/auth.js";
import { onboardBusiness } from "../lib/onboarding.js";

export const onboardRouter = Router();

/**
 * POST /api/onboard  (admin only)
 * Body: { businessName, phone, website?, email? }
 *
 * Manual onboarding for clients who pay outside Stripe checkout. Paying
 * customers who use the self-serve checkout are onboarded automatically by
 * the Stripe webhook instead.
 */
onboardRouter.post("/api/onboard", requireAdmin, async (req, res) => {
  const { businessName, phone, website, email } = req.body ?? {};

  if (!businessName || !phone) {
    return res.status(400).json({ error: "businessName and phone are required." });
  }

  try {
    res.json(await onboardBusiness({ businessName, phone, website, email }));
  } catch (err) {
    console.error("[onboard] failed:", err);
    res.status(500).json({ error: "Onboarding failed", detail: String(err.message ?? err) });
  }
});
