/**
 * On-chain token metadata (Token-2022 TokenMetadata extension) tests.
 * Covers: extension decode (structured + raw fallback), metadata-JSON image
 * extraction, and the live-market wiring that fills a missing provider image
 * from the authoritative on-chain metadata. (The network-level identity
 * resolver has its own file: onchain-identity.test.ts.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeToken2022Metadata,
  extractMetadataImage,
} from "@/lib/token/onchain-metadata";
import { resolveLiveMarket, __resetLiveMarketCacheForTests } from "@/lib/token/live-market";

const MINT = "FqdaYf5oAVm3HofgscRT63VkEeJeHBbMCEZwvnANT3Hn";
const URI = "https://ipfs.io/ipfs/QmSfMFgwhn13DdqDtgEY9kUCpRTuiMNrvXzFQpK5pf974a";
const IMAGE = "https://ipfs.io/ipfs/QmRe4g2v16pa9EdHHAbq2eBGrWPHydsFbeA8R7wEjN31Js";

function borshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

/** Synthetic Token-2022 mint: 82-byte base + TokenMetadata TLV extension. */
function buildToken2022Mint(name: string, symbol: string, uri: string): Buffer {
  const base = Buffer.alloc(82, 0);
  const blob = Buffer.concat([
    Buffer.from([0x07]), // TokenMetadata key byte
    Buffer.alloc(32, 1), // update authority
    Buffer.alloc(32, 2), // mint
    borshString(name),
    borshString(symbol),
    borshString(uri),
  ]);
  const type = Buffer.alloc(2);
  type.writeUInt16LE(16); // ExtensionType::TokenMetadata
  const len = Buffer.alloc(2);
  len.writeUInt16LE(blob.length);
  // Trailing padding (real accounts pad the last extension to account size).
  return Buffer.concat([base, type, len, blob, Buffer.alloc(60, 0)]);
}

const mocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
  onchainIdentity: vi.fn(),
}));

vi.mock("@/lib/discovery/http", () => ({
  fetchJson: mocks.fetchJson,
}));

vi.mock("@/lib/token/onchain-metadata", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/token/onchain-metadata")>();
  return {
    ...actual,
    fetchTokenOnchainIdentity: mocks.onchainIdentity,
  };
});

beforeEach(() => {
  __resetLiveMarketCacheForTests();
  mocks.fetchJson.mockReset();
  mocks.onchainIdentity.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("decodeToken2022Metadata", () => {
  it("decodes the TokenMetadata extension (structured path)", () => {
    const decoded = decodeToken2022Metadata(buildToken2022Mint("test132", "TEST", URI));
    expect(decoded).toEqual({ name: "test132", symbol: "TEST", uri: URI });
  });

  it("falls back to the embedded-URL scan when no extension parses", () => {
    const base = Buffer.alloc(82, 0);
    const junk = Buffer.from("some program padding \u0007 more bytes", "latin1");
    const url = Buffer.from(" \u0000https://ipfs.io/ipfs/QmRe4g2v16pa9EdHHAbq2eBGrWPHydsFbeA8R7wEjN31Js\u0000", "latin1");
    const decoded = decodeToken2022Metadata(Buffer.concat([base, junk, url]));
    expect(decoded?.uri).toBe("https://ipfs.io/ipfs/QmRe4g2v16pa9EdHHAbq2eBGrWPHydsFbeA8R7wEjN31Js");
  });

  it("returns null for data without any metadata URI", () => {
    expect(decodeToken2022Metadata(Buffer.alloc(120, 0))).toBeNull();
  });
});

describe("extractMetadataImage", () => {
  it("picks image, then icon, then logoURI", () => {
    expect(extractMetadataImage({ image: IMAGE })).toBe(IMAGE);
    expect(extractMetadataImage({ icon: IMAGE })).toBe(IMAGE);
    expect(extractMetadataImage({ logoURI: IMAGE })).toBe(IMAGE);
  });

  it("supports a files object and returns null when absent", () => {
    expect(extractMetadataImage({ files: { image: IMAGE } })).toBe(IMAGE);
    expect(extractMetadataImage({ name: "test132" })).toBeNull();
    expect(extractMetadataImage(null)).toBeNull();
  });
});

describe("resolveLiveMarket on-chain image fallback", () => {
  it("fills a missing provider image from the on-chain metadata", async () => {
    mocks.fetchJson.mockResolvedValue({
      pairs: [
        {
          chainId: "solana",
          dexId: "pumpfun",
          pairAddress: "DvZPiZgtiT19vghAgzvSJYHYhdnojMVWwTzQWs1w5V9H",
          baseToken: { address: MINT, name: "test132", symbol: "TEST" },
          priceUsd: "0.00000199",
          // no info.imageUrl — exactly the observed DexScreener shape
        },
      ],
    });
    mocks.onchainIdentity.mockResolvedValue({ name: "test132", symbol: "TEST", uri: URI, image: IMAGE });

    const live = await resolveLiveMarket(MINT);
    expect(live.available).toBe(true);
    expect(live.identity?.name).toBe("test132");
    expect(live.identity?.imageUrl).toBe(IMAGE);
  });

  it("keeps the honest null when neither providers nor the chain have an image", async () => {
    mocks.fetchJson.mockResolvedValue({
      pairs: [
        {
          chainId: "solana",
          dexId: "pumpfun",
          pairAddress: "DvZPiZgtiT19vghAgzvSJYHYhdnojMVWwTzQWs1w5V9H",
          baseToken: { address: MINT, name: "test132", symbol: "TEST" },
        },
      ],
    });
    mocks.onchainIdentity.mockResolvedValue(null);

    const live = await resolveLiveMarket(MINT);
    expect(live.identity?.imageUrl).toBeNull();
    expect(live.identity?.name).toBe("test132"); // provider identity untouched
  });
});
