/**
 * Minimal transactional/outreach email via Resend's HTTP API (resend.com).
 * No SDK needed. If RESEND_API_KEY isn't set, emails are logged instead of
 * sent, so everything still runs end-to-end in development.
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "CND Digital <hello@cnddigital.org>";

  if (!key) {
    console.log(`[email:dry-run] to=${to} subject="${subject}"\n${text || html}\n`);
    return { dryRun: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      reply_to: replyTo || process.env.EMAIL_REPLY_TO || undefined,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
