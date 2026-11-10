import { Router } from "express";
import Twilio from "twilio";
import { getClientByTwilioNumber, getConversation, appendConversation } from "../lib/store.js";
import { sendSms } from "../lib/twilio.js";
import { replyAsBusiness } from "../lib/claude.js";

export const webhooksRouter = Router();

/**
 * POST /webhooks/twilio/voice
 *
 * Every call that lands on a client's dedicated Twilio number got there via
 * "forward when unanswered" on their real line - so by definition, every
 * call here is a missed call. Immediately text the caller back as the
 * business, then end the call.
 */
webhooksRouter.post("/webhooks/twilio/voice", async (req, res) => {
  const { From: callerNumber, To: twilioNumber } = req.body;
  const client = getClientByTwilioNumber(twilioNumber);

  if (client) {
    try {
      await sendSms({ from: twilioNumber, to: callerNumber, body: client.missedCallText });
      appendConversation(twilioNumber, callerNumber, {
        role: "assistant",
        content: client.missedCallText,
      });
    } catch (err) {
      console.error("[voice webhook] failed to send missed-call text:", err);
    }
  } else {
    console.warn(`[voice webhook] no client configured for ${twilioNumber}`);
  }

  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.reject();
  res.type("text/xml").send(twiml.toString());
});

/**
 * POST /webhooks/twilio/sms
 *
 * Handles the caller's replies after the initial missed-call text, using
 * Claude with the client's generated persona + recent conversation history.
 */
webhooksRouter.post("/webhooks/twilio/sms", async (req, res) => {
  const { From: callerNumber, To: twilioNumber, Body: body } = req.body;
  const client = getClientByTwilioNumber(twilioNumber);

  const twiml = new Twilio.twiml.MessagingResponse();

  if (!client) {
    console.warn(`[sms webhook] no client configured for ${twilioNumber}`);
    res.type("text/xml").send(twiml.toString());
    return;
  }

  try {
    const history = getConversation(twilioNumber, callerNumber);
    const reply = await replyAsBusiness(client.systemPrompt, history, body);

    appendConversation(twilioNumber, callerNumber, { role: "user", content: body });
    appendConversation(twilioNumber, callerNumber, { role: "assistant", content: reply });

    twiml.message(reply);
  } catch (err) {
    console.error("[sms webhook] failed to generate reply:", err);
    twiml.message("Thanks for the message - we'll get back to you shortly!");
  }

  res.type("text/xml").send(twiml.toString());
});
