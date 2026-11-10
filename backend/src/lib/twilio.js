import Twilio from "twilio";

const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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
