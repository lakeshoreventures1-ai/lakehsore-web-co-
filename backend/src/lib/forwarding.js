/**
 * "Forward when unanswered" activation codes, by carrier. The client dials
 * the code followed by the Twilio number we just provisioned for them -
 * this only forwards calls nobody picks up, so their existing line and
 * voicemail keep working exactly as before.
 */
export const FORWARDING_CODES = {
  verizon: "*71",
  att: "*92",
  tmobile: "*71",
  sprint: "*73",
};

export function forwardingInstructions(twilioNumber) {
  return {
    twilio_number: twilioNumber,
    note:
      "This only forwards calls that go unanswered - your existing phone, voicemail, " +
      "and everything else about your line stays exactly as it is.",
    by_carrier: Object.fromEntries(
      Object.entries(FORWARDING_CODES).map(([carrier, code]) => [
        carrier,
        `Dial ${code}${twilioNumber.replace("+1", "")} then hang up to activate.`,
      ]),
    ),
    voip_note:
      "On a VoIP/business phone system (RingCentral, Google Voice, a desk-phone PBX, etc.), " +
      "set 'forward when unanswered' to this number in its admin dashboard instead of dialing a code.",
  };
}
