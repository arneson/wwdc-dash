import { WWDCEvent, EventTag } from "../types";

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description?: { text: string };
  start: { utc: string; local: string };
  end?: { utc: string; local: string };
  url: string;
  venue?: {
    name?: string;
    address?: {
      localized_address_display?: string;
      city?: string;
      region?: string;
    };
  };
  organizer?: { name?: string };
  is_free?: boolean;
  logo?: { url?: string };
  capacity?: number;
  online_event?: boolean;
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

function eventbriteToEvent(eb: EventbriteEvent): WWDCEvent {
  const startDate = new Date(eb.start.utc);
  const endDate = eb.end ? new Date(eb.end.utc) : undefined;
  const description = eb.description?.text || "";
  const location =
    eb.venue?.address?.localized_address_display ||
    eb.venue?.name ||
    "San Francisco, CA";

  return {
    id: `eb-${eb.id}`,
    title: eb.name.text,
    description: description.slice(0, 500),
    source: "eventbrite",
    sourceUrl: eb.url,
    date: startDate.toISOString().split("T")[0],
    time: startDate.toTimeString().slice(0, 5),
    endTime: endDate ? endDate.toTimeString().slice(0, 5) : undefined,
    location,
    host: eb.organizer?.name || "Unknown",
    tags: autoTag(eb.name.text, description),
    interestLevel: "interested",
    rsvpStatus: "none",
    inviteOnly: false,
    cost: eb.is_free ? "Free" : "Paid",
    attendeeCount: eb.capacity,
    notes: "",
    addedAt: new Date().toISOString(),
    imageUrl: eb.logo?.url,
  };
}

export async function searchEventbrite(
  query: string
): Promise<WWDCEvent[]> {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) {
    console.log("Eventbrite: No EVENTBRITE_TOKEN set, skipping API search");
    return [];
  }

  try {
    const params = new URLSearchParams({
      "q": query,
      "location.address": "San Francisco",
      "location.within": "30mi",
      "start_date.range_start": "2025-06-07T00:00:00Z",
      "start_date.range_end": "2025-06-15T23:59:59Z",
      "expand": "venue,organizer",
    });

    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      console.error(`Eventbrite API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const events: EventbriteEvent[] = data.events || [];

    return events
      .filter((e) => !e.online_event)
      .map(eventbriteToEvent);
  } catch (err) {
    console.error("Eventbrite scraper error:", err);
    return [];
  }
}
