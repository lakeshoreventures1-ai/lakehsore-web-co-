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

const DemoSchema = z.object({
  niche: z
    .string()
    .describe(
      "One of: plumbing, hvac, electrical, roofing, landscaping, cleaning, pest_control, auto_repair, dental, med_spa, salon, law, real_estate, contractor, other",
    ),
  sample_conversation: z
    .array(z.object({ from: z.enum(["caller", "business"]), text: z.string() }))
    .describe(
      "A realistic 4-6 message SMS exchange that starts right after the missed-call text: a likely customer asks about a real service this business offers, and the business replies helpfully using only facts from the profile, ending with a booked appointment or a clear next step",
    ),
});

/**
 * Build everything a personalized demo page needs for one prospect: their
 * business profile, their own missed-call text + AI persona (the exact one
 * they'll get if they sign up), and a sample conversation.
 */
export async function generateDemo({ businessName, phone, scrapedText }) {
  const profile = await extractBusinessProfile(businessName, scrapedText);
  const persona = await generatePersona({ businessName, phone, profile });

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1500,
    output_config: { effort: "low", format: zodOutputFormat(DemoSchema) },
    messages: [
      {
        role: "user",
        content: [
          `Business: ${businessName}`,
          `Profile: ${JSON.stringify(profile)}`,
          `The missed-call text they send: "${persona.missed_call_text}"`,
          "",
          "Classify the business niche and write the sample conversation that follows that text.",
          "Keep each message SMS-length. Never invent prices, hours or services not in the profile.",
        ].join("\n"),
      },
    ],
  });

  const demo = response.parsed_output ?? { niche: "other", sample_conversation: [] };
  return { profile, persona, niche: demo.niche, sampleConversation: demo.sample_conversation };
}

/** Short, personal cold-email opener referencing something real from their site. */
export async function writeOutreachEmail({ businessName, firstName, city, profile, demoUrl }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    output_config: { effort: "low" },
    system:
      "You write short, plain-text cold emails for a small agency selling Missed Call Text Back to local businesses. " +
      "Rules: under 90 words, no hype, no exclamation marks, no fake claims or made-up statistics, one specific detail " +
      "about their business from the profile, end with a soft yes/no question. Output ONLY JSON with keys 'subject' (under 6 words, lowercase) and 'body'. " +
      "Do not include a signature or unsubscribe line - those are added automatically.",
    messages: [
      {
        role: "user",
        content: [
          `Business: ${businessName}`,
          `Contact first name: ${firstName || "unknown (use a generic greeting like 'Hi there')"}`,
          `City: ${city || "unknown"}`,
          `Profile: ${JSON.stringify(profile)}`,
          `Personalized demo link (must appear in the body exactly once, on its own line): ${demoUrl}`,
          "Angle: when they're on a job and miss a call, the caller usually phones the next business. We built a page showing the exact text their missed callers would get.",
        ].join("\n"),
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    if (!parsed.body.includes(demoUrl)) parsed.body += `\n\n${demoUrl}`;
    return parsed;
  } catch {
    return {
      subject: `missed calls at ${businessName.toLowerCase()}`,
      body: `Hi${firstName ? " " + firstName : " there"},\n\nWhen you're on a job and can't pick up, most callers don't leave a voicemail. They call the next business on the list.\n\nI put together a page showing the exact text your missed callers would get back from ${businessName}, automatically, within seconds:\n\n${demoUrl}\n\nWorth a look?`,
    };
  }
}
