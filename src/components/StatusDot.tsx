import type { TestStatus } from "@/lib/api/types";

// Left-side status indicator: green = last test/run ok, red = failed, grey = never run.
export function StatusDot({ status, title }: { status: TestStatus; title?: string }) {
  const color =
    status === "success" ? "var(--color-success, #10b981)"
    : status === "fail" ? "var(--color-error, #ef4444)"
    : "var(--terminal-text-muted, #6b7280)";
  const label = status === "success" ? "OK" : status === "fail" ? "Failed" : "Not run yet";
  return (
    <span
      className="status-dot"
      title={title ? `${title}: ${label}` : label}
      style={{ backgroundColor: color, boxShadow: status ? `0 0 6px ${color}` : "none" }}
    />
  );
}
