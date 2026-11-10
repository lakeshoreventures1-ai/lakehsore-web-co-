import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(here, "..", "..", "data", "clients.json");

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return { clients: {}, conversations: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeAll(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/** Save a newly onboarded client, keyed by its dedicated Twilio number (E.164). */
export function saveClient(twilioNumber, client) {
  const data = readAll();
  data.clients[twilioNumber] = client;
  writeAll(data);
}

/** Look up a client by the Twilio number a call/text landed on. */
export function getClientByTwilioNumber(twilioNumber) {
  const data = readAll();
  return data.clients[twilioNumber] ?? null;
}

export function listClients() {
  const data = readAll();
  return data.clients;
}

/** Per (twilioNumber, callerNumber) SMS conversation history, for context on replies. */
export function getConversation(twilioNumber, callerNumber) {
  const data = readAll();
  return data.conversations[`${twilioNumber}:${callerNumber}`] ?? [];
}

export function appendConversation(twilioNumber, callerNumber, turn) {
  const data = readAll();
  const key = `${twilioNumber}:${callerNumber}`;
  const existing = data.conversations[key] ?? [];
  existing.push(turn);
  data.conversations[key] = existing.slice(-20); // keep recent context only
  writeAll(data);
}
