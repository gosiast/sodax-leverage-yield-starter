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

function Stat({ label, value, loading, tone }: { label: string; value: string; loading: boolean; tone?: 'negative' }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm font-semibold tabular-nums', tone === 'negative' && 'text-destructive')}>
        {loading ? <Skeleton className="h-5 w-16" /> : value}
      </dd>
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
        'overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md',
        selected && 'ring-2 ring-primary',
      )}
    >
      <CardHeader className="gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
          >
            {label.slice(0, 2)}
          </span>
          <div className="flex min-w-0 flex-col">
            <CardTitle className="truncate">{vault.name}</CardTitle>
            <span className="text-sm text-muted-foreground">Leveraged {label}</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net APR</span>
            {apr.isLoading ? (
              <Skeleton className="mt-1 h-9 w-28" />
            ) : (
              <span
                className={cn(
                  'font-display text-4xl leading-none tabular-nums',
                  negative ? 'text-destructive' : 'text-success',
                )}
              >
                {netApr === undefined ? 'n/a' : formatRayPercent(netApr)}
              </span>
            )}
          </div>
          {leverage && <Badge variant="muted">{leverage}× exposure</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-2">
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
          <Stat label="Target LTV" value={apr.data ? formatBps(apr.data.targetLtvBps) : '–'} loading={apr.isLoading} />
          <Stat label="Health factor" value={health ?? '–'} loading={position.isLoading} />
        </dl>
        {negative && (
          <p className="text-xs text-destructive">
            The borrow rate is above the yield right now, so the net APR is negative.
          </p>
        )}
        <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
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
