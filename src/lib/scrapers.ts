/**
 * Scraper utilities for each event source.
 *
 * These generate URLs for manual scanning and provide fetch helpers
 * that can be wired up to API routes for automated scraping.
 *
 * NOTE: Most platforms don't have public APIs, so the primary workflow is:
 * 1. Dashboard generates search URLs for each source + term
 * 2. You open them in your browser
 * 3. Manually add interesting events via the "Add Event" form
 *
 * For Luma and Eventbrite, we also provide API-based scrapers
 * that can be enabled with API keys in .env.local
 */

export interface SearchLink {
  source: string;
  term: string;
  url: string;
}

export function generateLumaSearchLinks(terms: string[]): SearchLink[] {
  return terms.map((term) => ({
    source: "luma",
    term,
    url: `https://lu.ma/discover?query=${encodeURIComponent(term)}&location=San+Francisco`,
  }));
}

export function generatePartifulSearchLinks(terms: string[]): SearchLink[] {
  // Partiful doesn't have great public search — use Google site search
  return terms.map((term) => ({
    source: "partiful",
    term,
    url: `https://www.google.com/search?q=site:partiful.com+${encodeURIComponent(term)}+san+francisco+june+2026`,
  }));
}

export function generateXSearchLinks(terms: string[]): SearchLink[] {
  return terms.map((term) => ({
    source: "x",
    term,
    url: `https://x.com/search?q=${encodeURIComponent(term)}&f=live`,
  }));
}

export function generateEventbriteSearchLinks(terms: string[]): SearchLink[] {
  return terms.map((term) => ({
    source: "eventbrite",
    term,
    url: `https://www.eventbrite.com/d/ca--san-francisco/${encodeURIComponent(term.replace(/ /g, "-"))}/`,
  }));
}

export function generateAllSearchLinks(
  configs: { source: string; searchTerms: string[]; enabled: boolean }[]
): SearchLink[] {
  const links: SearchLink[] = [];
  for (const config of configs) {
    if (!config.enabled) continue;
    switch (config.source) {
      case "luma":
        links.push(...generateLumaSearchLinks(config.searchTerms));
        break;
      case "partiful":
        links.push(...generatePartifulSearchLinks(config.searchTerms));
        break;
      case "x":
        links.push(...generateXSearchLinks(config.searchTerms));
        break;
      case "eventbrite":
        links.push(...generateEventbriteSearchLinks(config.searchTerms));
        break;
    }
  }
  return links;
}
