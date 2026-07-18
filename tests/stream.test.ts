import { describe, it, expect } from "vitest";
import { NdjsonParser } from "@/lib/stream/parse";

function evt(seq: number) {
  return JSON.stringify({
    v: 1,
    runId: "r",
    sequence: seq,
    type: "agent_started",
    agentName: "A",
    status: "running",
    message: "m",
    safeMetadata: null,
    timestamp: "t",
  });
}

describe("NdjsonParser", () => {
  it("parses multiple events in one chunk", () => {
    const p = new NdjsonParser();
    const out = p.push(`${evt(0)}\n${evt(1)}\n`);
    expect(out.map((e) => e.sequence)).toEqual([0, 1]);
  });

  it("handles an event split across chunks", () => {
    const p = new NdjsonParser();
    const line = evt(5);
    const mid = Math.floor(line.length / 2);
    expect(p.push(line.slice(0, mid))).toEqual([]);
    const out = p.push(line.slice(mid) + "\n");
    expect(out).toHaveLength(1);
    expect(out[0].sequence).toBe(5);
  });

  it("handles combined + partial across chunk boundaries", () => {
    const p = new NdjsonParser();
    const first = p.push(`${evt(0)}\n${evt(1).slice(0, 10)}`);
    expect(first.map((e) => e.sequence)).toEqual([0]);
    const second = p.push(`${evt(1).slice(10)}\n`);
    expect(second.map((e) => e.sequence)).toEqual([1]);
  });

  it("flushes a trailing event without a newline", () => {
    const p = new NdjsonParser();
    expect(p.push(evt(9))).toEqual([]);
    const out = p.flush();
    expect(out[0].sequence).toBe(9);
  });

  it("ignores malformed lines", () => {
    const p = new NdjsonParser();
    const out = p.push(`not json\n${evt(3)}\n`);
    expect(out).toHaveLength(1);
    expect(out[0].sequence).toBe(3);
  });
});
