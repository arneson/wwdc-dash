"use client";

import { WWDCEvent, ScanConfig, DEFAULT_SCAN_CONFIGS, InterestLevel } from "./types";
import { SEED_EVENTS } from "./seed-events";

const EVENTS_KEY = "wwdc-dash-events";
const CONFIGS_KEY = "wwdc-dash-scan-configs";

export function getEvents(): WWDCEvent[] {
  if (typeof window === "undefined") return SEED_EVENTS;
  const stored = localStorage.getItem(EVENTS_KEY);
  if (!stored) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(SEED_EVENTS));
    return SEED_EVENTS;
  }
  return JSON.parse(stored);
}

export function saveEvents(events: WWDCEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function updateEvent(id: string, updates: Partial<WWDCEvent>) {
  const events = getEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return;
  events[idx] = { ...events[idx], ...updates };
  saveEvents(events);
  return events;
}

export function addEvent(event: WWDCEvent) {
  const events = getEvents();
  events.push(event);
  saveEvents(events);
  return events;
}

export function deleteEvent(id: string) {
  const events = getEvents().filter((e) => e.id !== id);
  saveEvents(events);
  return events;
}

export function getScanConfigs(): ScanConfig[] {
  if (typeof window === "undefined") return DEFAULT_SCAN_CONFIGS;
  const stored = localStorage.getItem(CONFIGS_KEY);
  if (!stored) {
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(DEFAULT_SCAN_CONFIGS));
    return DEFAULT_SCAN_CONFIGS;
  }
  return JSON.parse(stored);
}

export function saveScanConfigs(configs: ScanConfig[]) {
  localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
}

export function setInterestLevel(id: string, level: InterestLevel) {
  return updateEvent(id, { interestLevel: level });
}

export function mergeScannedEvents(newEvents: WWDCEvent[]): {
  added: WWDCEvent[];
  duplicates: number;
} {
  const existing = getEvents();
  const existingKeys = new Set(
    existing.map((e) => e.sourceUrl || e.title.toLowerCase().trim())
  );

  const added: WWDCEvent[] = [];
  let duplicates = 0;

  for (const event of newEvents) {
    const key = event.sourceUrl || event.title.toLowerCase().trim();
    if (existingKeys.has(key)) {
      duplicates++;
      continue;
    }
    added.push(event);
    existingKeys.add(key);
  }

  if (added.length > 0) {
    saveEvents([...existing, ...added]);
  }

  return { added, duplicates };
}

const SCAN_LOG_KEY = "wwdc-dash-scan-log";

export interface ScanLogEntry {
  timestamp: string;
  source: string;
  term: string;
  found: number;
  added: number;
  error?: string;
}

export function getScanLog(): ScanLogEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(SCAN_LOG_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function appendScanLog(entries: ScanLogEntry[]) {
  const log = getScanLog();
  log.push(...entries);
  // Keep last 100
  const trimmed = log.slice(-100);
  localStorage.setItem(SCAN_LOG_KEY, JSON.stringify(trimmed));
}
