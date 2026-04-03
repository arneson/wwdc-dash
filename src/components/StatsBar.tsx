"use client";

import { WWDCEvent } from "@/lib/types";

interface StatsBarProps {
  events: WWDCEvent[];
}

export default function StatsBar({ events }: StatsBarProps) {
  const mustGo = events.filter((e) => e.interestLevel === "must-go").length;
  const confirmed = events.filter((e) => e.rsvpStatus === "confirmed").length;
  const applied = events.filter((e) => e.rsvpStatus === "applied").length;
  const breweries = events.filter((e) => e.tags.includes("brewery")).length;
  const startups = events.filter((e) =>
    e.tags.some((t) => ["startup", "demo-night", "hack-house"].includes(t))
  ).length;

  const stats = [
    { label: "Total Events", value: events.length, color: "text-gray-900" },
    { label: "Must Go", value: mustGo, color: "text-emerald-600" },
    { label: "Confirmed", value: confirmed, color: "text-green-600" },
    { label: "Applied", value: applied, color: "text-amber-600" },
    { label: "Startup/Hack", value: startups, color: "text-purple-600" },
    { label: "Breweries", value: breweries, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-200 p-3 text-center"
        >
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
