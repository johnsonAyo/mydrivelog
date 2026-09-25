import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden="true">
      <svg viewBox="0 0 34 34" role="img">
        <path d="M7 25.5c3.4-8.6 7.2-14 11.5-16.1 2.7-1.3 5.5-1.5 8.5-.5" />
        <path d="M6.5 25.5h7" />
        <circle cx="25.5" cy="9" r="2.5" />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <BrandMark />
      <span>MyDriveLog</span>
    </span>
  );
}
