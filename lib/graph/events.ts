/** Versioned, typed streaming event contract (SSE / NDJSON payloads). */

export const EVENT_VERSION = 1;

export type AgentEventType =
  | "run_created"
  | "agent_started"
  | "agent_completed"
  | "agent_warning"
  | "agent_failed"
  | "source_count"
  | "report_completed"
  | "run_failed"
  | "stream_complete";

export type AgentStatus = "waiting" | "running" | "completed" | "warning" | "failed";

export interface AgentEvent {
  v: number;
  runId: string;
  sequence: number;
  type: AgentEventType;
  agentName: string | null;
  status: AgentStatus | null;
  message: string;
  safeMetadata: Record<string, unknown> | null;
  timestamp: string;
}

/** Fields a node supplies; the emitter fills in v/runId/sequence/timestamp. */
export type EmitInput = {
  type: AgentEventType;
  agentName?: string | null;
  status?: AgentStatus | null;
  message: string;
  safeMetadata?: Record<string, unknown> | null;
};

export type Emit = (input: EmitInput) => Promise<void>;
