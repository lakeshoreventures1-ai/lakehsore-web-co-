import { sendEmail } from "./email.js";

/** Email the owner about things worth knowing (hot leads, new customers, cancellations). */
export async function notifyAdmin(subject, text) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return console.log(`[notify] ${subject}\n${text}`);
  try {
    await sendEmail({ to, subject: `[CND] ${subject}`, text });
  } catch (err) {
    console.error("[notify] failed:", err.message);
  }
}
