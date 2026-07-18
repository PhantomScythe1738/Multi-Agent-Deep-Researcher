import { z } from "zod";

/** Confidence levels used across analysis + insights. */
const confidenceEnum = z.enum(["high", "medium", "low"]);

// --- Planner ---
export const plannerSchema = z.object({
  objective: z.string().min(1),
  searchQueries: z.array(z.string().min(1)).min(1).max(3),
  evidenceRequirements: z.array(z.string().min(1)).max(8).default([]),
  reportSections: z.array(z.string().min(1)).max(10).default([]),
});
export type PlannerOutput = z.infer<typeof plannerSchema>;

// --- Critical Analysis ---
const claimSchema = z.object({
  statement: z.string().min(1),
  citations: z.array(z.string()).default([]),
  confidence: confidenceEnum.default("medium"),
});
const contradictionSchema = z.object({
  description: z.string().min(1),
  citations: z.array(z.string()).default([]),
});
export const analysisSchema = z.object({
  claims: z.array(claimSchema).max(12).default([]),
  contradictions: z.array(contradictionSchema).max(8).default([]),
  sourceConcerns: z.array(z.string()).max(8).default([]),
  knowledgeGaps: z.array(z.string()).max(8).default([]),
  evidenceSufficiency: z.enum(["sufficient", "insufficient"]).default("insufficient"),
});
export type AnalysisOutput = z.infer<typeof analysisSchema>;

// --- Query Refinement ---
export const refinementSchema = z.object({
  improvedQuery: z.string().min(1),
  reason: z.string().min(1),
});

// --- Insight Generation ---
const insightSchema = z.object({
  statement: z.string().min(1),
  citations: z.array(z.string()).default([]),
});
export const insightsSchema = z.object({
  trends: z.array(z.string()).max(8).default([]),
  insights: z.array(insightSchema).max(10).default([]),
  hypotheses: z.array(z.string()).max(8).default([]),
  implications: z.array(z.string()).max(8).default([]),
  limitations: z.array(z.string()).max(8).default([]),
});
export type InsightsOutput = z.infer<typeof insightsSchema>;
