/**
 * Launch-route availability classification.
 *
 * Shared by the RouteSelector UI, the launch-availability API route and the
 * adapters' loadConfig paths. The goal is an HONEST presentation:
 * - "rate_limited" — the shared Solana RPC provider is throttling us right
 *   now (circuit open / 429). The check retries automatically.
 * - "retry" — another transient transport failure; the user can retry.
 * - "unsupported" — the route is genuinely not deployed/configured on the
 *   selected cluster (a real protocol answer).
 * Raw SDK/RPC error text is never surfaced to the user.
 */
import { TwinpadError } from "../connection";

export type RouteAvailabilityState =
  | "loading"
  | "ready"
  | "retry"
  | "rate_limited"
  | "unsupported";

export interface RouteAvailability {
  state: RouteAvailabilityState;
  /**
   * Short, user-facing explanation. Never raw SDK/RPC error text.
   * Present only for non-ready states.
   */
  message: string;
  /**
   * Ready-state only: verified protocol facts to display (program IDs,
   * config values). Never error text.
   */
  details?: string[];
  /**
   * rate_limited/retry only: seconds after which a retry is sensible
   * (from the provider's Retry-After or the circuit breaker).
   */
  retryAfterSeconds?: number;
}

/** User-facing copy for each state (single source used by the UI). */
export const AVAILABILITY_COPY = {
  loading: "Checking launch availability…",
  ready: "Ready to launch",
  retry: "Temporarily unavailable. Please try again.",
  rate_limited: "The Solana RPC is rate-limited right now. Retrying automatically…",
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
  "load aborted",
  "connection closed",
  "connection error",
];

/** Keywords that specifically indicate provider RATE LIMITING (429 family). */
const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "rate-limited",
  "429",
  "too many requests",
  "circuit open",
  "compute units per second",
];

function isTransportError(raw: string): boolean {
  const lower = raw.toLowerCase();
  return TRANSPORT_PATTERNS.some((p) => lower.includes(p));
}

function isRateLimitError(raw: string): boolean {
  const lower = raw.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Walk an error's cause chain (bounded) collecting message text, so gateway
 * errors wrapped by the adapters (TwinpadError.cause) are still classified.
 */
function causeMessages(err: unknown, depth = 0): string[] {
  if (!err || depth > 3) return [];
  const out: string[] = [];
  if (err instanceof Error) {
    out.push(err.message);
    if (err.name) out.push(err.name);
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") out.push(code);
    const cause = (err as { cause?: unknown }).cause;
    if (cause) out.push(...causeMessages(cause, depth + 1));
  } else if (typeof err === "string") {
    out.push(err);
  }
  return out;
}

/**
 * Classify a loadConfig failure into an honest UI state.
 *
 * Rules:
 * - Provider rate limiting (circuit open / 429 anywhere in the cause chain)
 *   → "rate_limited": the provider is throttling us, the check retries
 *   automatically.
 * - TwinpadError("PROTOCOL") → "unsupported": the adapter verified the route
 *   is genuinely not deployed/configured on this cluster.
 * - TwinpadError with an RPC-ish code → "retry".
 * - Anything else → "retry" (fail-safe: never falsely declare a route dead,
 *   never expose the raw error).
 */
export function classifyAvailabilityError(err: unknown): RouteAvailability {
  const messages = causeMessages(err);
  if (messages.some(isRateLimitError)) {
    return { state: "rate_limited", message: AVAILABILITY_COPY.rate_limited };
  }
  if (err instanceof TwinpadError) {
    if (err.code === "PROTOCOL") {
      return { state: "unsupported", message: AVAILABILITY_COPY.unsupported };
    }
    return { state: "retry", message: AVAILABILITY_COPY.retry };
  }
  if (messages.some(isTransportError)) {
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

