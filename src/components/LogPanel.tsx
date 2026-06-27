import type { LogLine } from "@/lib/api/types";

// Terminal-style log output for test/send/run actions.
export function LogPanel({ logs, title }: { logs: LogLine[]; title?: string }) {
  if (!logs.length) return null;
  return (
    <div className="log-panel">
      {title && <div className="log-panel-title">{title}</div>}
      {logs.map((l, i) => (
        <div key={i} className={`log-line log-${l.level}`}>
          <span className="log-badge">{l.level.toUpperCase()}</span>
          <span className="log-msg">{l.message}</span>
        </div>
      ))}
    </div>
  );
}
