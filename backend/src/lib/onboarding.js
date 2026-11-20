import { scrapeWebsiteText } from "./scrape.js";
import { extractBusinessProfile, generatePersona } from "./claude.js";
import { provisionNumberForClient } from "./twilio.js";
import { forwardingInstructions } from "./forwarding.js";
import { saveClient } from "./store.js";
import { sendEmail, escapeHtml } from "./email.js";

/**
 * The full zero-touch onboarding pipeline, shared by the admin endpoint and
 * the Stripe webhook: scrape -> profile -> persona -> buy number -> save.
 * If a demo was already generated for this prospect, reuse its persona so the
 * customer gets exactly the text they saw on their demo page.
 */
export async function onboardBusiness({ businessName, phone, website, email, stripe, demo }) {
  let profile = demo?.profile;
  let persona = demo?.persona;

  if (!profile || !persona) {
    const scrapedText = website ? await scrapeWebsiteText(website) : "";
    profile = await extractBusinessProfile(businessName, scrapedText);
    persona = await generatePersona({ businessName, phone, profile });
  }

  const twilioNumber = await provisionNumberForClient(phone);

  saveClient(twilioNumber, {
    businessName,
    phone,
    website: website ?? null,
    email: email ?? null,
    profile,
    missedCallText: persona.missed_call_text,
    systemPrompt: persona.system_prompt,
    active: true,
    stripeCustomerId: stripe?.customerId ?? null,
    stripeSubscriptionId: stripe?.subscriptionId ?? null,
    createdAt: new Date().toISOString(),
  });

  const forwarding = forwardingInstructions(twilioNumber);

  if (email) {
    await sendWelcomeEmail({ email, businessName, missedCallText: persona.missed_call_text, forwarding });
  }

  return { businessName, twilioNumber, missedCallText: persona.missed_call_text, forwarding };
}

async function sendWelcomeEmail({ email, businessName, missedCallText, forwarding }) {
  const carriers = { verizon: "Verizon", att: "AT&T", tmobile: "T-Mobile", sprint: "Sprint / other" };
  const lines = Object.entries(forwarding.by_carrier)
    .map(([k, v]) => `${carriers[k] ?? k}: ${v}`)
    .join("\n");

  const text = [
    `You're live, ${businessName}!`,
    "",
    "One last 30-second step: turn on 'forward when unanswered' so missed calls reach your text-back line.",
    "From your business phone, dial the code for your carrier:",
    "",
    lines,
    "",
    forwarding.voip_note,
    "",
    forwarding.note,
    "",
    "Here's the text your missed callers will get:",
    `"${missedCallText}"`,
    "",
    "Test it: call your business line from another phone and don't answer. You'll get the text within seconds.",
    "",
    "Questions? Just reply to this email.",
    "- CND Digital",
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#1d2b2e">
<h2>You're live, ${escapeHtml(businessName)}!</h2>
<p>One last 30-second step: turn on <strong>forward when unanswered</strong> so missed calls reach your text-back line. From your business phone, dial the code for your carrier:</p>
<ul>${Object.entries(forwarding.by_carrier)
    .map(([k, v]) => `<li><strong>${escapeHtml(carriers[k] ?? k)}:</strong> ${escapeHtml(v)}</li>`)
    .join("")}</ul>
<p style="color:#555">${escapeHtml(forwarding.voip_note)}</p>
<p style="color:#555">${escapeHtml(forwarding.note)}</p>
<p>Here's the text your missed callers will get:</p>
<blockquote style="border-left:3px solid #2bb3a3;margin:0;padding:8px 14px;background:#f2faf9">${escapeHtml(missedCallText)}</blockquote>
<p><strong>Test it:</strong> call your business line from another phone and don't answer. You'll get the text within seconds.</p>
<p>Questions? Just reply to this email.<br>- CND Digital</p></div>`;

  await sendEmail({ to: email, subject: `You're live: finish your Missed Call Text Back setup (30 sec)`, text, html });
}
