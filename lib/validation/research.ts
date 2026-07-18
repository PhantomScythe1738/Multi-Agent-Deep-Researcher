import { z } from "zod";
import { MAX_PDFS, MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH } from "@/lib/constants";

/** Validated body for POST /api/research/stream. */
export const researchRequestSchema = z.object({
  question: z.string().trim().min(MIN_QUESTION_LENGTH).max(MAX_QUESTION_LENGTH),
  fileIds: z.array(z.string().uuid()).max(MAX_PDFS).default([]),
});
