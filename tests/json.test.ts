import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  extractJson,
  parseStructured,
  generateStructured,
  StructuredOutputError,
} from "@/lib/ai/json";
import type { LlmClient } from "@/lib/ai/model";

const schema = z.object({ answer: z.string() });

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"answer":"hi"}')).toEqual({ answer: "hi" });
  });

  it("parses JSON inside a ```json fence", () => {
    expect(extractJson('```json\n{"answer":"fenced"}\n```')).toEqual({ answer: "fenced" });
  });

  it("parses JSON surrounded by prose", () => {
    expect(extractJson('Sure! Here you go: {"answer":"x"} — hope that helps')).toEqual({
      answer: "x",
    });
  });

  it("throws on non-JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("parseStructured", () => {
  it("validates against the schema", () => {
    const r = parseStructured(schema, '{"answer":"ok"}');
    expect(r.ok && r.data.answer).toBe("ok");
  });

  it("fails on schema mismatch", () => {
    const r = parseStructured(schema, '{"wrong":1}');
    expect(r.ok).toBe(false);
  });
});

function mockLlm(responses: string[]): LlmClient {
  let i = 0;
  return {
    complete: vi.fn(async () => responses[Math.min(i++, responses.length - 1)]),
  };
}

describe("generateStructured", () => {
  it("returns parsed data on first valid response", async () => {
    const llm = mockLlm(['{"answer":"first"}']);
    const data = await generateStructured(llm, { system: "s", user: "u", schema });
    expect(data.answer).toBe("first");
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it("repairs once when the first response is invalid", async () => {
    const llm = mockLlm(["not json", '{"answer":"repaired"}']);
    const data = await generateStructured(llm, { system: "s", user: "u", schema });
    expect(data.answer).toBe("repaired");
    expect(llm.complete).toHaveBeenCalledTimes(2);
  });

  it("throws StructuredOutputError when repair also fails", async () => {
    const llm = mockLlm(["bad", "still bad"]);
    await expect(
      generateStructured(llm, { system: "s", user: "u", schema }),
    ).rejects.toBeInstanceOf(StructuredOutputError);
    expect(llm.complete).toHaveBeenCalledTimes(2);
  });
});
