import React from "react";

// Foothold's mark: three rising steps — gaining footing, momentum, a way up.
// Uses currentColor so it inherits whatever color the parent sets.
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="15" width="4.5" height="6" rx="1.5" fill="currentColor" />
      <rect x="9.75" y="10" width="4.5" height="11" rx="1.5" fill="currentColor" />
      <rect x="16.5" y="3" width="4.5" height="18" rx="1.5" fill="currentColor" />
    </svg>
  );
}
