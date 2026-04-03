import { NextRequest, NextResponse } from "next/server";
import {
  readEventsFromDisk,
  writeEventsToDisk,
  appendEventsToDisk,
} from "@/lib/server-store";
import { WWDCEvent } from "@/lib/types";
import { SEED_EVENTS } from "@/lib/seed-events";

// GET all events
export async function GET() {
  let events = readEventsFromDisk();

  // Seed with demo events if empty
  if (events.length === 0) {
    writeEventsToDisk(SEED_EVENTS);
    events = SEED_EVENTS;
  }

  return NextResponse.json({ events });
}

// POST to add a new event
export async function POST(req: NextRequest) {
  const body = await req.json();
  const event: WWDCEvent = body.event;

  if (!event || !event.title) {
    return NextResponse.json(
      { error: "Missing event data" },
      { status: 400 }
    );
  }

  if (!event.id) {
    event.id = `manual-${Date.now()}`;
  }
  if (!event.addedAt) {
    event.addedAt = new Date().toISOString();
  }

  const { added } = appendEventsToDisk([event]);

  return NextResponse.json({
    success: true,
    added: added.length,
    event: added[0] || null,
  });
}

// PUT to update an event
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const events = readEventsFromDisk();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  events[idx] = { ...events[idx], ...updates };
  writeEventsToDisk(events);

  return NextResponse.json({ success: true, event: events[idx] });
}

// DELETE an event
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const events = readEventsFromDisk();
  const filtered = events.filter((e) => e.id !== id);

  if (filtered.length === events.length) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  writeEventsToDisk(filtered);
  return NextResponse.json({ success: true });
}
