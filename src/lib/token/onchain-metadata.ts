/**
 * On-chain token metadata reader for CA scans.
 *
 * Resolves a mint's Metaplex metadata account (PDA of
 * `metadata/<program>/<mint>`), decodes the `uri` field with a minimal
 * dependency-free layout decoder, fetches the off-chain JSON through an IPFS
 * gateway when needed, and extracts normalized social links.
 *
 * Honesty rules: any failure (no metadata account, unreadable URI, gateway or
 * network error) returns nulls — social links are never fabricated, and the
 * on-chain metadata itself is never modified.
 */
import { currentNetworkRaw } from "../network-env";
import { PublicKey, Connection } from "@solana/web3.js";
import { getConnection, resolveServerNetworkConfig } from "../connection";
import { parseTokenSocials, resolveMetadataHttpUrl, type TokenSocials } from "../metadata";

// Re-export so consumers can type against the socials shape from this module.
export type { TokenSocials } from "../metadata";

export const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/**
 * Extract the `uri` field from a Metaplex Metadata account's raw data.
 * Layout: key(u8) updateAuthority(32) mint(32) name(borsh string)
 * symbol(borsh string) uri(borsh string) … — borsh strings are u32 LE length
 * followed by UTF-8 bytes.
 */
export function decodeMetadataUri(data: Uint8Array): string | null {
  try {
    let offset = 1 + 32 + 32; // key + update authority + mint
    const readString = (): string | null => {
      if (offset + 4 > data.length) return null;
      const len = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
      offset += 4;
      if (offset + len > data.length) return null;
      const value = Buffer.from(data.slice(offset, offset + len)).toString("utf8").replace(/\0+$/, "").trim();
      offset += len;
      return value;
    };
    readString(); // name
    readString(); // symbol
    return readString(); // uri
  } catch {
    return null;
  }
}

export function metadataPdaFor(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata", "utf8"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID,
  )[0];
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 6000): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/**
 * Read social links for a mint: on-chain metadata → URI → off-chain JSON →
 * normalized socials. Nulls mean "not available", never fabricated data.
 */
export async function fetchTokenSocials(
  mint: string,
  options: { gatewayHost?: string } = {},
): Promise<TokenSocials> {
  const empty: TokenSocials = { website: null, twitter: null, telegram: null };
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return empty;
  }
  try {
    const cfg = resolveServerNetworkConfig(currentNetworkRaw());
    const connection: Connection = getConnection(cfg);
    const account = await connection.getAccountInfo(metadataPdaFor(mintKey), "confirmed");
    if (!account || !account.data || account.data.length === 0) return empty;
    const uri = decodeMetadataUri(account.data);
    if (!uri) return empty;
    const httpUrl = resolveMetadataHttpUrl(uri, options.gatewayHost ?? process.env.PINATA_GATEWAY ?? "ipfs.io");
    if (!httpUrl) return empty;
    const json = await fetchJsonWithTimeout(httpUrl);
    return parseTokenSocials(json);
  } catch {
    return empty;
  }
}

/** Fetch + normalize socials directly from a known off-chain metadata URI. */
export async function fetchSocialsFromUri(
  metadataUri: string,
  options: { gatewayHost?: string } = {},
): Promise<TokenSocials> {
  const httpUrl = resolveMetadataHttpUrl(metadataUri, options.gatewayHost ?? process.env.PINATA_GATEWAY ?? "ipfs.io");
  if (!httpUrl) return { website: null, twitter: null, telegram: null };
  const json = await fetchJsonWithTimeout(httpUrl);
  return parseTokenSocials(json);
}

/* ------------------------------------------- Token-2022 mint metadata ---- */

export interface TokenOnchainIdentity {
  /** On-chain name (Token-2022 TokenMetadata extension). */
  name: string | null;
  /** On-chain symbol. */
  symbol: string | null;
  /** On-chain metadata URI, exactly as stored (never rewritten). */
  uri: string | null;
  /** Image reference from the metadata JSON, exactly as stored. */
  image: string | null;
}

/**
 * Parse a Token-2022 mint account's data for the SPL TokenMetadata extension
 * (name / symbol / uri). Pump.fun's current create writes the metadata HERE —
 * inside the mint's TLV extensions — instead of the legacy Metaplex metadata
 * PDA, which is why tokens launched through the modern create flow have no
 * Metaplex account at all.
 *
 * The walk is defensive: extensions are TLV records ([type u16][len u16][data]);
 * the TokenMetadata blob starts with a `key` byte (0x07) followed by
 * update_authority(32), mint(32) and three borsh strings. If no extension
 * parses structurally, a last-resort scan for an embedded http(s)/ipfs URI
 * keeps the resolver usable against protocol variations.
 */
export function decodeToken2022Metadata(data: Uint8Array): { name: string; symbol: string; uri: string } | null {
  try {
    const buf = Buffer.from(data);
    const readBorshString = (offset: number): { value: string; next: number } | null => {
      if (offset + 4 > buf.length) return null;
      const len = buf.readUInt32LE(offset);
      offset += 4;
      if (len > 400 || offset + len > buf.length) return null;
      const value = buf.slice(offset, offset + len).toString("utf8").replace(/\0+$/, "").trim();
      return { value, next: offset + len };
    };
    const parseBlob = (start: number): { name: string; symbol: string; uri: string } | null => {
      // key byte + update_authority(32) + mint(32)
      const nameAt = start + 1 + 32 + 32;
      if (nameAt > buf.length) return null;
      const name = readBorshString(nameAt);
      if (!name) return null;
      const symbol = readBorshString(name.next);
      if (!symbol) return null;
      const uri = readBorshString(symbol.next);
      if (!uri) return null;
      if (!uri.value) return null;
      return { name: name.value, symbol: symbol.value, uri: uri.value };
    };
    // TLV walk over the extension area (base SPL mint = 82 bytes).
    if (buf.length > 82) {
      let offset = 82;
      while (offset + 4 <= buf.length) {
        const len = buf.readUInt16LE(offset + 2);
        const blobStart = offset + 4;
        if (blobStart + len > buf.length) break;
        if (len > 0 && buf[blobStart] === 0x07) {
          const parsed = parseBlob(blobStart);
          if (parsed) return parsed;
        }
        offset = blobStart + len;
      }
    }
    // Fallback: scan the raw bytes for an embedded metadata URI (protocol
    // variations, partial writers). Never fabricates — only real URLs match.
    const s = buf.toString("latin1");
    const match = s.match(/(?:https?:\/\/[\x21-\x7e]{10,200}|ipfs:\/\/[\x21-\x7e]{6,200})/);
    if (match) {
      const uri = match[0].replace(/[.,;)\]]+$/, "").trim();
      if (uri) return { name: "", symbol: "", uri };
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract the image reference from a metadata JSON document. */
export function extractMetadataImage(json: unknown): string | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };
  const direct = pick("image", "icon", "logoURI", "imageUrl", "artwork", "pfp");
  if (direct) return direct;
  const files = obj.files && typeof obj.files === "object" && !Array.isArray(obj.files)
    ? (obj.files as Record<string, unknown>)
    : null;
  if (files) {
    for (const k of ["image", "icon", "logoURI"]) {
      const v = files[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

/* Identity cache: success 10 min, failure 60 s (bounded retry pressure). */
const identityCache = new Map<string, { at: number; ttl: number; value: TokenOnchainIdentity | null }>();
const identityInflight = new Map<string, Promise<TokenOnchainIdentity | null>>();
const IDENTITY_OK_TTL_MS = 10 * 60_000;
const IDENTITY_MISS_TTL_MS = 60_000;

/** Test hook: reset the identity cache between tests. */
export function __resetTokenIdentityCacheForTests(): void {
  identityCache.clear();
  identityInflight.clear();
}

function pruneIdentityCache(): void {
  if (identityCache.size <= 200) return;
  const oldest = [...identityCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
  for (const [k] of oldest) identityCache.delete(k);
}

/** Gateway fallback chain for metadata fetches (bounded, no retry loops). */
function gatewayCandidates(url: string): string[] {
  const candidates = [url];
  // The public ipfs.io gateway rate-limits aggressively (observed HTTP 429 on
  // valid CIDs); gateway.pinata.cloud — the same provider TwinPad uploads
  // through — serves the same content reliably. Only /ipfs/ paths can be
  // re-hosted without changing the content identifier.
  const fallback = process.env.TOKEN_METADATA_FALLBACK_GATEWAY?.trim() || "gateway.pinata.cloud";
  const m = url.match(/^https?:\/\/([^/]+)(\/ipfs\/.+)$/i);
  if (m && m[1].toLowerCase() !== fallback.toLowerCase()) {
    candidates.push(`https://${fallback}${m[2]}`);
  }
  const primary = process.env.PINATA_GATEWAY?.trim() || "ipfs.io";
  if (primary !== "ipfs.io" && primary.toLowerCase() !== fallback.toLowerCase()) {
    const p = url.match(/^https?:\/\/ipfs\.io(\/ipfs\/.+)$/i);
    if (p) candidates.push(`https://${primary}${p[1]}`);
  }
  return candidates;
}

/**
 * Resolve a mint's on-chain identity (Token-2022 TokenMetadata extension →
 * metadata JSON → image). Nulls mean "unavailable" — never fabricated. Used
 * by the live-market resolver and the discovery enrichment when providers
 * cannot supply a token image.
 */
export async function fetchTokenOnchainIdentity(mint: string): Promise<TokenOnchainIdentity | null> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) return null;
  const now = Date.now();
  const hit = identityCache.get(mint);
  if (hit && now - hit.at < hit.ttl) return hit.value;
  const pending = identityInflight.get(mint);
  if (pending) return pending;
  const task = (async () => {
    let result: TokenOnchainIdentity | null = null;
    try {
      const cfg = resolveServerNetworkConfig(currentNetworkRaw());
      const connection = getConnection(cfg);
      let mintKey: PublicKey;
      try {
        mintKey = new PublicKey(mint);
      } catch {
        return null;
      }
      const account = await connection.getAccountInfo(mintKey, "confirmed");
      if (!account || !account.data || account.data.length === 0) return null;
      const decoded = decodeToken2022Metadata(account.data);
      if (!decoded?.uri) return null;
      const identity: TokenOnchainIdentity = {
        name: decoded.name || null,
        symbol: decoded.symbol || null,
        uri: decoded.uri,
        image: null,
      };
      const gateway = process.env.PINATA_GATEWAY?.trim() || "ipfs.io";
      const httpUrl = resolveMetadataHttpUrl(decoded.uri, gateway);
      if (httpUrl) {
        for (const candidate of gatewayCandidates(httpUrl)) {
          const json = await fetchJsonWithTimeout(candidate, 6_000);
          if (json != null) {
            const image = extractMetadataImage(json);
            if (image) identity.image = image;
            break;
          }
        }
      }
      result = identity;
      return result;
    } catch {
      // RPC/gateway failure → null (honest); the short negative cache bounds
      // retry pressure without ever fabricating data.
      return null;
    } finally {
      identityCache.set(mint, {
        at: Date.now(),
        ttl: result?.uri ? IDENTITY_OK_TTL_MS : IDENTITY_MISS_TTL_MS,
        value: result,
      });
      pruneIdentityCache();
    }
  })();
  identityInflight.set(mint, task);
  try {
    return await task;
  } finally {
    identityInflight.delete(mint);
  }
}

/**
 * Resolve an image reference directly from a known metadata URI (bounded,
 * with the gateway fallback chain). Used by the discovery scan when a create
 * event carries the metadata URI.
 */
export async function fetchImageFromMetadataUri(metadataUri: string): Promise<string | null> {
  const gateway = process.env.PINATA_GATEWAY?.trim() || "ipfs.io";
  const httpUrl = resolveMetadataHttpUrl(metadataUri, gateway);
  if (!httpUrl) return null;
  for (const candidate of gatewayCandidates(httpUrl)) {
    const json = await fetchJsonWithTimeout(candidate, 6_000);
    if (json != null) {
      const image = extractMetadataImage(json);
      if (image) return image;
      // Metadata JSON reached but declares no image — no further gateways
      // for the same document (the content is identical).
      return null;
    }
  }
  return null;
}
