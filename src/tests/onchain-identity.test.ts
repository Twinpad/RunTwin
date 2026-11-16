/**
 * Network-level on-chain identity resolver tests (connection + fetch mocked).
 * Covers: RPC read â†’ Token-2022 decode â†’ metadata JSON fetch with the gateway
 * fallback chain (ipfs.io 429 â†’ gateway.pinata.cloud), the bounded success/
 * miss cache, and honest nulls when the mint has no metadata.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchTokenOnchainIdentity,
  __resetTokenIdentityCacheForTests,
} from "@/lib/token/onchain-metadata";

const MINT = "FqdaYf5oAVm3HofgscRT63VkEeJeHBbMCEZwvnANT3Hn";
const URI = "https://ipfs.io/ipfs/QmSfMFgwhn13DdqDtgEY9kUCpRTuiMNrvXzFQpK5pf974a";
const IMAGE = "https://ipfs.io/ipfs/QmRe4g2v16pa9EdHHAbq2eBGrWPHydsFbeA8R7wEjN31Js";

function borshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

function buildToken2022Mint(name: string, symbol: string, uri: string): Buffer {
  const base = Buffer.alloc(82, 0);
  const blob = Buffer.concat([
    Buffer.from([0x07]),
    Buffer.alloc(32, 1),
    Buffer.alloc(32, 2),
    borshString(name),
    borshString(symbol),
    borshString(uri),
  ]);
  const type = Buffer.alloc(2);
  type.writeUInt16LE(16);
  const len = Buffer.alloc(2);
  len.writeUInt16LE(blob.length);
  return Buffer.concat([base, type, len, blob, Buffer.alloc(60, 0)]);
}

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
}));

vi.mock("@/lib/connection", () => ({
  getConnection: mocks.getConnection,
  resolveServerNetworkConfig: vi.fn(() => ({
    cluster: "mainnet-beta",
    rpcUrl: "https://rpc.test",
    commitment: "confirmed",
  })),
}));

beforeEach(() => {
  __resetTokenIdentityCacheForTests();
  mocks.getConnection.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTokenOnchainIdentity", () => {
  it("resolves identity via RPC + gateway fallback when ipfs.io 429s", async () => {
    const account = { data: buildToken2022Mint("test132", "TEST", URI), length: 396 };
    mocks.getConnection.mockReturnValue({
      getAccountInfo: vi.fn(async () => account),
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 }) // ipfs.io metadata JSON
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: "test132", symbol: "TEST", image: IMAGE }),
      }); // gateway.pinata.cloud fallback
    globalThis.fetch = fetchMock as never;

    const identity = await fetchTokenOnchainIdentity(MINT);
    expect(identity).not.toBeNull();
    expect(identity?.uri).toBe(URI);
    expect(identity?.image).toBe(IMAGE);
    expect(fetchMock).toHaveBeenCalledTimes(2); // primary + fallback, bounded
  });

  it("caches the identity (repeat calls do not re-fetch)", async () => {
    const account = { data: buildToken2022Mint("test132", "TEST", URI), length: 396 };
    mocks.getConnection.mockReturnValue({
      getAccountInfo: vi.fn(async () => account),
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ image: IMAGE }),
    });
    globalThis.fetch = fetchMock as never;

    await fetchTokenOnchainIdentity(MINT);
    const again = await fetchTokenOnchainIdentity(MINT);
    expect(again?.image).toBe(IMAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null (honest miss) when the mint has no metadata", async () => {
    mocks.getConnection.mockReturnValue({
      getAccountInfo: vi.fn(async () => null),
    });
    globalThis.fetch = vi.fn() as never;
    const identity = await fetchTokenOnchainIdentity(MINT);
    expect(identity).toBeNull();
  });

  it("rejects malformed mints without any network access", async () => {
    const identity = await fetchTokenOnchainIdentity("not-a-mint");
    expect(identity).toBeNull();
  });
});

