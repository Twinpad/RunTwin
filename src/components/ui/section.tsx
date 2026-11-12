/**
 * Section heading — the shared "level intro" used by every redesigned page:
 * eyebrow chip, display title, description and an optional CTA link.
 * Server-compatible (no client hooks).
 */
import Link from "next/link";
import { Icon } from "@/components/ui/icons";

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  href,
  linkLabel,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <header className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-mint-400/25 bg-gradient-to-r from-violet-500/10 to-cyan-400/10 px-3 py-1 text-2xs font-bold uppercase tracking-[0.16em] text-mint-600 dark:text-mint-300">
            {icon && <Icon name={icon} size={12} />}
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-night-400">{description}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 rounded-xl border border-night-700 bg-paper px-4 py-2 text-xs font-bold text-night-400 transition-all duration-200 hover:border-mint-500/50 hover:text-ink"
        >
          {linkLabel}
          <Icon
            name="chevronRight"
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </header>
  );
}
