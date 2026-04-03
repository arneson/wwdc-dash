"use client";

import { WWDCEvent, SOURCE_CONFIG, InterestLevel } from "@/lib/types";
import {
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Lock,
  Star,
  ChevronDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const INTEREST_STYLES: Record<
  InterestLevel,
  { bg: string; border: string; label: string; emoji: string }
> = {
  "must-go": {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    label: "Must Go",
    emoji: "🔥",
  },
  interested: {
    bg: "bg-blue-50",
    border: "border-blue-400",
    label: "Interested",
    emoji: "👀",
  },
  maybe: {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    label: "Maybe",
    emoji: "🤔",
  },
  skip: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    label: "Skip",
    emoji: "⏭️",
  },
};

const RSVP_BADGES: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "bg-green-100 text-green-800", text: "Confirmed" },
  applied: { bg: "bg-amber-100 text-amber-800", text: "Applied" },
  waitlisted: { bg: "bg-purple-100 text-purple-800", text: "Waitlisted" },
  none: { bg: "bg-gray-100 text-gray-600", text: "No RSVP" },
};

interface EventCardProps {
  event: WWDCEvent;
  onUpdateInterest: (id: string, level: InterestLevel) => void;
  onUpdateRsvp: (id: string, status: WWDCEvent["rsvpStatus"]) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}

export default function EventCard({
  event,
  onUpdateInterest,
  onUpdateRsvp,
  onUpdateNotes,
  onDelete,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(event.notes);
  const interest = INTEREST_STYLES[event.interestLevel];
  const source = SOURCE_CONFIG[event.source];
  const rsvp = RSVP_BADGES[event.rsvpStatus];

  const dateStr = format(parseISO(event.date), "EEE, MMM d");

  return (
    <div
      className={`rounded-xl border-2 ${interest.border} ${interest.bg} p-4 transition-all hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: source.color }}
            >
              {source.icon} {source.label}
            </span>
            {event.inviteOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                <Lock size={10} /> Invite Only
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rsvp.bg}`}>
              {rsvp.text}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {event.title}
          </h3>
        </div>
        <span className="text-2xl flex-shrink-0" title={interest.label}>
          {interest.emoji}
        </span>
      </div>

      {/* Key Info */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {dateStr} · {event.time}
          {event.endTime ? `–${event.endTime}` : ""}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={14} />
          {event.neighborhood || event.location.split(",")[0]}
        </span>
        {event.attendeeCount && (
          <span className="flex items-center gap-1">
            <Users size={14} />
            {event.attendeeCount}
          </span>
        )}
        <span className="font-medium text-gray-700">{event.cost}</span>
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1">
        {event.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs bg-white/70 text-gray-600 border border-gray-200"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronDown
          size={16}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        {expanded ? "Less" : "More"}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-200/50 pt-3">
          <p className="text-sm text-gray-700">{event.description}</p>

          <div className="text-sm text-gray-600">
            <strong>Host:</strong> {event.host}
            <br />
            <strong>Location:</strong> {event.location}
          </div>

          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={14} /> Open on {source.label}
            </a>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Notes
            </label>
            {editingNotes ? (
              <div className="mt-1">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none bg-white"
                  rows={2}
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      onUpdateNotes(event.id, notes);
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNotes(event.notes);
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setEditingNotes(true)}
                className="mt-1 text-sm text-gray-600 cursor-pointer hover:bg-white/50 rounded p-1 -m-1"
              >
                {event.notes || "Click to add notes..."}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Interest level */}
            <div className="flex items-center gap-1">
              <Star size={14} className="text-gray-500" />
              <select
                value={event.interestLevel}
                onChange={(e) =>
                  onUpdateInterest(event.id, e.target.value as InterestLevel)
                }
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
              >
                <option value="must-go">🔥 Must Go</option>
                <option value="interested">👀 Interested</option>
                <option value="maybe">🤔 Maybe</option>
                <option value="skip">⏭️ Skip</option>
              </select>
            </div>

            {/* RSVP status */}
            <select
              value={event.rsvpStatus}
              onChange={(e) =>
                onUpdateRsvp(
                  event.id,
                  e.target.value as WWDCEvent["rsvpStatus"]
                )
              }
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
            >
              <option value="none">No RSVP</option>
              <option value="applied">Applied</option>
              <option value="confirmed">Confirmed</option>
              <option value="waitlisted">Waitlisted</option>
            </select>

            <button
              onClick={() => {
                if (confirm("Delete this event?")) onDelete(event.id);
              }}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
