import type { WebSource, PdfEvidence } from "@/lib/retrieval/types";
import type { AnalysisOutput, InsightsOutput, PlannerOutput } from "@/lib/ai/schemas";
import { filterValidCitations } from "@/lib/report/validate";

export interface ReportInput {
  question: string;
  plan: PlannerOutput | null;
  webSources: WebSource[];
  pdfEvidence: PdfEvidence[];
  analysis: AnalysisOutput;
  insights: InsightsOutput;
  warnings: string[];
  mode: "live" | "demo";
}

/** Render valid citation keys as "[W1][P2]" (invalid keys dropped). */
function renderCitations(citations: string[], validKeys: Set<string>): string {
  const valid = filterValidCitations(citations, validKeys);
  if (valid.length === 0) return "";
  return " " + valid.map((k) => `[${k}]`).join("");
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "_None identified._";
  return items.map((i) => `- ${i}`).join("\n");
}

/**
 * Build the final Markdown report deterministically from validated structured
 * outputs. No LLM call. Invalid citations are dropped; contradictions, gaps,
 * and limitations are always surfaced; hypotheses are explicitly labelled.
 */
export function buildReport(input: ReportInput): string {
  const { question, plan, webSources, pdfEvidence, analysis, insights, warnings, mode } = input;
  const validKeys = new Set<string>([
    ...webSources.map((s) => s.key),
    ...pdfEvidence.map((e) => e.key),
  ]);

  const lines: string[] = [];

  lines.push(`# Research Report`);
  lines.push("");
  lines.push(`**Question:** ${question}`);
  if (mode === "demo") {
    lines.push("");
    lines.push("> **Demo Sample — not live research.**");
  }
  lines.push("");

  // 1. Executive Summary
  lines.push("## Executive Summary");
  const topFindings = analysis.claims.slice(0, 3);
  if (topFindings.length > 0) {
    lines.push(
      `This report synthesizes ${webSources.length} web source(s) and ${pdfEvidence.length} PDF excerpt(s) to address the question above. Key points:`,
    );
    lines.push("");
    for (const c of topFindings) {
      lines.push(`- ${c.statement}${renderCitations(c.citations, validKeys)}`);
    }
  } else {
    lines.push(
      "The available evidence was insufficient to establish confident findings. See Evidence Gaps below.",
    );
  }
  lines.push("");

  // 2. Research Scope
  lines.push("## Research Scope");
  if (plan?.objective) lines.push(`**Objective:** ${plan.objective}`);
  lines.push("");
  lines.push("**Evidence requirements:**");
  lines.push(bulletList(plan?.evidenceRequirements ?? []));
  lines.push("");

  // 3. Key Findings
  lines.push("## Key Findings");
  if (analysis.claims.length > 0) {
    for (const c of analysis.claims) {
      lines.push(
        `- **(${c.confidence})** ${c.statement}${renderCitations(c.citations, validKeys)}`,
      );
    }
  } else {
    lines.push("_No well-supported findings were established from the evidence._");
  }
  lines.push("");

  // 4. Contradictions and disagreements
  lines.push("## Contradictions and Disagreements");
  if (analysis.contradictions.length > 0) {
    for (const c of analysis.contradictions) {
      lines.push(`- ${c.description}${renderCitations(c.citations, validKeys)}`);
    }
  } else {
    lines.push("_No direct contradictions were found in the retrieved evidence._");
  }
  lines.push("");

  // 5. Trends and evidence-backed insights
  lines.push("## Trends and Evidence-Backed Insights");
  if (insights.trends.length > 0) {
    lines.push("**Trends:**");
    lines.push(bulletList(insights.trends));
    lines.push("");
  }
  lines.push("**Insights:**");
  if (insights.insights.length > 0) {
    for (const i of insights.insights) {
      lines.push(`- ${i.statement}${renderCitations(i.citations, validKeys)}`);
    }
  } else {
    lines.push("_No additional insights beyond the key findings._");
  }
  lines.push("");

  // 6. Hypotheses / implications (labelled inference)
  lines.push("## Hypotheses and Implications");
  lines.push("_The following are inference, not established findings:_");
  lines.push("");
  lines.push("**Hypotheses (inferred):**");
  lines.push(bulletList(insights.hypotheses));
  lines.push("");
  lines.push("**Practical implications:**");
  lines.push(bulletList(insights.implications));
  lines.push("");

  // 7. Evidence gaps and limitations
  lines.push("## Evidence Gaps and Limitations");
  lines.push("**Knowledge gaps:**");
  lines.push(bulletList(analysis.knowledgeGaps));
  lines.push("");
  lines.push("**Limitations:**");
  const limitations = [...insights.limitations];
  if (analysis.sourceConcerns.length > 0) {
    limitations.push(`Source-quality concerns: ${analysis.sourceConcerns.join("; ")}.`);
  }
  if (warnings.length > 0) {
    limitations.push(`Retrieval notes: ${warnings.join("; ")}.`);
  }
  limitations.push(
    "This report is research assistance, not guaranteed factual truth; verify critical claims against the cited sources.",
  );
  lines.push(bulletList(limitations));
  lines.push("");

  // 8. Sources and citations
  lines.push("## Sources and Citations");
  if (webSources.length > 0) {
    lines.push("**Web:**");
    for (const s of webSources) {
      lines.push(`- [${s.key}] [${s.title}](${s.url})`);
    }
    lines.push("");
  }
  if (pdfEvidence.length > 0) {
    lines.push("**PDF:**");
    for (const e of pdfEvidence) {
      lines.push(`- [${e.key}] ${e.fileName}${e.page ? `, p.${e.page}` : ""}`);
    }
    lines.push("");
  }
  if (webSources.length === 0 && pdfEvidence.length === 0) {
    lines.push("_No sources were retrieved._");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
