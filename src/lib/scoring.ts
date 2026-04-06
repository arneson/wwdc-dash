import { WWDCEvent, InterestLevel } from "./types";

/**
 * Auto-score events based on user profile.
 * Higher scores = more relevant to the user's interests.
 *
 * Profile: Fullstack dev, mobile focus, tech lead, startup experience.
 * Interests: startups, breweries, AI, iOS/Swift.
 * Preferred vibes: hack houses, demo nights, brewery meetups.
 */

interface ScoreRule {
  keywords: string[];
  points: number;
}

const SCORE_RULES: ScoreRule[] = [
  // Strong signals (things the user specifically wants)
  { keywords: ["brewery", "brewing", "beer", "taproom"], points: 15 },
  { keywords: ["hack house", "hacker house"], points: 15 },
  { keywords: ["demo night", "demo day", "pitch night"], points: 12 },
  { keywords: ["wwdc"], points: 10 },

  // Core interests
  { keywords: ["startup", "founder", "founding"], points: 10 },
  { keywords: ["ai", "machine learning", "llm", "coreml"], points: 8 },
  { keywords: ["ios", "swift", "swiftui", "xcode", "apple"], points: 8 },
  { keywords: ["mobile", "app dev"], points: 6 },

  // Good vibes
  { keywords: ["mixer", "networking", "happy hour"], points: 5 },
  { keywords: ["afterparty", "after party"], points: 4 },
  { keywords: ["workshop", "hands-on", "lab"], points: 5 },

  // Community signals
  { keywords: ["yc", "y combinator", "a16z", "sequoia"], points: 8 },
  { keywords: ["indie", "indie dev", "bootstrapped"], points: 6 },
  { keywords: ["tech lead", "engineering leader", "staff eng"], points: 5 },

  // Mild negatives (not the user's scene, but don't skip)
  { keywords: ["recruiting", "hiring fair", "job fair"], points: -5 },
  { keywords: ["enterprise", "corporate"], points: -3 },
  { keywords: ["beginner", "intro to coding"], points: -3 },
];

export function scoreEvent(event: WWDCEvent): number {
  const text =
    `${event.title} ${event.description} ${event.host} ${event.tags.join(" ")}`.toLowerCase();

  let score = 0;
  for (const rule of SCORE_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      score += rule.points;
    }
  }

  // Bonus for Luma events (highest signal source)
  if (event.source === "luma") score += 3;

  // Bonus for free events
  if (event.cost.toLowerCase() === "free") score += 2;

  return score;
}

export function autoInterestLevel(score: number): InterestLevel {
  if (score >= 20) return "must-go";
  if (score >= 10) return "interested";
  if (score >= 0) return "maybe";
  return "skip";
}

export function scoreAndRankEvents(events: WWDCEvent[]): WWDCEvent[] {
  return events.map((event) => {
    const score = scoreEvent(event);
    return {
      ...event,
      interestLevel: autoInterestLevel(score),
    };
  });
}
