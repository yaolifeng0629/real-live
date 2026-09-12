interface RLLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Real Live "RL" monogram.
 * Geometric stroke letterforms on a rounded primary tile (radius.md),
 * with a status-live dot referencing the live indicator.
 */
export function RLLogo({ size = 40, className, title }: RLLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#1a1a1a" />
      <g
        stroke="#fafaf9"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* R */}
        <path d="M15 45V19h11a8 8 0 0 1 0 16H15" />
        <path d="M24 35l9 10" />
        {/* L */}
        <path d="M40 19v26h11" />
      </g>
      <circle cx="52" cy="13" r="3.5" fill="#ef4444" />
    </svg>
  );
}
