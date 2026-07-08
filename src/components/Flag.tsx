// SVG country flag (flag-icons). Works cross-platform, unlike flag emoji which
// Windows/Chrome render as bare letters. `code` is an ISO-3166 alpha-2 code.
export function Flag({ code, className = "" }: { code?: string | null; className?: string }) {
  if (!code || code.length !== 2) {
    return <span className={`flag-blank ${className}`} aria-hidden="true" />;
  }
  return <span className={`fi fi-${code.toLowerCase()} ${className}`} aria-hidden="true" />;
}
