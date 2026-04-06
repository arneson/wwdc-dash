import { NextResponse } from "next/server";
import { searchLuma } from "@/lib/scrapers/luma";
import { searchEventbrite } from "@/lib/scrapers/eventbrite";
import { searchX } from "@/lib/scrapers/x-serper";
import { searchMeetup } from "@/lib/scrapers/meetup";
import { DEFAULT_SCAN_CONFIGS, WWDCEvent } from "@/lib/types";
import { scoreAndRankEvents } from "@/lib/scoring";

type ScrapeResult = {
  source: string;
  term: string;
  found: number;
  error?: string;
  events: WWDCEvent[];
};

const SCRAPERS: Record<string, (query: string) => Promise<WWDCEvent[]>> = {
  luma: searchLuma,
  eventbrite: searchEventbrite,
  x: searchX,
  meetup: searchMeetup,
};

export async function POST() {
  const results: ScrapeResult[] = [];

  // Run all configured scrapers
  for (const config of DEFAULT_SCAN_CONFIGS) {
    const scraper = SCRAPERS[config.source];
    if (!scraper || !config.enabled) continue;

    for (const term of config.searchTerms) {
      try {
        const events = await scraper(term);
        results.push({ source: config.source, term, found: events.length, events });
      } catch (err) {
        results.push({
          source: config.source,
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

  // Auto-score events based on user profile
  const scoredEvents = scoreAndRankEvents(allEvents);

  const totalFound = results.reduce((s, r) => s + r.found, 0);

  return NextResponse.json({
    success: true,
    summary: {
      totalFound,
      uniqueEvents: scoredEvents.length,
      searches: results.length,
    },
    results: results.map(({ events: _events, ...rest }) => rest),
    events: scoredEvents,
  });
}
