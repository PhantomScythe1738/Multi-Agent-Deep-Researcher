import type { AnalysisOutput, InsightsOutput } from "@/lib/ai/schemas";

/** Canonical required report sections (matched case-insensitively as headings). */
export const REQUIRED_SECTIONS = [
  "Executive Summary",
  "Research Scope",
  "Key Findings",
  "Contradictions",
  "Trends",
  "Hypotheses",
  "Evidence Gaps",
  "Sources",
] as const;

const CITATION_RE = /\[(W\d+|P\d+)\]/g;

/** Extract citation tokens like W1, P2 from any text. Pure. */
export function extractCitationTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CITATION_RE)) out.push(m[1]);
  return out;
}

/** Keep only citations that reference a known source key. Pure. */
export function filterValidCitations(citations: string[], validKeys: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of citations) {
    const key = c.replace(/[[\]]/g, "").trim();
    if (validKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

export interface RequiredSectionCheck {
  name: string;
  present: boolean;
}

/** Check which required sections appear as markdown headings. Pure. */
export function validateReportSections(markdown: string): RequiredSectionCheck[] {
  const headings = markdown
    .split("\n")
    .filter((l) => l.trim().startsWith("#"))
    .map((l) => l.replace(/^#+\s*/, "").toLowerCase());
  return REQUIRED_SECTIONS.map((name) => ({
    name,
    present: headings.some((h) => h.includes(name.toLowerCase().split(" ")[0])),
  }));
}

export interface QualityReport {
  score: number; // 0-100 (transparency metric, NOT a truth score)
  citationCoverage: number;
  sourceDiversity: number;
  sectionCompleteness: number;
  contradictionHandling: number;
  totalClaims: number;
  supportedClaims: number;
  unsupportedClaims: number;
  invalidCitationTokens: string[];
  webSourceCount: number;
  pdfSourceCount: number;
  requiredSections: RequiredSectionCheck[];
}

export interface QualityInput {
  analysis: AnalysisOutput;
  insights: InsightsOutput;
  validKeys: Set<string>;
  webSourceCount: number;
  pdfSourceCount: number;
  reportMarkdown: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Deterministic, transparent quality score. Combines citation coverage,
 * source diversity, required-section completeness, and contradiction handling.
 * This measures report hygiene — NOT factual correctness. Pure.
 */
export function computeQuality(input: QualityInput): QualityReport {
  const { analysis, insights, validKeys, webSourceCount, pdfSourceCount, reportMarkdown } = input;

  const claims = analysis.claims;
  const totalClaims = claims.length;
  let supportedClaims = 0;
  const invalid = new Set<string>();

  for (const claim of claims) {
    const valid = filterValidCitations(claim.citations, validKeys);
    if (valid.length > 0) supportedClaims += 1;
    for (const c of claim.citations) {
      const key = c.replace(/[[\]]/g, "").trim();
      if (key && !validKeys.has(key)) invalid.add(key);
    }
  }
  // Also flag invalid citations appearing in insights.
  for (const ins of insights.insights) {
    for (const c of ins.citations) {
      const key = c.replace(/[[\]]/g, "").trim();
      if (key && !validKeys.has(key)) invalid.add(key);
    }
  }

  const unsupportedClaims = totalClaims - supportedClaims;
  const citationCoverage = totalClaims === 0 ? 0 : supportedClaims / totalClaims;

  const usedWeb = webSourceCount > 0;
  const usedPdf = pdfSourceCount > 0;
  const sourceDiversity = usedWeb && usedPdf ? 1 : usedWeb || usedPdf ? 0.6 : 0;

  const sections = validateReportSections(reportMarkdown);
  const sectionCompleteness = sections.filter((s) => s.present).length / sections.length;

  // Contradictions preserved (surfaced) => full marks; deterministic.
  const contradictionHandling = analysis.contradictions.length > 0 ? 1 : 0.7;

  const score = Math.round(
    100 *
      clamp01(
        citationCoverage * 0.4 +
          sourceDiversity * 0.2 +
          sectionCompleteness * 0.25 +
          contradictionHandling * 0.15,
      ),
  );

  return {
    score,
    citationCoverage: Number(citationCoverage.toFixed(2)),
    sourceDiversity,
    sectionCompleteness: Number(sectionCompleteness.toFixed(2)),
    contradictionHandling,
    totalClaims,
    supportedClaims,
    unsupportedClaims,
    invalidCitationTokens: [...invalid],
    webSourceCount,
    pdfSourceCount,
    requiredSections: sections,
  };
}
