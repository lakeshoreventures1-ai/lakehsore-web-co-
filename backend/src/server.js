import "dotenv/config";
import express from "express";
import { onboardRouter } from "./routes/onboard.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { demoRouter } from "./routes/demo.js";
import { billingRouter } from "./routes/billing.js";
import { listClients } from "./lib/store.js";
import { requireAdmin } from "./lib/auth.js";
import { sendWeeklyReports } from "./lib/reports.js";
import { runOutreachTick } from "./lib/prospects.js";
import { startScheduler } from "./lib/scheduler.js";

process.on("unhandledRejection", (err) => console.error("[unhandledRejection]", err));

const app = express();
app.set("trust proxy", true);

// Stripe needs the raw body to verify signatures, so billing mounts before the JSON parser.
app.use(billingRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks post form-encoded bodies

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.redirect(process.env.SITE_URL || "https://cnddigital.org"));

app.get("/api/clients", requireAdmin, (_req, res) => res.json(listClients()));
app.post("/api/reports/send", requireAdmin, async (_req, res) => res.json(await sendWeeklyReports()));
app.post("/api/outreach/run", requireAdmin, async (_req, res) => res.json(await runOutreachTick()));

app.use(onboardRouter);
app.use(webhooksRouter);
app.use(demoRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`CND Digital backend listening on :${port}`);
  if (process.env.DISABLE_SCHEDULER !== "1") startScheduler();
});
