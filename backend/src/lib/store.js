import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets a host mount a persistent disk (e.g. Render disk at /var/data).
const DATA_DIR = process.env.DATA_DIR || path.join(here, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "clients.json");

const EMPTY = () => ({
  clients: {},
  conversations: {},
  prospects: {},
  unsubscribed: {},
  events: [],
  meta: {},
});

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return EMPTY();
  return { ...EMPTY(), ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
}

function writeAll(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomic replace so a crash can't truncate the file
}

function update(fn) {
  const data = readAll();
  const result = fn(data);
  writeAll(data);
  return result;
}

// ---------- Clients (paying customers), keyed by their dedicated Twilio number ----------

export function saveClient(twilioNumber, client) {
  update((d) => {
    d.clients[twilioNumber] = client;
  });
}

export function updateClient(twilioNumber, patch) {
  return update((d) => {
    if (!d.clients[twilioNumber]) return null;
    d.clients[twilioNumber] = { ...d.clients[twilioNumber], ...patch };
    return d.clients[twilioNumber];
  });
}

export function getClientByTwilioNumber(twilioNumber) {
  const client = readAll().clients[twilioNumber] ?? null;
  if (client && client.active === false) return null; // cancelled clients get no service
  return client;
}

export function findClient(predicate) {
  const entries = Object.entries(readAll().clients);
  const hit = entries.find(([, c]) => predicate(c));
  return hit ? { twilioNumber: hit[0], ...hit[1] } : null;
}

export function listClients() {
  return readAll().clients;
}

// ---------- SMS conversations ----------

export function getConversation(twilioNumber, callerNumber) {
  return readAll().conversations[`${twilioNumber}:${callerNumber}`] ?? [];
}

export function appendConversation(twilioNumber, callerNumber, turn) {
  update((d) => {
    const key = `${twilioNumber}:${callerNumber}`;
    const existing = d.conversations[key] ?? [];
    existing.push(turn);
    d.conversations[key] = existing.slice(-20); // keep recent context only
  });
}

// ---------- Activity log (for weekly client reports) ----------

export function logEvent(event) {
  update((d) => {
    d.events.push({ ...event, at: new Date().toISOString() });
    // Keep ~90 days worth at a few hundred events/day; trim oldest.
    if (d.events.length > 50000) d.events = d.events.slice(-50000);
  });
}

export function eventsSince(isoDate) {
  return readAll().events.filter((e) => e.at >= isoDate);
}

// ---------- Prospects (personalized demo pages for outreach) ----------

export function saveProspect(slug, prospect) {
  update((d) => {
    d.prospects[slug] = prospect;
  });
}

export function getProspect(slug) {
  return readAll().prospects[slug] ?? null;
}

export function updateProspect(slug, patch) {
  return update((d) => {
    if (!d.prospects[slug]) return null;
    d.prospects[slug] = { ...d.prospects[slug], ...patch };
    return d.prospects[slug];
  });
}

export function listProspects() {
  return readAll().prospects;
}

// ---------- Email unsubscribes (CAN-SPAM) ----------

export function unsubscribe(email) {
  update((d) => {
    d.unsubscribed[email.toLowerCase()] = new Date().toISOString();
  });
}

export function isUnsubscribed(email) {
  return Boolean(readAll().unsubscribed[String(email).toLowerCase()]);
}

// ---------- Misc key/value (e.g. last weekly report run) ----------

export function getMeta(key) {
  return readAll().meta[key];
}

export function setMeta(key, value) {
  update((d) => {
    d.meta[key] = value;
  });
}
