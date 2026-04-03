"use client";

import { WWDCEvent, SOURCE_CONFIG, InterestLevel } from "@/lib/types";
import { format, parseISO } from "date-fns";

const INTEREST_COLORS: Record<InterestLevel, string> = {
  "must-go": "bg-emerald-500",
  interested: "bg-blue-500",
  maybe: "bg-yellow-500",
  skip: "bg-gray-300",
};

interface DayTimelineProps {
  events: WWDCEvent[];
  selectedDate: string;
}

export default function DayTimeline({ events, selectedDate }: DayTimelineProps) {
  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (dayEvents.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        No events on this day
      </div>
    );
  }

  return (
    <div className="relative space-y-3 pl-6">
      {/* Timeline line */}
      <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />

      {dayEvents.map((event) => {
        const source = SOURCE_CONFIG[event.source];
        return (
          <div key={event.id} className="relative">
            {/* Timeline dot */}
            <div
              className={`absolute -left-4 top-2 w-3 h-3 rounded-full border-2 border-white ${INTEREST_COLORS[event.interestLevel]}`}
            />

            <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 font-mono">
                    {event.time}
                    {event.endTime ? `–${event.endTime}` : ""}
                  </div>
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {event.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {event.neighborhood || event.location.split(",")[0]}
                  </div>
                </div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded text-white flex-shrink-0"
                  style={{ backgroundColor: source.color }}
                >
                  {source.icon}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
