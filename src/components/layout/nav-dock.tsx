"use client";

/**
 * TwinPad Navigation Dock — the floating 3D navigation system.
 *
 * Desktop: a floating, vertically-centered glass dock with gradient active
 * tiles, animated indicators, expandable labels (hover or pinned) and a
 * compact mode. It floats independently over the page, like a game HUD.
 *
 * Mobile: a bottom floating dock with five primary destinations plus an
 * expandable "More" sheet containing every section.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TwinMark } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icons";

export interface DockItem {
  href: string;
  label: string;
  icon: string;
  /** Exact-match active detection (for /). */
  exact?: boolean;
  /** Optional query string that must match for the active state (e.g. view=launches). */
  matchQuery?: Record<string, string>;
}

export const DOCK_SECTIONS: { title: string; items: DockItem[] }[] = [
  {
    title: "Discover",
    items: [
      { href: "/", label: "Home", icon: "home", exact: true },
      { href: "/tokens", label: "Explore", icon: "compass" },
      { href: "/trending", label: "Trending", icon: "flame" },
      { href: "/launches", label: "New Launches", icon: "rocket" },
    ],
  },
  {
    title: "Activity",
    items: [
      { href: "/live", label: "Live Activity", icon: "activity" },
      { href: "/leaderboard", label: "Leaderboard", icon: "trophy" },
      { href: "/launches?filter=graduated", label: "Graduated", icon: "award" },
    ],
  },
  {
    title: "Create",
    items: [
      { href: "/create", label: "Launch Token", icon: "plus" },
      { href: "/dashboard?view=launches", label: "My Launches", icon: "rocket", matchQuery: { view: "launches" } },
    ],
  },
  {
    title: "Personal",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: "wallet" },
      { href: "/watchlist", label: "Watchlist", icon: "star" },
      { href: "/dashboard", label: "Dashboard", icon: "grid" },
      { href: "/settings", label: "Settings", icon: "gear" },
    ],
  },
];

/** The five destinations promoted to the mobile bottom dock. */
const MOBILE_PRIMARY: DockItem[] = [
  { href: "/", label: "Home", icon: "home", exact: true },
  { href: "/tokens", label: "Explore", icon: "compass" },
  { href: "/create", label: "Launch", icon: "plus" },
  { href: "/trending", label: "Trending", icon: "flame" },
  { href: "/live", label: "Live", icon: "activity" },
];

const PIN_KEY = "twinpad-dock-pinned";

function isActive(item: DockItem, pathname: string, query: URLSearchParams): boolean {
  const base = item.href.split("?")[0];
  const itemQuery = item.href.split("?")[1];
  const pathOk = item.exact ? pathname === base : pathname === base || pathname.startsWith(base + "/");
  if (!pathOk) return false;
  if (itemQuery) {
    const wanted = new URLSearchParams(itemQuery);
    for (const [k, v] of wanted) if (query.get(k) !== v) return false;
  } else if (item.matchQuery) {
    for (const [k, v] of Object.entries(item.matchQuery)) if (query.get(k) !== v) return false;
  }
  return true;
}

function DockLink({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: DockItem;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={expanded ? undefined : item.label}
      className={`group/item relative flex h-11 w-full items-center rounded-2xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-mint-400/50 ${
        expanded ? "gap-3 px-3" : "justify-center"
      } ${active ? "text-white" : "text-night-400 hover:bg-night-800/70 hover:text-ink"}`}
    >
      {/* Active tile — the gradient "key cap" */}
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
          active
            ? "bg-gradient-to-br from-bloom-500 via-bloom-400 to-lagoon-400 text-white shadow-[0_8px_20px_-6px_rgba(196,69,232,0.65)]"
            : "group-hover/item:scale-105"
        }`}
      >
        <Icon name={item.icon} size={17} />
      </span>
      {expanded && (
        <span className={`truncate text-[13px] ${active ? "font-bold text-ink" : "font-medium"}`}>{item.label}</span>
      )}
      {/* Animated side indicator */}
      {active && (
        <span
          aria-hidden
          className="tp-pop absolute -left-[13px] top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-bloom-400 to-lagoon-400 shadow-[0_0_12px_rgba(196,69,232,0.8)]"
        />
      )}
      {!expanded && active && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gradient-to-r from-bloom-400 to-lagoon-400"
        />
      )}
    </Link>
  );
}

function DesktopDock() {
  const pathname = usePathname();
  const [query, setQuery] = useState<URLSearchParams>(new URLSearchParams());
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search));
    try {
      setPinned(window.localStorage.getItem(PIN_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  // Re-evaluate the query on client navigations (pathname changes too).
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search));
  }, [pathname]);

  const togglePin = () => {
    setPinned((p) => {
      const next = !p;
      try {
        window.localStorage.setItem(PIN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const expanded = pinned || hovered;
  return (
    <nav
      aria-label="Primary"
      onMouseEnter={() => {
        if (timer.current) window.clearTimeout(timer.current);
        setHovered(true);
      }}
      onMouseLeave={() => {
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setHovered(false), 180);
      }}
      className={`fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 rounded-[26px] border border-night-700/60 bg-paper/85 p-3 shadow-panel backdrop-blur-xl transition-[width] duration-300 ease-out md:flex ${
        expanded ? "w-[236px]" : "w-[72px]"
      }`}
    >
      {/* ambient 3D glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 -z-10 rounded-[32px] bg-gradient-to-b from-bloom-500/12 via-transparent to-lagoon-400/12 blur-xl"
      />
      <Link href="/" aria-label="TwinPad home" className="mb-1 flex items-center gap-2.5 px-1 pt-1">
        <TwinMark size={expanded ? 30 : 34} className="transition-all duration-300" />
        {expanded && <span className="font-display text-[15px] font-extrabold text-ink">Twin<span className="tp-gradient-text">Pad</span></span>}
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {DOCK_SECTIONS.map((section, si) => (
          <div key={section.title} className={si > 0 ? "mt-2 border-t border-night-700/50 pt-2" : ""}>
            {expanded ? (
              <p className="px-3 pb-1 pt-1 text-2xs font-bold uppercase tracking-[0.14em] text-night-500/90">
                {section.title}
              </p>
            ) : (
              si > 0 && <div className="mx-auto mb-1 h-px w-6 bg-night-700/50" aria-hidden />
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.label}>
                  <DockLink item={item} active={isActive(item, pathname, query)} expanded={expanded} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={togglePin}
        aria-pressed={pinned}
        title={pinned ? "Unpin dock (compact mode)" : "Pin dock open"}
        className="mt-2 flex h-9 w-full items-center justify-center rounded-xl text-night-400 transition hover:bg-night-800/70 hover:text-ink"
      >
        <Icon name="chevronsLeft" size={16} className={expanded ? "" : "rotate-180"} />
      </button>
    </nav>
  );
}

function MobileDock() {
  const pathname = usePathname();
  const [query, setQuery] = useState<URLSearchParams>(new URLSearchParams());
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search));
  }, [pathname]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const go = () => setSheetOpen(false);

  return (
    <>
      {/* Bottom floating dock */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-3 z-40 flex items-end justify-around rounded-[26px] border border-night-700/60 bg-paper/90 px-2 pb-2 pt-1.5 shadow-panel backdrop-blur-xl md:hidden"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1.5 -z-10 rounded-[30px] bg-gradient-to-t from-bloom-500/12 via-transparent to-lagoon-400/10 blur-lg"
        />
        {MOBILE_PRIMARY.map((item, i) => {
          const active = isActive(item, pathname, query);
          const center = i === 2; // Launch — elevated action
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex w-14 flex-col items-center gap-1 rounded-2xl py-1.5 ${center ? "-mt-6" : ""}`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 ${
                  center
                    ? "bg-gradient-to-br from-bloom-500 via-bloom-400 to-lagoon-400 text-white shadow-[0_10px_24px_-6px_rgba(196,69,232,0.7)] ring-4 ring-paper dark:ring-[#181045]"
                    : active
                      ? "bg-gradient-to-br from-bloom-500 to-lagoon-400 text-white shadow-glow-mint"
                      : "text-night-400"
                }`}
              >
                <Icon name={item.icon} size={center ? 19 : 18} />
              </span>
              <span className={`text-[10px] font-semibold ${active ? "text-ink" : "text-night-500"}`}>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-label="Open full navigation"
          className="relative flex w-14 flex-col items-center gap-1 rounded-2xl py-1.5 text-night-400"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl transition hover:bg-night-800/70">
            <Icon name="menu" size={18} />
          </span>
          <span className="text-[10px] font-semibold text-night-500">More</span>
        </button>
      </nav>

      {/* Expandable full-navigation sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Full navigation">
          <button aria-label="Close navigation" onClick={go} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="tp-pop absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[28px] border-t border-night-600 bg-paper p-4 pb-8 shadow-panel">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-night-600" aria-hidden />
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-2">
                <TwinMark size={26} />
                <span className="font-display text-[15px] font-extrabold text-ink">
                  Twin<span className="tp-gradient-text">Pad</span>
                </span>
              </span>
              <button
                onClick={go}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-night-400 hover:bg-night-800 hover:text-ink"
              >
                <Icon name="x" size={17} />
              </button>
            </div>
            {DOCK_SECTIONS.map((section) => (
              <div key={section.title} className="mb-3">
                <p className="px-1 pb-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-night-500">
                  {section.title}
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const active = isActive(item, pathname, query);
                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={go}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-2xl border p-3 transition-all duration-200 ${
                            active
                              ? "border-transparent bg-gradient-to-br from-bloom-500/10 to-lagoon-400/10 text-ink ring-1 ring-mint-400/40"
                              : "border-night-700 bg-night-850 text-night-400 hover:text-ink"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              active ? "bg-gradient-to-br from-bloom-500 to-lagoon-400 text-white" : "bg-night-800"
                            }`}
                          >
                            <Icon name={item.icon} size={16} />
                          </span>
                          <span className="text-[13px] font-semibold">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function NavDock() {
  return (
    <>
      <DesktopDock />
      <MobileDock />
    </>
  );
}
