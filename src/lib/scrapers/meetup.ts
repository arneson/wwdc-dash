import { WWDCEvent, EventTag } from "../types";

/**
 * Scrape events from Meetup.com by scraping their public search pages.
 * No API key needed — uses the same endpoints the website uses.
 */

interface MeetupEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  endTime?: string;
  eventUrl: string;
  going?: number;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  group?: {
    name?: string;
  };
  imageUrl?: string;
  isFree?: boolean;
}

const TAG_KEYWORDS: Record<EventTag, string[]> = {
  wwdc: ["wwdc", "apple", "ios", "swift"],
  ai: ["ai", "ml", "machine learning", "llm"],
  startup: ["startup", "founder", "vc"],
  "demo-night": ["demo night", "pitch"],
  "hack-house": ["hackathon", "hacker house"],
  afterparty: ["afterparty", "after party"],
  mixer: ["mixer", "social"],
  brewery: ["brewery", "beer", "brewing"],
  meetup: ["meetup", "gathering"],
  workshop: ["workshop", "hands-on"],
  keynote: ["keynote"],
  networking: ["networking", "community"],
};

function autoTag(title: string, description: string): EventTag[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: EventTag[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag as EventTag);
    }
  }
  return tags.length > 0 ? tags : ["meetup"];
}

function meetupToEvent(m: MeetupEvent): WWDCEvent {
  const startDate = new Date(m.dateTime);
  const endDate = m.endTime ? new Date(m.endTime) : undefined;
  const description = m.description || "";
  const location = m.venue
    ? [m.venue.name, m.venue.address, m.venue.city]
        .filter(Boolean)
        .join(", ")
    : "San Francisco, CA";

  return {
    id: `meetup-${m.id}`,
    title: m.title,
    description: description.slice(0, 500),
    source: "meetup",
    sourceUrl: m.eventUrl.startsWith("http")
      ? m.eventUrl
      : `https://www.meetup.com${m.eventUrl}`,
    date: startDate.toISOString().split("T")[0],
    time: startDate.toTimeString().slice(0, 5),
    endTime: endDate ? endDate.toTimeString().slice(0, 5) : undefined,
    location,
    host: m.group?.name || "Meetup",
    tags: autoTag(m.title, description),
    interestLevel: "interested",
    rsvpStatus: "none",
    inviteOnly: false,
    cost: m.isFree ? "Free" : "Paid",
    attendeeCount: m.going,
    notes: "Found on Meetup.com",
    addedAt: new Date().toISOString(),
    imageUrl: m.imageUrl,
  };
}

export async function searchMeetup(query: string): Promise<WWDCEvent[]> {
  try {
    // Use Meetup's internal search endpoint
    const params = new URLSearchParams({
      operationName: "categorySearch",
      extensions: JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash:
            "f2e36e90a6a8a12ee079bcb4f0713b48868b0194efbaf69a3e5e76e0e9624bd7",
        },
      }),
      variables: JSON.stringify({
        first: 20,
        lat: 37.7749,
        lon: -122.4194,
        radius: 50,
        query: query,
        startDateRange: "2026-06-04T00:00:00-07:00",
        endDateRange: "2026-06-14T23:59:59-07:00",
        sortField: "RELEVANCE",
      }),
    });

    const res = await fetch(
      `https://www.meetup.com/gql2?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );

    if (!res.ok) {
      // Fallback: try the older REST-like search
      return await searchMeetupFallback(query);
    }

    const data = await res.json();
    const edges =
      data?.data?.rankedEvents?.edges ||
      data?.data?.keywordSearch?.edges ||
      [];

    const events: MeetupEvent[] = edges.map(
      (edge: { node: Record<string, unknown> }) => {
        const n = edge.node;
        return {
          id: String(n.id || n.eventId || ""),
          title: String(n.title || n.name || ""),
          description: String(n.description || ""),
          dateTime: String(n.dateTime || n.time || ""),
          endTime: n.endTime ? String(n.endTime) : undefined,
          eventUrl: String(n.eventUrl || ""),
          going: typeof n.going === "number" ? n.going : undefined,
          venue: n.venue as MeetupEvent["venue"],
          group: n.group as MeetupEvent["group"],
          isFree: n.feeSettings
            ? (n.feeSettings as { amount?: number })?.amount === 0
            : true,
        };
      }
    );

    return events
      .filter((e) => e.title && e.dateTime)
      .map(meetupToEvent)
      .filter((e) => e.date >= "2026-06-04" && e.date <= "2026-06-14");
  } catch (err) {
    console.error("Meetup scraper error:", err);
    return await searchMeetupFallback(query);
  }
}

// Fallback: use Serper to find Meetup events via Google
async function searchMeetupFallback(query: string): Promise<WWDCEvent[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `site:meetup.com ${query} san francisco june 2026`,
        num: 10,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: { title: string; link: string; snippet: string }[] =
      data.organic || [];

    return results
      .filter((r) => r.link.includes("/events/"))
      .map((r) => ({
        id: `meetup-g-${Buffer.from(r.link).toString("base64url").slice(0, 16)}`,
        title: r.title.replace(/ \| Meetup$/, ""),
        description: r.snippet.slice(0, 500),
        source: "meetup" as const,
        sourceUrl: r.link,
        date: "2026-06-10",
        time: "18:00",
        location: "San Francisco, CA",
        host: "Meetup",
        tags: autoTag(r.title, r.snippet),
        interestLevel: "interested" as const,
        rsvpStatus: "none" as const,
        inviteOnly: false,
        cost: "Free",
        notes: "Found on Meetup.com via Google",
        addedAt: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}
