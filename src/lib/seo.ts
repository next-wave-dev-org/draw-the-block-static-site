// Shared SEO helpers: canonical URLs, description cleanup, and schema.org JSON-LD.

export const SITE_NAME = "Draw The Block";
export const DEFAULT_DESCRIPTION =
  "Draw The Block is a Seattle-based art collective hosting community art markets, vendor pop-ups, and creative events.";
export const DEFAULT_OG_IMAGE = "/images/og-default.png";
export const TIME_ZONE = "America/Los_Angeles";

/** Absolute canonical URL. Always the trailing-slash form: Netlify 301s `/home` → `/home/`. */
export function canonicalUrl(pathname: string, site: URL | string): string {
  const base = new URL(site);
  let path = pathname || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path)) path += "/";
  return new URL(path, base).href;
}

export function absoluteUrl(src: string | undefined, site: URL | string): string | undefined {
  if (!src) return undefined;
  try {
    return new URL(src, new URL(site)).href;
  } catch {
    return undefined;
  }
}

/** Plain-text meta description: strips markdown/HTML, collapses whitespace, caps ~160 chars. */
export function cleanDescription(raw: string | undefined, fallback = DEFAULT_DESCRIPTION): string {
  const text = (raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return fallback;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : 157).replace(/[,.;:!\s]+$/, "")}…`;
}

/** ISO 8601 in Pacific time with the correct DST offset, e.g. 2026-10-31T12:00:00-07:00. */
export function toPacificISO(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const offsetName =
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-08:00";
  const offset = offsetName === "GMT" ? "+00:00" : offsetName.replace("GMT", "");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/** Combine an event's start date with a free-text end time like "6 PM" or "6:30 pm". */
function endFromTimeString(start: Date, endTime: string | undefined): Date | undefined {
  const m = endTime?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if (!m) return undefined;
  let hour = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") hour += 12;
  const minute = Number(m[2] ?? 0);
  const startPacific = toPacificISO(start); // YYYY-MM-DDTHH:mm:ss±hh:mm
  const date = startPacific.slice(0, 10);
  const offset = startPacific.slice(-6);
  const candidate = new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`,
  );
  return Number.isNaN(candidate.getTime()) || candidate <= start ? undefined : candidate;
}

export const organizationJsonLd = (site: URL | string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: canonicalUrl("/", site),
  logo: absoluteUrl("/web-app-manifest-512x512.png", site),
  description: DEFAULT_DESCRIPTION,
  areaServed: "Seattle, WA",
});

export const websiteJsonLd = (site: URL | string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: canonicalUrl("/", site),
});

interface EventLike {
  title: string;
  startDate: Date;
  endDate?: Date;
  endTime?: string;
  location?: string;
  description?: string;
  image?: string;
}

/**
 * schema.org Event. Returns undefined unless name, start date and location are all
 * present (Google rejects Event markup without them).
 */
export function eventJsonLd(event: EventLike, pageUrl: string, site: URL | string) {
  const location = event.location?.trim();
  if (!event.title || !(event.startDate instanceof Date) || Number.isNaN(event.startDate.getTime()) || !location) {
    return undefined;
  }
  const end = event.endDate ?? endFromTimeString(event.startDate, event.endTime);
  const image = absoluteUrl(event.image, site);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: toPacificISO(event.startDate),
    ...(end ? { endDate: toPacificISO(end) } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: location, address: location },
    ...(image ? { image: [image] } : {}),
    ...(event.description ? { description: cleanDescription(event.description) } : {}),
    url: pageUrl,
    organizer: { "@type": "Organization", name: SITE_NAME, url: canonicalUrl("/", site) },
  };
}

/** Serialize for a <script type="application/ld+json"> — `<` escaped so content can't close the tag. */
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
