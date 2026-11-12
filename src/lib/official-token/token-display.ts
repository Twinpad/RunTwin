import type { ClusterId } from "../constants";
import { explorerUrl } from "../constants";
import type { OfficialTokenConfig } from "./config";

/**
 * View model for the public "Official $TWIN Token" section.
 *
 * Pure and server/client-safe: derived entirely from the official-token
 * configuration (the single source of truth used by the treasury dashboard).
 *
 * Honesty rules encoded here:
 * - A missing or explicit-placeholder mint renders the honest "not configured"
 *   CA text (never an address-looking string) with a "CA NOT OFFICIAL YET"
 *   badge and copying disabled.
 * - A configured value that is not a valid Solana public address renders an
 *   error state with copying disabled; the raw invalid value is never exposed.
 * - A configured VALID Solana public address enables copying, but the badge
 *   stays "NOT YET VERIFIED": a syntactically valid address does not prove
 *   the token is the official $TWIN. Official status requires explicit
 *   verification (future on-chain verification step).
 */

export const OFFICIAL_TOKEN_NAME = "TwinPad";
export const OFFICIAL_TOKEN_SYMBOL = "$TWIN";

/** CA-row text while the official $TWIN mint is unconfigured — never an address. */
export const OFFICIAL_MINT_UNCONFIGURED_TEXT =
  "Official $TWIN mint has not been configured yet.";

/** CA-row text when the configured mint is not a valid Solana address (raw value never exposed). */
export const OFFICIAL_MINT_INVALID_TEXT =
  "Official $TWIN mint configuration is invalid.";

export type OfficialTokenStatus = "placeholder" | "invalid" | "configured";

export interface OfficialTokenView {
  status: OfficialTokenStatus;
  network: ClusterId;
  networkLabel: string;
  /** Exact string rendered in the CA row. */
  displayValue: string;
  /** The real mint address — only when status is "configured". */
  mint: string | null;
  copyable: boolean;
  badgeLabel: string;
  message: string;
  /** Network-aware explorer link — only for a configured valid mint. */
  explorerHref: string | null;
}

export function networkLabelFor(cluster: ClusterId): string {
  return cluster === "mainnet-beta" ? "Solana Mainnet" : "Solana Devnet";
}

export function officialTokenView(
  config: OfficialTokenConfig,
): OfficialTokenView {
  const networkLabel = networkLabelFor(config.network);
  const mintInvalid = config.invalid.find((entry) => entry.role === "MINT");

  if (config.mint) {
    return {
      status: "configured",
      network: config.network,
      networkLabel,
      displayValue: config.mint,
      mint: config.mint,
      copyable: true,
      badgeLabel: "NOT YET VERIFIED",
      message:
        "Valid Solana address format. Official status is confirmed only after the mint has been explicitly verified on-chain.",
      explorerHref: explorerUrl(config.network, "address", config.mint),
    };
  }

  if (mintInvalid) {
    return {
      status: "invalid",
      network: config.network,
      networkLabel,
      // The raw invalid value is never exposed publicly — honest text only.
      displayValue: OFFICIAL_MINT_INVALID_TEXT,
      mint: null,
      copyable: false,
      badgeLabel: "INVALID CONFIGURATION",
      message:
        "TWINPAD_OFFICIAL_MINT is set but is not a valid Solana address. Fix the configuration to enable the official address display.",
      explorerHref: null,
    };
  }

  // Unset or the explicit placeholder — the official token has not been
  // announced yet. Renders the honest not-configured text, never a
  // placeholder string and never an address-looking value.
  return {
    status: "placeholder",
    network: config.network,
    networkLabel,
    displayValue: OFFICIAL_MINT_UNCONFIGURED_TEXT,
    mint: null,
    copyable: false,
    badgeLabel: "CA NOT OFFICIAL YET",
    message: "The official $TWIN token has not been announced yet.",
    explorerHref: null,
  };
}
