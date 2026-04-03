export type EventSource = "luma" | "partiful" | "eventbrite" | "x" | "manual";

export type EventTag =
  | "wwdc"
  | "ai"
  | "startup"
  | "demo-night"
  | "hack-house"
  | "afterparty"
  | "mixer"
  | "brewery"
  | "meetup"
  | "workshop"
  | "keynote"
  | "networking";

export type InterestLevel = "must-go" | "interested" | "maybe" | "skip";

export interface WWDCEvent {
  id: string;
  title: string;
  description: string;
  source: EventSource;
  sourceUrl: string;
  date: string; // ISO date
  time: string;
  endTime?: string;
  location: string;
  neighborhood?: string;
  host: string;
  tags: EventTag[];
  interestLevel: InterestLevel;
  rsvpStatus: "none" | "applied" | "confirmed" | "waitlisted";
  inviteOnly: boolean;
  cost: string; // "Free", "$20", etc.
  attendeeCount?: number;
  notes: string;
  addedAt: string; // ISO date
  imageUrl?: string;
}

export interface ScanConfig {
  source: EventSource;
  searchTerms: string[];
  enabled: boolean;
  lastScanned?: string;
}

export const SOURCE_CONFIG: Record<
  EventSource,
  { label: string; color: string; icon: string; priority: number }
> = {
  luma: {
    label: "Luma",
    color: "#7C5CFC",
    icon: "✦",
    priority: 1,
  },
  partiful: {
    label: "Partiful",
    color: "#FF6B6B",
    icon: "🎉",
    priority: 2,
  },
  x: {
    label: "X / Twitter",
    color: "#000000",
    icon: "𝕏",
    priority: 3,
  },
  eventbrite: {
    label: "Eventbrite",
    color: "#F05537",
    icon: "🎫",
    priority: 4,
  },
  manual: {
    label: "Manual",
    color: "#6B7280",
    icon: "✏️",
    priority: 5,
  },
};

export const DEFAULT_SCAN_CONFIGS: ScanConfig[] = [
  {
    source: "luma",
    searchTerms: ["WWDC", "SF founders", "AI", "demo night"],
    enabled: true,
  },
  {
    source: "partiful",
    searchTerms: ["house", "mixer", "afterparty", "WWDC"],
    enabled: true,
  },
  {
    source: "x",
    searchTerms: [
      "wwdc sf meetup",
      "sf hacker house june",
      "wwdc party",
      "wwdc brewery",
    ],
    enabled: true,
  },
  {
    source: "eventbrite",
    searchTerms: ["WWDC", "SF tech meetup", "developer conference"],
    enabled: true,
  },
];
