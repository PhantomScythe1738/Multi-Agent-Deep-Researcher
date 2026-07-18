import type { WebSource, PdfEvidence } from "@/lib/retrieval/types";
import type { AnalysisOutput, InsightsOutput, PlannerOutput } from "@/lib/ai/schemas";
import type { AgentEvent } from "@/lib/graph/events";
import { buildReport } from "@/lib/report/build";
import { computeQuality, type QualityReport } from "@/lib/report/validate";

/**
 * A clearly-labelled, version-controlled demo run. Built through the SAME
 * report/quality builders the live workflow uses, so the demo exercises real
 * rendering rather than being a disconnected fixture.
 */

const DEMO_QUESTION =
  "How do recent studies and my uploaded report compare on the effectiveness of a 4-day work week?";

const webSources: WebSource[] = [
  {
    key: "W1",
    type: "web",
    title: "Large trial: four-day week maintains output while reducing burnout",
    url: "https://example.org/four-day-week-trial",
    excerpt:
      "Across 61 organizations, most reported stable or higher productivity and a marked drop in self-reported burnout after moving to a four-day week.",
    score: 0.91,
    publishedDate: "2024-02-21",
  },
  {
    key: "W2",
    type: "web",
    title: "Sector analysis: gains concentrate in knowledge work",
    url: "https://example.org/sector-analysis",
    excerpt:
      "Benefits were strongest for knowledge and administrative roles; shift-based and customer-coverage roles saw smaller or negative effects.",
    score: 0.84,
    publishedDate: "2024-06-10",
  },
];

const pdfEvidence: PdfEvidence[] = [
  {
    key: "P1",
    type: "pdf",
    fileId: "demo-file",
    fileName: "internal-pilot-report.pdf",
    page: 3,
    content:
      "Our 12-week internal pilot found flat delivery velocity and a 14% reduction in voluntary attrition, though two client-facing teams reported scheduling strain.",
    similarity: 0.82,
    chunkIndex: 2,
  },
];

const plan: PlannerOutput = {
  objective:
    "Compare recent external studies with the user's internal pilot report on four-day-week effectiveness.",
  searchQueries: [
    "four day work week productivity study",
    "four day week outcomes by sector",
    "compressed schedule attrition burnout",
  ],
  evidenceRequirements: [
    "Productivity outcomes",
    "Burnout / attrition outcomes",
    "Differences by role type",
  ],
  reportSections: ["Findings", "Contradictions", "Implications"],
};

const analysis: AnalysisOutput = {
  claims: [
    {
      statement: "Most organizations maintained productivity after adopting a four-day week.",
      citations: ["W1"],
      confidence: "high",
    },
    {
      statement: "Burnout and voluntary attrition tend to fall under a four-day week.",
      citations: ["W1", "P1"],
      confidence: "medium",
    },
    {
      statement: "Benefits concentrate in knowledge work and are weaker for coverage-based roles.",
      citations: ["W2", "P1"],
      confidence: "medium",
    },
  ],
  contradictions: [
    {
      description:
        "External trials emphasize broad productivity gains, while the internal pilot found flat velocity and scheduling strain for client-facing teams.",
      citations: ["W1", "P1"],
    },
  ],
  sourceConcerns: [
    "Several public trials rely on self-reported productivity, which can overstate gains.",
  ],
  knowledgeGaps: [
    "Long-term (>1 year) effects are not covered by the retrieved evidence.",
    "No cost/revenue data to weigh against wellbeing gains.",
  ],
  evidenceSufficiency: "sufficient",
};

const insights: InsightsOutput = {
  trends: [
    "Productivity is roughly preserved while wellbeing metrics improve.",
    "Effects are uneven across role types.",
  ],
  insights: [
    {
      statement:
        "The strongest, most consistent effect is on retention/burnout rather than raw output.",
      citations: ["W1", "P1"],
    },
    {
      statement:
        "Coverage-based teams likely need a different schedule design than knowledge teams.",
      citations: ["W2", "P1"],
    },
  ],
  hypotheses: [
    "If adopted org-wide without role-specific design, client-facing teams may erode the average benefit.",
  ],
  implications: [
    "Pilot per role type before a blanket rollout.",
    "Track attrition and delivery velocity as the primary success metrics.",
  ],
  limitations: [
    "Evidence is short-horizon and partly self-reported.",
    "No financial impact data was available.",
  ],
};

const events: AgentEvent[] = [
  {
    v: 1,
    runId: "demo",
    sequence: 0,
    type: "run_created",
    agentName: null,
    status: null,
    message: "Demo run loaded.",
    safeMetadata: null,
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 1,
    type: "agent_completed",
    agentName: "Research Planner",
    status: "completed",
    message: "Planned 3 search queries.",
    safeMetadata: { queryCount: 3 },
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 2,
    type: "agent_completed",
    agentName: "Web Retriever",
    status: "completed",
    message: "Found 2 web source(s).",
    safeMetadata: { count: 2 },
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 3,
    type: "agent_completed",
    agentName: "PDF Retriever",
    status: "completed",
    message: "Found 1 PDF excerpt(s).",
    safeMetadata: { count: 1 },
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 4,
    type: "agent_completed",
    agentName: "Critical Analysis",
    status: "completed",
    message: "Identified 3 claim(s), 1 contradiction(s).",
    safeMetadata: { claims: 3, contradictions: 1 },
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 5,
    type: "agent_completed",
    agentName: "Insight Generation",
    status: "completed",
    message: "Generated 2 insight(s), 1 hypothesis(es).",
    safeMetadata: null,
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 6,
    type: "agent_completed",
    agentName: "Evidence Quality",
    status: "completed",
    message: "Validated citations.",
    safeMetadata: null,
    timestamp: "",
  },
  {
    v: 1,
    runId: "demo",
    sequence: 7,
    type: "report_completed",
    agentName: null,
    status: "completed",
    message: "Research complete.",
    safeMetadata: null,
    timestamp: "",
  },
];

export interface DemoRun {
  question: string;
  events: AgentEvent[];
  reportMarkdown: string;
  quality: QualityReport;
}

export function getDemoRun(): DemoRun {
  const reportMarkdown = buildReport({
    question: DEMO_QUESTION,
    plan,
    webSources,
    pdfEvidence,
    analysis,
    insights,
    warnings: [],
    mode: "demo",
  });
  const quality = computeQuality({
    analysis,
    insights,
    validKeys: new Set([...webSources.map((s) => s.key), ...pdfEvidence.map((e) => e.key)]),
    webSourceCount: webSources.length,
    pdfSourceCount: pdfEvidence.length,
    reportMarkdown,
  });
  return { question: DEMO_QUESTION, events, reportMarkdown, quality };
}
