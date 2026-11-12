"use client";

/**
 * Portfolio — the connected wallet's personal vault view.
 *
 * Data sources (existing integrations only, no new backend):
 *  - SOL balance: Connection.getBalance via the wallet-adapter connection.
 *  - SPL holdings: Connection.getParsedTokenAccountsByOwner (raw amounts;
 *    no fabricated USD values — tokens without trusted prices show amounts).
 *  - Recent transactions: Connection.getSignaturesForAddress with Solscan
 *    links (explorer links only, never fabricated history).
 */

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { Identicon } from "@/components/ui/identicon";
import { Icon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/section";
import { timeAgo, shortAddress, formatCompact } from "@/lib/format";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

interface Holding {
  mint: string;
  amount: number;
  decimals: number;
}

interface RecentTx {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
}

export default function PortfolioPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [txs, setTxs] = useState<RecentTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const [lamports, tokenAccounts, signatures] = await Promise.all([
        connection.getBalance(publicKey),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: new (await import("@solana/web3.js")).PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }),
        connection.getSignaturesForAddress(publicKey, { limit: 12 }),
      ]);
      setBalance(lamports / LAMPORTS_PER_SOL);
      const list: Holding[] = [];
      for (const acc of tokenAccounts.value) {
        const parsed = acc.account.data.parsed?.info as
          | { mint: string; tokenAmount: { uiAmount: number | null; decimals: number } }
          | undefined;
        if (parsed && parsed.tokenAmount && (parsed.tokenAmount.uiAmount ?? 0) > 0) {
          list.push({
            mint: parsed.mint,
            amount: parsed.tokenAmount.uiAmount ?? 0,
            decimals: parsed.tokenAmount.decimals,
          });
        }
      }
      list.sort((a, b) => b.amount - a.amount);
      setHoldings(list);
      setTxs(
        signatures.map((s) => ({
          signature: s.signature,
          slot: s.slot,
          blockTime: s.blockTime ?? null,
          err: s.err,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) void load();
  }, [connected, publicKey, load]);

  if (!connected || !publicKey) {
    return (
      <div className="animate-fade-up">
        <SectionHeading
          eyebrow="Personal vault"
          title="Portfolio"
          description="Your balances, holdings and recent on-chain activity — straight from the connected wallet."
          icon="wallet"
        />
        <EmptyState
          title="Connect your wallet"
          description="Connect Phantom or Solflare to see your SOL balance, SPL holdings and recent transactions."
          action={
            <span className="inline-flex items-center gap-2 text-sm text-mint-400">
              <Icon name="wallet" size={14} /> Use the wallet button in the top bar
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <SectionHeading
        eyebrow="Personal vault"
        title="Portfolio"
        description="Your balances, holdings and recent on-chain activity — read directly from Solana through your connected wallet. No custody, no server-side keys."
        icon="wallet"
      />

      {/* Wallet card */}
      <div className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#0E7490] p-6 text-white shadow-[0_24px_60px_-24px_rgba(109,40,217,0.65)]">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Identicon value={publicKey.toBase58()} size={56} />
          <div className="min-w-0">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-white/70">Total balance</p>
            <p className="font-mono text-3xl font-extrabold">{balance == null ? "—" : `${balance.toFixed(4)} SOL`}</p>
            <p className="mt-0.5 truncate font-mono text-2xs text-white/60">{publicKey.toBase58()}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`https://solscan.io/account/${publicKey.toBase58()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold backdrop-blur-sm transition hover:bg-white/25"
            >
              <Icon name="external" size={12} /> Solscan
            </a>
            <button
              onClick={() => void load()}
              aria-label="Refresh"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold backdrop-blur-sm transition hover:bg-white/25"
            >
              <Icon name="refresh" size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}
      {loading && <Spinner label="Reading on-chain accounts…" />}

      {/* Holdings */}
      <section aria-label="Token holdings" className="rounded-3xl border border-night-700/70 bg-paper p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-ink">
            <Icon name="coins" size={15} className="text-mint-500" /> Token holdings
          </h2>
          <span className="text-2xs text-night-500">{holdings?.length ?? 0} tokens with balance</span>
        </div>
        {holdings !== null && holdings.length === 0 ? (
          <p className="px-1 py-4 text-sm text-night-400">
            No SPL token balances in this wallet yet. Tokens you buy on TwinPad curves appear here.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(holdings ?? []).slice(0, 12).map((h) => (
              <li key={h.mint}>
                <Link
                  href={`/tokens/${h.mint}`}
                  className="tp-tilt flex items-center gap-3 rounded-2xl border border-night-700 bg-night-850 p-3 transition-all duration-200 hover:border-mint-500/40"
                >
                  <Identicon value={h.mint} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-ink">{shortAddress(h.mint, 6)}</span>
                    <span className="block text-2xs text-night-500">{h.decimals} decimals</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs font-bold text-ink">{formatCompact(h.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {holdings != null && holdings.length > 12 && (
          <p className="mt-2 px-1 text-2xs text-night-500">+ {holdings.length - 12} more holdings</p>
        )}
      </section>

      {/* Recent transactions */}
      <section aria-label="Recent transactions" className="rounded-3xl border border-night-700/70 bg-paper p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-ink">
            <Icon name="activity" size={15} className="text-mint-500" /> Recent transactions
          </h2>
          <span className="text-2xs text-night-500">latest {txs?.length ?? 0} signatures</span>
        </div>
        {txs !== null && txs.length === 0 ? (
          <p className="px-1 py-4 text-sm text-night-400">No recent transactions for this wallet.</p>
        ) : (
          <ul className="space-y-1">
            {(txs ?? []).map((tx) => (
              <li key={tx.signature} className="row-sep flex items-center gap-3 px-2 py-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${tx.err ? "bg-down" : "bg-up"}`}
                  title={tx.err ? "Failed" : "Success"}
                />
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-mono text-xs text-ice-300 hover:underline"
                >
                  {tx.signature}
                </a>
                <span className="shrink-0 text-2xs text-night-500">
                  {tx.blockTime ? timeAgo(tx.blockTime * 1000) : `slot ${tx.slot}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


