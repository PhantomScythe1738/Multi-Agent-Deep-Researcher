import type { AgentEvent } from "@/lib/graph/events";

/**
 * Incremental NDJSON parser. Feed it raw stream chunks; it buffers partial
 * lines and returns complete parsed events. Tolerant of multiple events per
 * chunk and events split across chunks. Pure state held by the caller.
 */
export class NdjsonParser {
  private buffer = "";

  /** Push a chunk; returns any newly-completed events. */
  push(chunk: string): AgentEvent[] {
    this.buffer += chunk;
    const events: AgentEvent[] = [];
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.length === 0) continue;
      const parsed = safeParse(line);
      if (parsed) events.push(parsed);
    }
    return events;
  }

  /** Flush any trailing complete JSON left without a final newline. */
  flush(): AgentEvent[] {
    const line = this.buffer.trim();
    this.buffer = "";
    if (line.length === 0) return [];
    const parsed = safeParse(line);
    return parsed ? [parsed] : [];
  }
}

function safeParse(line: string): AgentEvent | null {
  try {
    const obj = JSON.parse(line) as AgentEvent;
    if (obj && typeof obj === "object" && typeof obj.type === "string") return obj;
    return null;
  } catch {
    return null;
  }
}
