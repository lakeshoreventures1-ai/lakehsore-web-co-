import crypto from "crypto";
import { scrapeWebsiteText } from "./scrape.js";
import { generateDemo, writeOutreachEmail } from "./claude.js";
import { saveProspect, getProspect, updateProspect, isUnsubscribed, listProspects, getMeta, setMeta } from "./store.js";
import { sendEmail, escapeHtml } from "./email.js";

const base = () => process.env.PUBLIC_BASE_URL || "http://localhost:3000";

export function slugify(name) {
  const s = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  // short random suffix so demo URLs aren't guessable/enumerable
  return `${s || "biz"}-${crypto.randomBytes(3).toString("hex")}`;
}

function unsubSecret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_TOKEN || "dev-secret";
}

export function unsubscribeToken(email) {
  return crypto.createHmac("sha256", unsubSecret()).update(String(email).toLowerCase()).digest("hex").slice(0, 32);
}

export function unsubscribeUrl(email) {
  return `${base()}/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
}

/**
 * Scrape a prospect's site, generate their personalized demo + cold email,
 * and save it. Returns the saved prospect (with slug + demoUrl).
 */
export async function createProspect({ businessName, website, phone, email, firstName, city }) {
  if (!businessName) throw new Error("businessName is required");
  const slug = slugify(businessName);
  const demoUrl = `${base()}/demo/${slug}`;

  const scrapedText = website ? await scrapeWebsiteText(website) : "";
  const demo = await generateDemo({ businessName, phone: phone || "", scrapedText });
  const outreach = await writeOutreachEmail({ businessName, firstName, city, profile: demo.profile, demoUrl });

  const prospect = {
    businessName,
    website: website || null,
    phone: phone || null,
    email: email || null,
    firstName: firstName || null,
    city: city || null,
    niche: demo.niche,
    profile: demo.profile,
    persona: demo.persona,
    sampleConversation: demo.sampleConversation,
    outreach,
    demoUrl,
    status: "ready", // ready -> sent -> followed_up | converted | unsubscribed
    views: 0,
    createdAt: new Date().toISOString(),
  };
  saveProspect(slug, prospect);
  return { slug, ...prospect };
}

function footer(email) {
  const addr = process.env.PHYSICAL_ADDRESS || "";
  return {
    text: `\n\n--\n${process.env.SENDER_NAME || "Charlie"}\nCND Digital${addr ? "\n" + addr : ""}\n\nNot interested? One click and you won't hear from me again: ${unsubscribeUrl(email)}`,
    html: `<p style="color:#888;font-size:12px;margin-top:28px">${escapeHtml(process.env.SENDER_NAME || "Charlie")}, CND Digital<br>${escapeHtml(addr)}<br><a href="${unsubscribeUrl(email)}" style="color:#888">Unsubscribe</a></p>`,
  };
}

function toHtml(body) {
  return body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>").replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>`)
    .join("");
}

/** Send the first email or the follow-up for a prospect. Enforces CAN-SPAM basics. */
export async function sendProspectEmail(slug, { followUp = false } = {}) {
  const p = getProspect(slug);
  if (!p?.email) throw new Error("Prospect has no email");
  if (isUnsubscribed(p.email)) {
    updateProspect(slug, { status: "unsubscribed" });
    return { skipped: "unsubscribed" };
  }
  if (process.env.RESEND_API_KEY && !process.env.PHYSICAL_ADDRESS) {
    throw new Error("Set PHYSICAL_ADDRESS before sending outreach (required by CAN-SPAM).");
  }

  const greeting = p.firstName ? `Hi ${p.firstName},` : "Hi there,";
  const subject = followUp ? `re: ${p.outreach.subject}` : p.outreach.subject;
  const body = followUp
    ? `${greeting}\n\nQuick follow-up in case this got buried. The page I made for ${p.businessName} is still up. It shows the exact text a missed caller would get back from you:\n\n${p.demoUrl}\n\nIf it's not a fit, no worries at all.`
    : p.outreach.body;

  const f = footer(p.email);
  await sendEmail({
    to: p.email,
    subject,
    text: body + f.text,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#222">${toHtml(body)}${f.html}</div>`,
  });

  const now = new Date().toISOString();
  updateProspect(slug, followUp ? { status: "followed_up", followedUpAt: now } : { status: "sent", sentAt: now });
  return { sent: true };
}

/** How many outreach emails have gone out today (UTC), for the daily cap. */
function sentToday() {
  const today = new Date().toISOString().slice(0, 10);
  const rec = getMeta("outreachCount") || {};
  return rec.date === today ? rec.count : 0;
}
function bumpSentToday() {
  const today = new Date().toISOString().slice(0, 10);
  setMeta("outreachCount", { date: today, count: sentToday() + 1 });
}

/**
 * One pass of the outreach autopilot: send new emails and 3-day follow-ups,
 * respecting OUTREACH_DAILY_LIMIT (default 30, kept low for deliverability).
 */
export async function runOutreachTick() {
  const limit = Number(process.env.OUTREACH_DAILY_LIMIT || 30);
  const followAfterMs = 3 * 24 * 3600 * 1000;
  const now = Date.now();
  let sent = 0;

  for (const [slug, p] of Object.entries(listProspects())) {
    if (sentToday() >= limit) break;
    if (!p.email) continue;
    try {
      if (p.status === "ready") {
        const r = await sendProspectEmail(slug);
        if (r.sent) (bumpSentToday(), sent++);
      } else if (p.status === "sent" && now - Date.parse(p.sentAt) > followAfterMs) {
        const r = await sendProspectEmail(slug, { followUp: true });
        if (r.sent) (bumpSentToday(), sent++);
      }
    } catch (err) {
      console.error(`[outreach] ${slug}:`, err.message);
      if (/PHYSICAL_ADDRESS/.test(err.message)) break;
    }
  }
  return { sent };
}
