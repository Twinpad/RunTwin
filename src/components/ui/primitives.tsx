"use client";

import { ReactNode } from "react";

/* TwinPad design-system primitives — official brand palette.
   Light-first: white surfaces, indigo tints, violet/orchid accents. */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-night-700 bg-paper p-5 shadow-panel transition-all duration-200 hover:border-night-600 ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  onClick,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  } as const;
  const variants = {
    primary:
      "bg-mint-500 text-snow shadow-glow-mint hover:bg-mint-400 active:bg-mint-600 disabled:bg-mint-500 disabled:shadow-none",
    secondary:
      "border border-night-700 bg-paper text-ink hover:border-mint-500/50 hover:bg-sky-50 hover:text-mint-700 disabled:hover:bg-paper disabled:hover:border-night-700 disabled:hover:text-ink",
    ghost:
      "text-night-400 hover:bg-night-800 hover:text-ink disabled:hover:bg-transparent disabled:hover:text-night-400",
    danger: "bg-down text-snow hover:bg-danger/50/90",
  } as const;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}


export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "ice" | "lagoon" | "bloom" | "spark" | "warn" | "danger" | "success";
}) {
  const tones = {
    neutral: "border-night-700 bg-night-800 text-night-400",
    mint: "border-mint-500/25 bg-sky-50 text-mint-700",
    ice: "border-sky-200 bg-sky-100/70 text-mint-600",
    lagoon: "border-lagoon-500/30 bg-lagoon-300/20 text-lagoon-700 dark:border-lagoon-400/30 dark:bg-lagoon-400/10 dark:text-lagoon-300",
    bloom: "border-bloom-500/30 bg-bloom-300/20 text-bloom-700 dark:border-bloom-400/30 dark:bg-bloom-400/10 dark:text-bloom-300",
    spark: "border-spark-500/30 bg-spark-300/20 text-spark-600 dark:border-spark-400/30 dark:bg-spark-400/10 dark:text-spark-300",
    warn: "border-warn/30 bg-warn/10 text-warn",
    danger: "border-danger/25 bg-danger/5 text-danger",
    success: "border-up/30 bg-up/10 text-up",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Input({
  label,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        {...props}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-night-500 transition-colors duration-200 focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/15 ${
          error ? "border-danger/60" : "border-night-700"
        }`}
      />
      {hint && !error && <span className="mt-1 block text-xs text-night-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <textarea
        {...props}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-night-500 transition-colors duration-200 focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/15 ${
          error ? "border-danger/60" : "border-night-700"
        }`}
      />
      {hint && !error && <span className="mt-1 block text-xs text-night-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-night-400" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-night-600 border-t-mint-500" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-night-600 bg-paper/60 px-6 py-14 text-center">
      {/* Branded empty state — Twinny, the TwinPad mascot (inline SVG) in
          the official palette: indigo body, lagoon + orchid eyes, spark gem. */}
      <svg viewBox="0 0 120 120" aria-hidden="true" className="mb-4 h-14 w-14 opacity-95">
        <rect x="34" y="76" width="15" height="26" rx="7.5" fill="#201060" />
        <rect x="71" y="76" width="15" height="26" rx="7.5" fill="#201060" />
        <path d="M42 100 q 5 14 10 0zM68 100 q 5 14 10 0z" fill="#2CD4C0" opacity="0.85" />
        <circle cx="60" cy="58" r="36" fill="#EFEBFD" stroke="#E3DCFA" strokeWidth="2" />
        <ellipse cx="60" cy="54" rx="18" ry="14" fill="#170B45" />
        <circle cx="53" cy="52" r="3.4" fill="#2CD4C0" />
        <circle cx="67" cy="52" r="3.4" fill="#D848F0" />
        <circle cx="42" cy="66" r="4.5" fill="#D848F0" opacity="0.8" />
        <circle cx="78" cy="66" r="4.5" fill="#2CD4C0" opacity="0.8" />
        <line x1="60" y1="22" x2="60" y2="12" stroke="#201060" strokeWidth="3" />
        <path d="M60 6 L61.6 10.4 L66 12 L61.6 13.6 L60 18 L58.4 13.6 L54 12 L58.4 10.4 Z" fill="#F8CC14" />
      </svg>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-night-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/5 p-4"
    >
      <p className="font-medium text-danger">{title}</p>
      <p className="mt-1 break-words text-sm text-danger/90">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger transition-colors duration-200 hover:bg-danger/50/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function CopyChip({ value, label }: { value: string; label: string }) {
  return (
    <button
      onClick={() => void navigator.clipboard?.writeText(value)}
      title={`Copy ${label}`}
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-night-700 bg-night-800 px-2.5 py-1 font-mono text-xs text-mint-700 transition-colors duration-200 hover:border-mint-500/60"
    >
      <span className="truncate">{value}</span>
      <span aria-hidden>⧉</span>
    </button>
  );
}
