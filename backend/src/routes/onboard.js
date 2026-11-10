import { Router } from "express";
import { scrapeWebsiteText } from "../lib/scrape.js";
import { extractBusinessProfile, generatePersona } from "../lib/claude.js";
import { provisionNumberForClient } from "../lib/twilio.js";
import { forwardingInstructions } from "../lib/forwarding.js";
import { saveClient } from "../lib/store.js";

export const onboardRouter = Router();

/**
 * POST /api/onboard
 * Body: { businessName, phone, website }
 *
 * Runs the whole pipeline: scrape -> extract profile -> generate persona ->
 * buy + configure a dedicated Twilio number -> save the client -> return
 * the forwarding instructions to hand to the client.
 */
onboardRouter.post("/api/onboard", async (req, res) => {
  const { businessName, phone, website } = req.body ?? {};

  if (!businessName || !phone) {
    return res.status(400).json({ error: "businessName and phone are required." });
  }

  try {
    const scrapedText = website ? await scrapeWebsiteText(website) : "";
    const profile = await extractBusinessProfile(businessName, scrapedText);
    const persona = await generatePersona({ businessName, phone, profile });

    const twilioNumber = await provisionNumberForClient(phone);

    saveClient(twilioNumber, {
      businessName,
      phone,
      website: website ?? null,
      profile,
      missedCallText: persona.missed_call_text,
      systemPrompt: persona.system_prompt,
      createdAt: new Date().toISOString(),
    });

    res.json({
      businessName,
      twilioNumber,
      missedCallText: persona.missed_call_text,
      forwarding: forwardingInstructions(twilioNumber),
    });
  } catch (err) {
    console.error("[onboard] failed:", err);
    res.status(500).json({ error: "Onboarding failed", detail: String(err.message ?? err) });
  }
});
