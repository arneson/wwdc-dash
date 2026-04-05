import { WWDCEvent, EventTag } from "../types";

// Internal Eventbrite destination API response shape
interface EBDestinationEvent {
  eventbrite_event_id: string;
  name: string;
  summary?: string;
  url: string;
  start_date: string; // "2025-06-09"
  start_time: string; // "17:00"
  end_date?: string;
  end_time?: string;
  timezone?: string;
  image?: { original?: { url?: string } };
  primary_organizer?: { name?: string; url?: string };
  primary_venue?: {
    name?: string;
    address?: {
      localized_address_display?: string;
      city?: string;
      region?: string;
    };
  };
  ticket_availability?: {
    minimum_ticket_price?: { display?: string };
    is_free?: boolean;
  };
  tags?: { display_name?: string }[];
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

function ebDestToEvent(eb: EBDestinationEvent): WWDCEvent {
  const description = eb.summary || "";
  const location =
    eb.primary_venue?.address?.localized_address_display ||
    eb.primary_venue?.name ||
    "San Francisco, CA";

  const cost = eb.ticket_availability?.is_free
    ? "Free"
    : eb.ticket_availability?.minimum_ticket_price?.display || "Paid";

  return {
    id: `eb-${eb.eventbrite_event_id}`,
    title: eb.name,
    description: description.slice(0, 500),
    source: "eventbrite",
    sourceUrl: eb.url,
    date: eb.start_date,
    time: eb.start_time || "00:00",
    endTime: eb.end_time || undefined,
    location,
    host: eb.primary_organizer?.name || "Unknown",
    tags: autoTag(eb.name, description),
    interestLevel: "interested",
    rsvpStatus: "none",
    inviteOnly: false,
    cost,
    notes: "",
    addedAt: new Date().toISOString(),
    imageUrl: eb.image?.original?.url,
  };
}

// SF Google Places ID
const SF_PLACE_ID = "ChIJIQBpABoR2YAR2oxhU2yN3Qo";

export async function searchEventbrite(
  query: string
): Promise<WWDCEvent[]> {
  try {
    const params = new URLSearchParams({
      "event_search.q": query,
      "event_search.dates": "current_future",
      place_id: SF_PLACE_ID,
      page_size: "40",
      expand: "primary_venue,primary_organizer,ticket_availability,image",
    });

    const res = await fetch(
      `https://www.eventbrite.com/api/v3/destination/events/?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "https://www.eventbrite.com/",
        },
      }
    );

    if (!res.ok) {
      console.error(`Eventbrite API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const events: EBDestinationEvent[] = data.events || [];

    return events
      .map(ebDestToEvent)
      .filter((e) => e.date >= "2026-06-04" && e.date <= "2026-06-14");
  } catch (err) {
    console.error("Eventbrite scraper error:", err);
    return [];
  }
}
