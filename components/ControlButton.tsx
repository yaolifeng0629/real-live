"use client";

import { ReactNode } from "react";

interface ControlButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** "chip" sits on raised surfaces; "solid" is the primary action. */
  variant?: "chip" | "solid";
  /** Toggle semantics: communicates the on/off state to assistive tech. */
  pressed?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Keyboard shortcut shown in the tooltip, e.g. "M". */
  shortcut?: string;
  /** Single-key shortcut exposed to assistive tech, e.g. "m". */
  ariaKeyshortcuts?: string;
  /** Overrides the default tooltip (label + shortcut). */
  tooltip?: string;
}

/**
 * Button used on raised surfaces over the stage.
 * States: default, hover, focus-visible, active, disabled, loading, pressed (on).
 */
export function ControlButton({
  label,
  icon,
  onClick,
  variant = "chip",
  pressed = false,
  disabled = false,
  loading = false,
  shortcut,
  ariaKeyshortcuts,
  tooltip: tooltipOverride,
}: ControlButtonProps) {
  const tooltip =
    tooltipOverride ?? (shortcut ? `${label} (${shortcut})` : label);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed ? true : undefined}
      aria-busy={loading || undefined}
      aria-keyshortcuts={ariaKeyshortcuts}
      disabled={disabled || loading}
      title={tooltip}
      className={[
        "inline-flex h-22 select-none items-center gap-2 rounded-step7 px-6",
        "text-lg font-medium whitespace-nowrap touch-manipulation",
        "transition-[background-color,color,transform] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variant === "solid"
          ? "bg-primary text-raised hover:bg-primary/90 active:scale-[0.97]"
          : "text-primary hover:bg-primary/5 active:scale-[0.97]",
        pressed ? "bg-primary text-raised hover:bg-primary/90" : "",
        disabled || loading ? "pointer-events-none opacity-40" : "",
      ].join(" ")}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <span aria-hidden="true" className="inline-flex size-4 items-center justify-center [&>svg]:size-4">
          {icon}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
