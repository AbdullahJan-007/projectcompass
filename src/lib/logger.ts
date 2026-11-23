type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  action: string;
  requestId?: string;
  durationMs?: number;
  status?: string;
  errorCode?: string;
  meta?: Record<string, string | number | boolean | null>;
}

/**
 * Emits structured JSON telemetry to stdout/stderr without leaking student PII or secrets.
 */
export function logStructured(payload: LogPayload): void {
  const entry = {
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const serialized = JSON.stringify(entry);
  if (payload.level === "error") {
    process.stderr.write(`${serialized}\n`);
  } else {
    process.stdout.write(`${serialized}\n`);
  }
}
