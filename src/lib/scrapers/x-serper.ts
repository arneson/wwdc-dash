import { WWDCEvent, EventTag } from "../types";

/**
 * Scrape tweets about WWDC events via Serper.dev (Google SERP API).
 * Uses `site:x.com` queries to find relevant tweets.
 *
 * Free tier: 2,500 searches/month — plenty for 4 terms every 30 min.
 * Sign up at https://serper.dev (no credit card needed).
 * Set SERPER_API_KEY in your env vars.
 */

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

const TAG_KEYWORDS: Record<EventTag, string[]> = {
  wwdc: ["wwdc", "apple", "ios", "swift"],
  ai: ["ai", "ml", "machine learning", "llm"],
  startup: ["startup", "founder", "vc"],
  "demo-night": ["demo night", "pitch", "demo day"],
  "hack-house": ["hacker house", "hack house", "hackathon"],
  afterparty: ["afterparty", "after party"],
  mixer: ["mixer", "social"],
  brewery: ["brewery", "beer", "brewing"],
  meetup: ["meetup", "meet up", "gathering"],
  workshop: ["workshop", "hands-on"],
  keynote: ["keynote"],
  networking: ["networking", "community"],
};

function autoTag(text: string): EventTag[] {
  const lower = text.toLowerCase();
  const tags: EventTag[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag as EventTag);
    }
  }
  return tags.length > 0 ? tags : ["meetup"];
}

// Extract @username from x.com URL
function extractHost(url: string): string {
  const match = url.match(/x\.com\/([^/]+)/);
  return match ? `@${match[1]}` : "X / Twitter";
}

// Try to extract a date from the snippet or title
function extractDate(snippet: string, resultDate?: string): string {
  // Serper sometimes returns a date string
  if (resultDate) {
    const d = new Date(resultDate);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // Look for "June X" or "Jun X" patterns
  const monthMatch = snippet.match(
    /\b(june|jun)\s+(\d{1,2})\b/i
  );
  if (monthMatch) {
    const day = parseInt(monthMatch[2]);
    if (day >= 1 && day <= 30) {
      return `2026-06-${day.toString().padStart(2, "0")}`;
    }
  }

  // Default to middle of WWDC week
  return "2026-06-10";
}

function serperResultToEvent(result: SerperResult): WWDCEvent {
  const text = `${result.title} ${result.snippet}`;

  return {
    id: `x-${Buffer.from(result.link).toString("base64url").slice(0, 20)}`,
    title: result.title.replace(/ on X:.*/, "").replace(/" \/ X$/, "").slice(0, 120),
    description: result.snippet.slice(0, 500),
    source: "x",
    sourceUrl: result.link,
    date: extractDate(result.snippet, result.date),
    time: "18:00",
    location: "San Francisco, CA",
    host: extractHost(result.link),
    tags: autoTag(text),
    interestLevel: "interested",
    rsvpStatus: "none",
    inviteOnly: false,
    cost: "Free",
    notes: "",
    addedAt: new Date().toISOString(),
  };
}

export async function searchX(query: string): Promise<WWDCEvent[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.log("X scraper: No SERPER_API_KEY set, skipping");
    return [];
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `site:x.com ${query} san francisco june 2026`,
        num: 20,
      }),
    });

    if (!res.ok) {
      console.error(`Serper API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results: SerperResult[] = data.organic || [];

    // Filter to actual tweet URLs (not profile pages or lists)
    const tweetResults = results.filter((r) =>
      /x\.com\/\w+\/status\//.test(r.link)
    );

    return tweetResults.map(serperResultToEvent);
  } catch (err) {
    console.error("X scraper error:", err);
    return [];
  }
}
