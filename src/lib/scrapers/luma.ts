import { WWDCEvent, EventTag } from "../types";

interface LumaEntry {
  api_id: string;
  event: {
    api_id: string;
    name: string;
    description?: string;
    description_mirror?: string;
    start_at: string;
    end_at?: string;
    geo_address_info?: {
      city_state?: string;
      address?: string;
      full_address?: string;
      place_id?: string;
    };
    geo_latitude?: number;
    geo_longitude?: number;
    cover_url?: string;
    url: string;
    timezone?: string;
    visibility?: string;
  };
  calendar?: {
    name?: string;
    api_id?: string;
  };
  guests_count?: number;
}

const TAG_KEYWORDS: Record<EventTag, string[]> = {
  wwdc: ["wwdc", "apple", "ios", "swift", "xcode"],
  ai: ["ai", "ml", "machine learning", "llm", "gpt", "neural", "coreml"],
  startup: ["startup", "founder", "vc", "venture", "yc", "y combinator"],
  "demo-night": ["demo night", "demo day", "pitch", "showcase"],
  "hack-house": ["hacker house", "hack house", "hackathon"],
  afterparty: ["afterparty", "after party", "after-party"],
  mixer: ["mixer", "mingle", "social"],
  brewery: ["brewery", "beer", "brewing", "tap"],
  meetup: ["meetup", "meet up", "gathering"],
  workshop: ["workshop", "lab", "hands-on", "tutorial"],
  keynote: ["keynote", "watch party"],
  networking: ["networking", "connect", "community"],
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

function extractNeighborhood(address: string): string | undefined {
  const neighborhoods = [
    "SoMa", "Mission", "Dogpatch", "Potrero Hill", "Embarcadero",
    "Marina", "Hayes Valley", "Castro", "Noe Valley", "Bernal Heights",
    "Sunset", "Richmond", "FiDi", "Financial District", "North Beach",
    "Chinatown", "Tenderloin", "Mid-Market", "Pacific Heights",
    "Cupertino", "Palo Alto", "Mountain View",
  ];
  for (const n of neighborhoods) {
    if (address.toLowerCase().includes(n.toLowerCase())) return n;
  }
  return undefined;
}

function lumaEntryToEvent(entry: LumaEntry): WWDCEvent {
  const e = entry.event;
  const startDate = new Date(e.start_at);
  const endDate = e.end_at ? new Date(e.end_at) : undefined;

  const address =
    e.geo_address_info?.full_address ||
    e.geo_address_info?.address ||
    "San Francisco, CA";

  const description = e.description_mirror || e.description || "";

  return {
    id: `luma-${e.api_id}`,
    title: e.name,
    description: description.slice(0, 500),
    source: "luma",
    sourceUrl: e.url.startsWith("http") ? e.url : `https://lu.ma/${e.url}`,
    date: startDate.toISOString().split("T")[0],
    time: startDate.toTimeString().slice(0, 5),
    endTime: endDate ? endDate.toTimeString().slice(0, 5) : undefined,
    location: address,
    neighborhood: extractNeighborhood(address),
    host: entry.calendar?.name || "Unknown",
    tags: autoTag(e.name, description),
    interestLevel: "interested",
    rsvpStatus: "none",
    inviteOnly: e.visibility === "private",
    cost: "Free",
    attendeeCount: entry.guests_count,
    notes: "",
    addedAt: new Date().toISOString(),
    imageUrl: e.cover_url,
  };
}

export async function searchLuma(query: string): Promise<WWDCEvent[]> {
  try {
    const res = await fetch("https://api.lu.ma/discover/get-paginated-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-luma-client-type": "web",
      },
      body: JSON.stringify({
        pagination_limit: 20,
        geo_latitude: 37.7749,
        geo_longitude: -122.4194,
        geo_radius: "50mi",
        search_query: query,
      }),
    });

    if (!res.ok) {
      console.error(`Luma API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const entries: LumaEntry[] = data.entries || [];

    return entries.map(lumaEntryToEvent).filter((e) => {
      // Filter to WWDC week ± a few days
      return e.date >= "2025-06-07" && e.date <= "2025-06-15";
    });
  } catch (err) {
    console.error("Luma scraper error:", err);
    return [];
  }
}
