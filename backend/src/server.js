import "dotenv/config";
import express from "express";
import { onboardRouter } from "./routes/onboard.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { listClients } from "./lib/store.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks post form-encoded bodies

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/clients", (_req, res) => res.json(listClients()));

app.use(onboardRouter);
app.use(webhooksRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`CND Digital onboarding backend listening on :${port}`);
});
