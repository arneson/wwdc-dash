import { WWDCEvent } from "./types";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const SEEN_FILE = path.join(DATA_DIR, "seen-urls.json");
const SCAN_LOG_FILE = path.join(DATA_DIR, "scan-log.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --- Events ---

export function readEventsFromDisk(): WWDCEvent[] {
  ensureDataDir();
  if (!fs.existsSync(EVENTS_FILE)) return [];
  const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
  return JSON.parse(raw);
}

export function writeEventsToDisk(events: WWDCEvent[]) {
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

export function appendEventsToDisk(newEvents: WWDCEvent[]): {
  added: WWDCEvent[];
  duplicates: number;
} {
  const existing = readEventsFromDisk();
  const seenUrls = getSeenUrls();
  const existingTitles = new Set(
    existing.map((e) => e.title.toLowerCase().trim())
  );

  const added: WWDCEvent[] = [];
  let duplicates = 0;

  for (const event of newEvents) {
    const titleKey = event.title.toLowerCase().trim();
    if (
      seenUrls.has(event.sourceUrl) ||
      existingTitles.has(titleKey)
    ) {
      duplicates++;
      continue;
    }
    added.push(event);
    existingTitles.add(titleKey);
    if (event.sourceUrl) {
      seenUrls.add(event.sourceUrl);
    }
  }

  if (added.length > 0) {
    writeEventsToDisk([...existing, ...added]);
    saveSeenUrls(seenUrls);
  }

  return { added, duplicates };
}

// --- Seen URLs (dedup) ---

function getSeenUrls(): Set<string> {
  ensureDataDir();
  if (!fs.existsSync(SEEN_FILE)) return new Set();
  const raw = fs.readFileSync(SEEN_FILE, "utf-8");
  return new Set(JSON.parse(raw));
}

function saveSeenUrls(urls: Set<string>) {
  ensureDataDir();
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...urls], null, 2));
}

// --- Scan Log ---

export interface ScanLogEntry {
  timestamp: string;
  source: string;
  term: string;
  found: number;
  added: number;
  error?: string;
}

export function readScanLog(): ScanLogEntry[] {
  ensureDataDir();
  if (!fs.existsSync(SCAN_LOG_FILE)) return [];
  const raw = fs.readFileSync(SCAN_LOG_FILE, "utf-8");
  return JSON.parse(raw);
}

export function appendScanLog(entry: ScanLogEntry) {
  const log = readScanLog();
  log.push(entry);
  // Keep last 200 entries
  const trimmed = log.slice(-200);
  fs.writeFileSync(SCAN_LOG_FILE, JSON.stringify(trimmed, null, 2));
}
