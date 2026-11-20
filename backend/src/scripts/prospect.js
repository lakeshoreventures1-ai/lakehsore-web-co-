/**
 * Bulk-generate personalized demo pages + cold emails from a CSV.
 *
 *   npm run prospects -- leads.csv            # generate demos + email drafts
 *   npm run prospects -- leads.csv --send     # also send the first email now
 *
 * CSV header (any order, extra columns ignored):
 *   businessName,website,phone,email,firstName,city
 *
 * Writes outreach-<timestamp>.csv next to the input with each demo link,
 * subject and body, so you can review or load them into any email tool.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { createProspect, sendProspectEmail } from "../lib/prospects.js";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim()));
  const keys = header.map((h) => h.trim());
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error("Usage: npm run prospects -- leads.csv [--send]");
  process.exit(1);
}
const send = flags.includes("--send");
const leads = parseCsv(fs.readFileSync(file, "utf8"));
const out = [["businessName", "email", "demoUrl", "subject", "body", "status"]];

console.log(`Generating ${leads.length} personalized demos${send ? " and sending" : ""}...`);
for (const [i, lead] of leads.entries()) {
  try {
    const p = await createProspect(lead);
    let status = "draft";
    if (send && p.email) {
      const r = await sendProspectEmail(p.slug);
      status = r.sent ? "sent" : r.skipped;
    }
    out.push([p.businessName, p.email, p.demoUrl, p.outreach.subject, p.outreach.body, status]);
    console.log(`[${i + 1}/${leads.length}] ${p.businessName} -> ${p.demoUrl} (${status})`);
  } catch (err) {
    console.error(`[${i + 1}/${leads.length}] ${lead.businessName}: ${err.message}`);
    out.push([lead.businessName, lead.email, "", "", "", `error: ${err.message}`]);
  }
}

const outFile = path.join(path.dirname(file), `outreach-${Date.now()}.csv`);
fs.writeFileSync(outFile, out.map((r) => r.map(csvCell).join(",")).join("\n"));
console.log(`\nDone. Review your emails in ${outFile}`);
