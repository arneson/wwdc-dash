import { NextResponse } from "next/server";
import { searchLuma } from "@/lib/scrapers/luma";
import { searchEventbrite } from "@/lib/scrapers/eventbrite";
import { DEFAULT_SCAN_CONFIGS } from "@/lib/types";
import { WWDCEvent } from "@/lib/types";

export async function POST() {
  const results: {
    source: string;
    term: string;
    found: number;
    error?: string;
    events: WWDCEvent[];
  }[] = [];

  // Run Luma searches
  const lumaConfig = DEFAULT_SCAN_CONFIGS.find((c) => c.source === "luma");
  if (lumaConfig?.enabled) {
    for (const term of lumaConfig.searchTerms) {
      try {
        const events = await searchLuma(term);
        results.push({
          source: "luma",
          term,
          found: events.length,
          events,
        });
      } catch (err) {
        results.push({
          source: "luma",
          term,
          found: 0,
          error: String(err),
          events: [],
        });
      }
    }
  }

  // Run Eventbrite searches
  const ebConfig = DEFAULT_SCAN_CONFIGS.find((c) => c.source === "eventbrite");
  if (ebConfig?.enabled) {
    for (const term of ebConfig.searchTerms) {
      try {
        const events = await searchEventbrite(term);
        results.push({
          source: "eventbrite",
          term,
          found: events.length,
          events,
        });
      } catch (err) {
        results.push({
          source: "eventbrite",
          term,
          found: 0,
          error: String(err),
          events: [],
        });
      }
    }
  }

  // Deduplicate across all results by sourceUrl and title
  const seenKeys = new Set<string>();
  const allEvents: WWDCEvent[] = [];

  for (const r of results) {
    for (const event of r.events) {
      const key = event.sourceUrl || event.title.toLowerCase().trim();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allEvents.push(event);
      }
    }
  }

  const totalFound = results.reduce((s, r) => s + r.found, 0);

  return NextResponse.json({
    success: true,
    summary: {
      totalFound,
      uniqueEvents: allEvents.length,
      searches: results.length,
    },
    results: results.map(({ events, ...rest }) => rest),
    events: allEvents,
  });
}
