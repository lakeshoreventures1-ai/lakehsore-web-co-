import Twilio from "twilio";

let _client;
const client = new Proxy(
  {},
  {
    get(_t, prop) {
      // Created on first use so the server can boot (e.g. to serve demo pages) before Twilio is configured.
      _client ??= Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      return _client[prop];
    },
  },
);

function areaCodeFromPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  const tenDigit = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return tenDigit.slice(0, 3) || undefined;
}

/**
 * Buy a dedicated Twilio number (same area code as the client's existing
 * number, when available) and point its voice + SMS webhooks at this
 * service. Each client gets their own number so an inbound call/text can be
 * matched back to the right business.
 */
export async function provisionNumberForClient(existingPhone) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    // Checked up front: the Twilio SDK throws outside the promise chain when
    // credentials are missing, which would crash the whole server.
    throw new Error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set.");
  }
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("PUBLIC_BASE_URL is not set - deploy this service first, then set it.");
  }

  const areaCode = areaCodeFromPhone(existingPhone);
  let candidates = await client.availablePhoneNumbers("US").local.list({
    areaCode,
    smsEnabled: true,
    voiceEnabled: true,
    limit: 1,
  });

  // Fall back to any available number if none match the client's area code.
  if (candidates.length === 0) {
    candidates = await client.availablePhoneNumbers("US").local.list({
      smsEnabled: true,
      voiceEnabled: true,
      limit: 1,
    });
  }
  if (candidates.length === 0) {
    throw new Error("No available Twilio numbers found.");
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: candidates[0].phoneNumber,
    voiceUrl: `${baseUrl}/webhooks/twilio/voice`,
    voiceMethod: "POST",
    smsUrl: `${baseUrl}/webhooks/twilio/sms`,
    smsMethod: "POST",
  });

  return purchased.phoneNumber; // E.164, e.g. "+19205551234"
}

export async function sendSms({ from, to, body }) {
  return client.messages.create({ from, to, body });
}

/** Release a client's dedicated number (e.g. when they cancel) so it stops billing. */
export async function releaseNumber(phoneNumber) {
  const [match] = await client.incomingPhoneNumbers.list({ phoneNumber, limit: 1 });
  if (match) await client.incomingPhoneNumbers(match.sid).remove();
}
