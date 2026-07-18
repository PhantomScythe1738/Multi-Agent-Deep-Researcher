import { describe, it, expect } from "vitest";
import { researchRequestSchema } from "@/lib/validation/research";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("researchRequestSchema", () => {
  it("accepts a valid request and defaults fileIds", () => {
    const r = researchRequestSchema.safeParse({ question: "What is the effect of X on Y?" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fileIds).toEqual([]);
  });

  it("rejects an empty/too-short question", () => {
    expect(researchRequestSchema.safeParse({ question: "hi" }).success).toBe(false);
  });

  it("rejects an over-long question", () => {
    expect(researchRequestSchema.safeParse({ question: "x".repeat(5000) }).success).toBe(false);
  });

  it("rejects more than two file ids", () => {
    expect(
      researchRequestSchema.safeParse({
        question: "A valid question here",
        fileIds: [UUID, UUID, UUID],
      }).success,
    ).toBe(false);
  });

  it("rejects non-uuid file ids", () => {
    expect(
      researchRequestSchema.safeParse({ question: "A valid question here", fileIds: ["nope"] })
        .success,
    ).toBe(false);
  });
});
