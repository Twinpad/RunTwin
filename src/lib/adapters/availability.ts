/**
 * Launch-route availability classification.
 *
 * Shared by the RouteSelector UI and the adapters' loadConfig paths. The goal
 * is an HONEST presentation: a transport/RPC failure is reported as
 * "temporarily unavailable — retry", a route that is genuinely not deployed
 * or not configured for the selected cluster is reported as "not supported",
 * and raw SDK/RPC error text is never surfaced to the user.
 */
import { TwinpadError } from "../connection";

export type RouteAvailabilityState = "loading" | "ready" | "retry" | "unsupported";

export interface RouteAvailability {
  state: RouteAvailabilityState;
  /**
   * Short, user-facing explanation. Never raw SDK/RPC error text.
   * Present only for retry/unsupported states.
   */
  message: string;
  /**
   * Ready-state only: verified protocol facts to display (program IDs,
   * config values). Never error text.
   */
  details?: string[];
}

/** User-facing copy for each state (single source used by the UI). */
export const AVAILABILITY_COPY = {
  loading: "Checking launch availability…",
  ready: "Ready to launch",
  retry: "Temporarily unavailable. Please try again.",
  unsupported: "This launch route is not supported on the selected network.",
} as const;

/**
 * Error keywords that indicate a TRANSPORT failure (the RPC call itself did
 * not complete) rather than a protocol answer. Matched case-insensitively.
 */
const TRANSPORT_PATTERNS = [
  "fetch failed",
  "failed to fetch",
  "networkerror",
  "network error",
  "network request failed",
  "econnrefused",
  "enotfound",
  "etimedout",
  "econnreset",
  "socket hang up",
  "aborterror",
  "timeout",
  "timed out",
  "rate limit",
  "429",
  "502",
  "503",
  "504",
  "too many requests",
  "circuit open",
  "-32005",
  "-32000",
  "load aborted",
  "connection closed",
  "connection error",
];

function isTransportError(raw: string): boolean {
  const lower = raw.toLowerCase();
  return TRANSPORT_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Classify a loadConfig failure into an honest UI state.
 *
 * Rules:
 * - Transport/RPC failures → "retry" (we do not know the route is dead; the
 *   provider may be rate-limiting or restarting — retrying is the right act).
 * - TwinpadError("PROTOCOL") → "unsupported": the adapter verified the route
 *   is genuinely not deployed/configured on this cluster.
 * - TwinpadError with an RPC-ish code → "retry".
 * - Anything else → "retry" (fail-safe: never falsely declare a route dead,
 *   never expose the raw error).
 */
export function classifyAvailabilityError(err: unknown): RouteAvailability {
  if (err instanceof TwinpadError) {
    if (err.code === "PROTOCOL") {
      return { state: "unsupported", message: AVAILABILITY_COPY.unsupported };
    }
    return { state: "retry", message: AVAILABILITY_COPY.retry };
  }
  const raw = err instanceof Error ? err.message : String(err);
  if (isTransportError(raw)) {
    return { state: "retry", message: AVAILABILITY_COPY.retry };
  }
  // Unknown error shape: treat as transient (retryable) rather than telling
  // the user the route is permanently unavailable.
  return { state: "retry", message: AVAILABILITY_COPY.retry };
}

/** The availability state shown while a check is in flight. */
export function loadingAvailability(): RouteAvailability {
  return { state: "loading", message: AVAILABILITY_COPY.loading };
}

/** The availability state after a successful loadConfig. */
export function readyAvailability(): RouteAvailability {
  return { state: "ready", message: AVAILABILITY_COPY.ready };
}
