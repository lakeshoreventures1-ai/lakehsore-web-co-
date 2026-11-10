import * as cheerio from "cheerio";

/**
 * Fetch a business's website and return its visible text, trimmed to a size
 * reasonable for an LLM prompt. Best-effort: on any failure, returns "".
 */
export async function scrapeWebsiteText(url, { maxChars = 8000 } = {}) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "CNDDigitalOnboardingBot/0.1 (+https://cnddigital.org)" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, nav, footer").remove();

    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, maxChars);
  } catch {
    return "";
  }
}
