"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  WWDCEvent,
  EventSource,
  EventTag,
  InterestLevel,
  SOURCE_CONFIG,
  ScanConfig,
} from "@/lib/types";
import { getScanConfigs, saveScanConfigs } from "@/lib/store";
import { generateAllSearchLinks } from "@/lib/scrapers";
import EventCard from "@/components/EventCard";
import AddEventModal from "@/components/AddEventModal";
import StatsBar from "@/components/StatsBar";
import ScanLinks from "@/components/ScanLinks";
import ScanConfigPanel from "@/components/ScanConfigPanel";
import DayTimeline from "@/components/DayTimeline";
import {
  Plus,
  Search,
  Calendar,
  Settings,
  Radar,
  Filter,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

const WWDC_DATES = [
  "2025-06-09",
  "2025-06-10",
  "2025-06-11",
  "2025-06-12",
  "2025-06-13",
];

const DAY_LABELS: Record<string, string> = {
  "2025-06-09": "Mon 9",
  "2025-06-10": "Tue 10",
  "2025-06-11": "Wed 11",
  "2025-06-12": "Thu 12",
  "2025-06-13": "Fri 13",
};

type Tab = "events" | "timeline" | "scan" | "config";

interface ScanResult {
  source: string;
  term: string;
  found: number;
  added: number;
  error?: string;
}

interface ScanLogEntry {
  timestamp: string;
  source: string;
  term: string;
  found: number;
  added: number;
  error?: string;
}

export default function Dashboard() {
  const [events, setEvents] = useState<WWDCEvent[]>([]);
  const [configs, setConfigs] = useState<ScanConfig[]>([]);
  const [tab, setTab] = useState<Tab>("events");
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [lastScanResults, setLastScanResults] = useState<ScanResult[] | null>(null);
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);
  const [newEventsBanner, setNewEventsBanner] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<EventSource | "all">("all");
  const [interestFilter, setInterestFilter] = useState<InterestLevel | "all">("all");
  const [tagFilter, setTagFilter] = useState<EventTag | "all">("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Timeline
  const [selectedDate, setSelectedDate] = useState(WWDC_DATES[0]);

  // Track event count for new event detection
  const prevEventCountRef = useRef(0);

  // Fetch events from server API
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      const serverEvents: WWDCEvent[] = data.events || [];

      if (prevEventCountRef.current > 0 && serverEvents.length > prevEventCountRef.current) {
        setNewEventsBanner(serverEvents.length - prevEventCountRef.current);
        setTimeout(() => setNewEventsBanner(0), 8000);
      }
      prevEventCountRef.current = serverEvents.length;

      setEvents(serverEvents);
    } catch {
      // Fallback: if server API fails, events stay as-is
    }
  }, []);

  // Fetch scan log
  const fetchScanLog = useCallback(async () => {
    try {
      const res = await fetch("/api/scan");
      const data = await res.json();
      setScanLog(data.log || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setConfigs(getScanConfigs());
    fetchEvents();
    fetchScanLog();
    setMounted(true);

    // Poll for new events every 60s
    const interval = setInterval(fetchEvents, 60_000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchScanLog]);

  // Trigger a scan manually
  const triggerScan = useCallback(async () => {
    setScanning(true);
    setLastScanResults(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      setLastScanResults(data.results || []);
      // Refresh events after scan
      await fetchEvents();
      await fetchScanLog();
    } catch (err) {
      setLastScanResults([{ source: "error", term: "", found: 0, added: 0, error: String(err) }]);
    } finally {
      setScanning(false);
    }
  }, [fetchEvents, fetchScanLog]);

  // Server-side event updates
  const handleUpdateInterest = useCallback(
    async (id: string, level: InterestLevel) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, interestLevel: level } : e))
      );
      await fetch("/api/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates: { interestLevel: level } }),
      });
    },
    []
  );

  const handleUpdateRsvp = useCallback(
    async (id: string, status: WWDCEvent["rsvpStatus"]) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, rsvpStatus: status } : e))
      );
      await fetch("/api/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates: { rsvpStatus: status } }),
      });
    },
    []
  );

  const handleUpdateNotes = useCallback(async (id: string, notes: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, notes } : e))
    );
    await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates: { notes } }),
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
  }, []);

  const handleAddEvent = useCallback(
    async (event: WWDCEvent) => {
      setEvents((prev) => [...prev, event]);
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
    },
    []
  );

  const handleSaveConfigs = useCallback((updated: ScanConfig[]) => {
    setConfigs(updated);
    saveScanConfigs(updated);
  }, []);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.host.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q)
      );
    }

    if (sourceFilter !== "all") {
      result = result.filter((e) => e.source === sourceFilter);
    }

    if (interestFilter !== "all") {
      result = result.filter((e) => e.interestLevel === interestFilter);
    }

    if (tagFilter !== "all") {
      result = result.filter((e) => e.tags.includes(tagFilter));
    }

    if (dateFilter !== "all") {
      result = result.filter((e) => e.date === dateFilter);
    }

    const interestOrder: Record<InterestLevel, number> = {
      "must-go": 0,
      interested: 1,
      maybe: 2,
      skip: 3,
    };
    result.sort((a, b) => {
      const interestDiff =
        interestOrder[a.interestLevel] - interestOrder[b.interestLevel];
      if (interestDiff !== 0) return interestDiff;
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });

    return result;
  }, [events, searchQuery, sourceFilter, interestFilter, tagFilter, dateFilter]);

  const scanLinks = useMemo(() => generateAllSearchLinks(configs), [configs]);

  const recentScans = useMemo(() => {
    return scanLog.slice(-10).reverse();
  }, [scanLog]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* New events banner */}
      {newEventsBanner > 0 && (
        <div className="bg-emerald-500 text-white text-center py-2 text-sm font-medium">
          <Zap size={14} className="inline mr-1" />
          {newEventsBanner} new event{newEventsBanner > 1 ? "s" : ""} found!
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                WWDC Week Dashboard
              </h1>
              <p className="text-xs text-gray-500">
                June 9–13, 2025 · San Francisco · Auto-scanning Luma
                {process.env.NEXT_PUBLIC_EVENTBRITE_ENABLED === "true" ? " + Eventbrite" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerScan}
                disabled={scanning}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  scanning
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {scanning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {scanning ? "Scanning..." : "Scan Now"}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Plus size={16} />
                Add Event
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 -mb-px">
            {[
              { id: "events" as Tab, label: "Events", icon: Calendar },
              { id: "timeline" as Tab, label: "Timeline", icon: Calendar },
              { id: "scan" as Tab, label: "Scan", icon: Radar },
              { id: "config" as Tab, label: "Config", icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === id
                    ? "bg-gray-50 text-gray-900 border border-gray-200 border-b-gray-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <StatsBar events={events} />

        {/* Scan results toast */}
        {lastScanResults && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Last Scan Results</h3>
              <button
                onClick={() => setLastScanResults(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-1">
              {lastScanResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.error ? (
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  ) : r.added > 0 ? (
                    <Zap size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle size={14} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-gray-600">
                    <span className="font-medium">{r.source}</span>
                    {r.term && ` "${r.term}"`}
                    {" — "}
                    {r.error ? (
                      <span className="text-red-600">{r.error}</span>
                    ) : (
                      <>
                        {r.found} found, {r.added} new
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {tab === "events" && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, hosts, locations..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm transition-colors ${
                  showFilters
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Filter size={14} />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as EventSource | "all")}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Sources</option>
                    {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Interest</label>
                  <select
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value as InterestLevel | "all")}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="must-go">Must Go</option>
                    <option value="interested">Interested</option>
                    <option value="maybe">Maybe</option>
                    <option value="skip">Skip</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tag</label>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value as EventTag | "all")}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Tags</option>
                    {["wwdc","ai","startup","demo-night","hack-house","afterparty","mixer","brewery","meetup","workshop","keynote","networking"].map((tag) => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Days</option>
                    {WWDC_DATES.map((d) => (
                      <option key={d} value={d}>{DAY_LABELS[d]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No events match your filters</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onUpdateInterest={handleUpdateInterest}
                    onUpdateRsvp={handleUpdateRsvp}
                    onUpdateNotes={handleUpdateNotes}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {tab === "timeline" && (
          <div className="mt-6">
            <div className="flex gap-2 mb-4">
              {WWDC_DATES.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedDate === d
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {DAY_LABELS[selectedDate]} — Schedule
              </h2>
              <DayTimeline events={events} selectedDate={selectedDate} />
            </div>
          </div>
        )}

        {/* Scan Tab */}
        {tab === "scan" && (
          <div className="mt-6 space-y-4">
            {/* Auto scan */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Auto Scanner</h2>
                  <p className="text-sm text-gray-500">
                    Luma is scraped automatically via cron. Hit Scan Now or set up the cron below.
                  </p>
                </div>
                <button
                  onClick={triggerScan}
                  disabled={scanning}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    scanning
                      ? "bg-gray-100 text-gray-400"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {scanning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {scanning ? "Scanning..." : "Scan Now"}
                </button>
              </div>

              {/* Recent scan log */}
              {recentScans.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Recent Scans
                  </h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {recentScans.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              SOURCE_CONFIG[entry.source as EventSource]?.color || "#999",
                          }}
                        />
                        <span className="text-gray-700">{entry.term}</span>
                        <span>
                          {entry.found} found · {entry.added} new
                        </span>
                        {entry.error && (
                          <span className="text-red-500">{entry.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cron setup instructions */}
            <div className="bg-gray-900 rounded-xl p-4 text-sm text-gray-300 font-mono">
              <h3 className="text-white font-sans font-semibold text-sm mb-2">
                Cron Setup (every 30 min)
              </h3>
              <p className="text-gray-400 font-sans text-xs mb-3">
                Add to your crontab, or use a service like cron-job.org / Vercel Cron:
              </p>
              <code className="block bg-black/30 rounded-lg p-3 text-green-400 text-xs overflow-x-auto">
                */30 * * * * curl -X POST http://localhost:3000/api/scan
              </code>
              <p className="text-gray-400 font-sans text-xs mt-3">
                To protect the endpoint, set <code className="text-gray-300">CRON_SECRET</code> in{" "}
                <code className="text-gray-300">.env.local</code> and add the header:
              </p>
              <code className="block bg-black/30 rounded-lg p-3 text-green-400 text-xs overflow-x-auto mt-1">
                curl -X POST -H &quot;Authorization: Bearer YOUR_SECRET&quot; http://localhost:3000/api/scan
              </code>
            </div>

            {/* Manual scan links */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Manual Scan Links
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                For X and Partiful (no API), open these in your browser:
              </p>
              <ScanLinks links={scanLinks} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Pro tip:</strong> Luma is auto-scraped. X and Partiful
              are manual — check X replies for invite-only events, the real
              events are often in the replies.
            </div>
          </div>
        )}

        {/* Config Tab */}
        {tab === "config" && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Scan Configuration
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Configure search terms for each event source. These are used by
              both auto-scan (Luma, Eventbrite) and manual scan links (X, Partiful).
            </p>
            <ScanConfigPanel configs={configs} onSave={handleSaveConfigs} />

            <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Your Profile</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Role:</strong> Fullstack dev, mobile focus, tech lead</p>
                <p><strong>Interests:</strong> Startups, breweries, AI, iOS/Swift</p>
                <p><strong>Vibe:</strong> Hack houses, demo nights, brewery meetups</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddEventModal
          onAdd={handleAddEvent}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
