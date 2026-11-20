import { listClients, eventsSince } from "./store.js";
import { sendEmail, escapeHtml } from "./email.js";

/**
 * Weekly "here's what we saved you" email to every active client. Showing
 * value every week is the cheapest way to keep them from cancelling.
 */
export async function sendWeeklyReports() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const events = eventsSince(since);
  let sent = 0;

  for (const [twilioNumber, c] of Object.entries(listClients())) {
    if (c.active === false || !c.email) continue;
    const mine = events.filter((e) => e.twilioNumber === twilioNumber);
    const missed = new Set(mine.filter((e) => e.type === "missed_call").map((e) => e.caller)).size;
    const replied = new Set(mine.filter((e) => e.type === "caller_reply").map((e) => e.caller)).size;

    const headline =
      missed === 0
        ? "No missed calls this week. Nice work picking up."
        : `${missed} missed caller${missed === 1 ? "" : "s"} got an instant text from you this week, and ${replied} texted back.`;

    const text = `Hi ${c.businessName},\n\n${headline}\n\nWithout the text-back, most of those callers would have hung up and tried someone else. Check your phone's messages for the conversations.\n\n- CND Digital`;
    try {
      await sendEmail({
        to: c.email,
        subject: missed ? `${missed} missed calls saved this week` : "Your weekly text-back summary",
        text,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.5;max-width:520px"><p>Hi ${escapeHtml(c.businessName)},</p><p style="font-size:18px"><strong>${escapeHtml(headline)}</strong></p><p>Without the text-back, most of those callers would have hung up and tried someone else.</p><p>- CND Digital</p></div>`,
      });
      sent++;
    } catch (err) {
      console.error(`[reports] ${c.businessName}:`, err.message);
    }
  }
  return { sent };
}
