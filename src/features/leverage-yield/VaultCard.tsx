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
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm font-semibold', tone === 'negative' && 'text-destructive')}>
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

  return (
    <Card className={cn('transition-shadow', selected && 'ring-2 ring-primary')}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{vault.name}</CardTitle>
          <span className="text-sm text-muted-foreground">Leveraged {label}</span>
        </div>
        <Badge variant={netApr !== undefined && netApr < 0n ? 'destructive' : 'success'}>
          {apr.isLoading ? '…' : netApr === undefined ? 'APR n/a' : `${formatRayPercent(netApr)} APR`}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
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
          <Stat label="Leverage" value={leverage ? `${leverage}×` : '–'} loading={apr.isLoading} />
          <Stat label="Target LTV" value={apr.data ? formatBps(apr.data.targetLtvBps) : '–'} loading={apr.isLoading} />
          <Stat label="Health factor" value={health ?? '–'} loading={position.isLoading} />
          <Stat
            label="Your shares"
            value={address ? formatTokenAmount(myShares, SHARE_DECIMALS, 4) : 'Connect wallet'}
            loading={!!address && balances.some(q => q.isLoading)}
          />
        </dl>
        {netApr !== undefined && netApr < 0n && (
          <p className="text-xs text-destructive">
            The borrow rate is above the yield right now, so the net APR is negative.
          </p>
        )}
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
