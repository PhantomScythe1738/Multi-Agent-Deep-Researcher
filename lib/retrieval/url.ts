/** Tracking params dropped during canonicalization (dedup only; not stored). */
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "gclsrc",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
];

/**
 * Produce a canonical form of a URL for de-duplication:
 * lowercase host, drop default ports, drop tracking params + fragment,
 * and normalize a trailing slash. Falls back to the trimmed input when the
 * URL cannot be parsed. Pure and deterministic.
 */
export function canonicalizeUrl(input: string): string {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);

  // Sort remaining params for stable comparison.
  url.searchParams.sort();

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;

  return url.toString();
}
