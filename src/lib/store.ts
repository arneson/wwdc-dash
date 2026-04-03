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
