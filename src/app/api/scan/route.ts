import { NextRequest, NextResponse } from "next/server";
import { searchLuma, searchEventbrite } from "@/lib/scrapers/index";
import {
  appendEventsToDisk,
  appendScanLog,
  readScanLog,
} from "@/lib/server-store";
import { DEFAULT_SCAN_CONFIGS } from "@/lib/types";

// Protect the cron with a secret (optional but recommended)
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured = open
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: {
    source: string;
    term: string;
    found: number;
    added: number;
    error?: string;
  }[] = [];

  // Run Luma searches
  const lumaConfig = DEFAULT_SCAN_CONFIGS.find((c) => c.source === "luma");
  if (lumaConfig?.enabled) {
    for (const term of lumaConfig.searchTerms) {
      try {
        const events = await searchLuma(term);
        const { added, duplicates } = appendEventsToDisk(events);
        const entry = {
          timestamp: new Date().toISOString(),
          source: "luma",
          term,
          found: events.length,
          added: added.length,
        };
        appendScanLog(entry);
        results.push(entry);
      } catch (err) {
        const entry = {
          timestamp: new Date().toISOString(),
          source: "luma",
          term,
          found: 0,
          added: 0,
          error: String(err),
        };
        appendScanLog(entry);
        results.push(entry);
      }
    }
  }

  // Run Eventbrite searches (only if token is set)
  const ebConfig = DEFAULT_SCAN_CONFIGS.find((c) => c.source === "eventbrite");
  if (ebConfig?.enabled && process.env.EVENTBRITE_TOKEN) {
    for (const term of ebConfig.searchTerms) {
      try {
        const events = await searchEventbrite(term);
        const { added } = appendEventsToDisk(events);
        const entry = {
          timestamp: new Date().toISOString(),
          source: "eventbrite",
          term,
          found: events.length,
          added: added.length,
        };
        appendScanLog(entry);
        results.push(entry);
      } catch (err) {
        const entry = {
          timestamp: new Date().toISOString(),
          source: "eventbrite",
          term,
          found: 0,
          added: 0,
          error: String(err),
        };
        appendScanLog(entry);
        results.push(entry);
      }
    }
  }

  const totalFound = results.reduce((s, r) => s + r.found, 0);
  const totalAdded = results.reduce((s, r) => s + r.added, 0);

  return NextResponse.json({
    success: true,
    summary: { totalFound, totalAdded, searches: results.length },
    results,
  });
}

// GET returns the scan log
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = readScanLog();
  return NextResponse.json({ log });
}
