"use client";

import { SearchLink } from "@/lib/scrapers";
import { SOURCE_CONFIG, EventSource } from "@/lib/types";
import { ExternalLink, Search } from "lucide-react";

interface ScanLinksProps {
  links: SearchLink[];
}

export default function ScanLinks({ links }: ScanLinksProps) {
  const grouped = links.reduce(
    (acc, link) => {
      if (!acc[link.source]) acc[link.source] = [];
      acc[link.source].push(link);
      return acc;
    },
    {} as Record<string, SearchLink[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([source, sourceLinks]) => {
        const config = SOURCE_CONFIG[source as EventSource];
        return (
          <div key={source}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config?.color }}
              />
              {config?.label || source}
            </h3>
            <div className="flex flex-wrap gap-2">
              {sourceLinks.map((link) => (
                <a
                  key={`${link.source}-${link.term}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <Search size={12} className="text-gray-400" />
                  <span className="text-gray-700">{link.term}</span>
                  <ExternalLink size={10} className="text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
