import Anthropic from "@anthropic-ai/sdk";
// zodOutputFormat builds its JSON schema from zod's v4 core, so the schema
// passed to it must also come from "zod/v4" (not the top-level "zod" export,
// which is the classic v3 API and isn't compatible with that core).
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const MODEL = "claude-opus-5-5";

const BusinessProfileSchema = z.object({
  hours: z.string().describe("Business hours in plain English, e.g. 'Mon-Fri 8am-5pm'"),
  services: z.array(z.string()).describe("Short list of services/products offered"),
  service_area: z.string().describe("City/region served, or 'not specified'"),
  tone: z.string().describe("One or two words for the brand's tone, e.g. 'friendly, casual'"),
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Up to 5 likely customer FAQs the site answers"),
});

/**
 * Turn raw scraped website text into a structured business profile.
 * Falls back to a minimal profile if scraping found nothing usable.
 */
export async function extractBusinessProfile(businessName, scrapedText) {
  if (!scrapedText || scrapedText.length < 40) {
    return {
      hours: "not specified",
      services: [],
      service_area: "not specified",
      tone: "friendly, professional",
      faqs: [],
    };
  }

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(BusinessProfileSchema) },
    messages: [
      {
        role: "user",
        content: `Here is the text scraped from ${businessName}'s website. Extract their business hours, services, service area, brand tone, and likely customer FAQs.\n\n---\n${scrapedText}`,
      },
    ],
  });

  return response.parsed_output ?? {
    hours: "not specified",
    services: [],
    service_area: "not specified",
    tone: "friendly, professional",
    faqs: [],
  };
}

/**
 * Generate the first auto-text sent the moment a call is missed, plus a
 * system prompt for Claude to use on any follow-up SMS replies.
 */
export async function generatePersona({ businessName, phone, profile }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    output_config: { effort: "medium" },
    system:
      "You write concise, warm small-business text messages and system prompts. " +
      "Output must be ONLY valid JSON with keys 'missed_call_text' and 'system_prompt' - no markdown, no commentary.",
    messages: [
      {
        role: "user",
        content: [
          `Business name: ${businessName}`,
          `Business phone: ${phone}`,
          `Hours: ${profile.hours}`,
          `Services: ${profile.services.join(", ") || "not specified"}`,
          `Service area: ${profile.service_area}`,
          `Tone: ${profile.tone}`,
          `FAQs: ${JSON.stringify(profile.faqs)}`,
          "",
          "1) missed_call_text: a short SMS (under 300 characters) sent immediately after a " +
            "missed call, apologizing briefly, naming the business, and inviting them to say " +
            "what they need. Match the brand tone.",
          "2) system_prompt: instructions for an AI assistant that will text back-and-forth as " +
            "this business's receptionist, using the hours/services/FAQs above. It should be " +
            "helpful and brief (SMS-length replies), never invent facts not given above, and " +
            "offer to have a human follow up when it doesn't know an answer.",
        ].join("\n"),
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    return {
      missed_call_text: `Hey, sorry we missed your call! This is ${businessName} — what can we help with?`,
      system_prompt: `You are the texting assistant for ${businessName}. Be brief, friendly, and only use the facts you're given. Offer a human follow-up when unsure.`,
    };
  }
}

/** Reply to an inbound SMS as the business, using its generated persona + recent history. */
export async function replyAsBusiness(systemPrompt, history, newMessage) {
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: newMessage },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    output_config: { effort: "low" },
    system: systemPrompt,
    messages,
  });

  return response.content.find((b) => b.type === "text")?.text ?? "Thanks — we'll get back to you shortly!";
}
