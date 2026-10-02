import {
  useLeverageYieldEffectiveApr,
  useLeverageYieldPosition,
  useLeverageYieldPreviewRedeem,
  useLeverageYieldShareBalances,
  useLeverageYieldTotalAssets,
} from '@sodax/dapp-kit';
import type { LeverageYieldVault } from '@sodax/sdk';
import { useMemo } from 'react';
import { maxUint256 } from 'viem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SOURCE_CHAINS } from '@/config/workshop';
import { formatBps, formatRayPercent, formatTokenAmount, formatWad, ONE_SHARE } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useEvmWallet } from '@/wallet';
import { SHARE_DECIMALS, underlyingLabel } from './helpers';

type Props = {
  vault: LeverageYieldVault;
  selected: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
};

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{loading ? <Skeleton className="h-5 w-16" /> : value}</dd>
    </div>
  );
}

/** Health factor as a bar: empty at 1.00 (liquidation), full at 1.60 or more. */
function HealthGauge({ factor, label, loading }: { factor?: bigint; label: string; loading: boolean }) {
  const ratio = factor === undefined ? 0 : Math.min(Math.max((Number(factor) / 1e18 - 1) / 0.6, 0.04), 1);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <dt className="text-xs text-muted-foreground">Health factor</dt>
        <dd className="text-sm font-semibold tabular-nums">{loading ? <Skeleton className="h-5 w-12" /> : label}</dd>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className="h-full rounded-full bg-gradient-to-r from-destructive via-primary to-accent transition-all duration-700"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-subtle-foreground">
        <span>Liquidation 1.00</span>
        <span>Safer</span>
      </div>
    </div>
  );
}

/** One vault: live APR, TVL, share price, leverage and health, plus the connected wallet's shares in it. */
export function VaultCard({ vault, selected, onDeposit, onWithdraw }: Props) {
  const { address } = useEvmWallet();
  const label = underlyingLabel(vault.name);

  const apr = useLeverageYieldEffectiveApr({ params: { vault: vault.vault } });
  const tvl = useLeverageYieldTotalAssets({ params: { vault: vault.vault } });
  const position = useLeverageYieldPosition({ params: { vault: vault.vault } });
  const sharePrice = useLeverageYieldPreviewRedeem({ params: { vault: vault.vault, shares: ONE_SHARE } });

  const holders = useMemo(
    () => (address ? SOURCE_CHAINS.map(chainKey => ({ chainKey, address })) : undefined),
    [address],
  );
  const balances = useLeverageYieldShareBalances({ params: { vault: vault.vault, holders } });
  const myShares = balances.reduce((sum, q) => sum + (q.data?.shares ?? 0n), 0n);

  const netApr = apr.data?.effectiveNetAprRay;
  // The multiplier is the borrowed multiple; the exposure a depositor holds is 1 + that.
  const leverage = apr.data ? formatWad(ONE_SHARE + apr.data.leverageMultiplierWad, 2) : undefined;
  const health = position.data
    ? position.data.healthFactor === maxUint256
      ? 'No debt'
      : formatWad(position.data.healthFactor, 2)
    : undefined;

  const negative = netApr !== undefined && netApr < 0n;

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        selected && 'ring-2 ring-primary',
      )}
    >
      <CardHeader className="relative gap-5 bg-gradient-to-br from-secondary via-secondary/40 to-card pb-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100"
        />
        <div className="relative flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base text-primary-foreground shadow-md ring-4 ring-card"
          >
            {label.slice(0, 2)}
          </span>
          <div className="flex min-w-0 flex-col">
            <CardTitle className="truncate">{vault.name}</CardTitle>
            <span className="text-sm text-muted-foreground">Leveraged {label}</span>
          </div>
          {selected && <Badge className="ml-auto bg-primary text-primary-foreground">Selected</Badge>}
        </div>
        <div className="relative flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net APR</span>
            {apr.isLoading ? (
              <Skeleton className="h-11 w-32" />
            ) : (
              <span
                className={cn(
                  'font-display text-5xl leading-none tabular-nums',
                  negative ? 'text-destructive' : 'text-success',
                )}
              >
                {netApr === undefined ? 'n/a' : formatRayPercent(netApr)}
              </span>
            )}
          </div>
          {leverage && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-sm">
              {leverage}× exposure
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <dl className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="TVL"
              value={`${formatTokenAmount(tvl.data, SHARE_DECIMALS, 2)} ${label}`}
              loading={tvl.isLoading}
            />
            <Stat
              label="Share price"
              value={`${formatTokenAmount(sharePrice.data, SHARE_DECIMALS, 4)} ${label}`}
              loading={sharePrice.isLoading}
            />
            <Stat
              label="Target LTV"
              value={apr.data ? formatBps(apr.data.targetLtvBps) : '–'}
              loading={apr.isLoading}
            />
          </div>
          <HealthGauge factor={position.data?.healthFactor} label={health ?? '–'} loading={position.isLoading} />
        </dl>
        {negative && (
          <p className="text-xs text-destructive">
            The borrow rate is above the yield right now, so the net APR is negative.
          </p>
        )}
        <div className="flex items-center justify-between rounded-full bg-muted px-4 py-2 text-sm">
          <span className="text-muted-foreground">Your shares</span>
          <span className="font-semibold tabular-nums">
            {!address
              ? 'Connect wallet'
              : balances.some(q => q.isLoading)
                ? '…'
                : formatTokenAmount(myShares, SHARE_DECIMALS, 4)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onDeposit}>
            Deposit
          </Button>
          {myShares > 0n && (
            <Button className="flex-1" variant="outline" onClick={onWithdraw}>
              Withdraw
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
