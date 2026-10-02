import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NextPrompt } from '@/components/workshop/NextPrompt';
import { DEFAULT_VAULT_NAME } from '@/config/workshop';
import { cn } from '@/lib/utils';
import { DepositCard } from './DepositCard';
import { useVaults } from './helpers';
import { VaultCard } from './VaultCard';
import { WithdrawCard } from './WithdrawCard';

type Tab = 'deposit' | 'withdraw';

const TABS: { value: Tab; label: string }[] = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdraw' },
];

/**
 * SODAX Leverage Yield: browse the vaults, deposit from any supported network and token, see your shares and
 * withdraw. A vault card's buttons select that vault in the form beside it.
 */
export function LeverageYieldPage() {
  const vaults = useVaults();
  const [vaultName, setVaultName] = useState<string>(DEFAULT_VAULT_NAME);
  const [tab, setTab] = useState<Tab>('deposit');

  const select = (name: string, next: Tab) => {
    setVaultName(name);
    setTab(next);
    // On small screens the form sits below the cards; bring it into view.
    document.getElementById('vault-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col gap-6">
      <NextPrompt next="done" />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="vaults-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="vaults-heading" className="text-xl font-bold">
              Vaults
            </h2>
            <p className="text-sm text-muted-foreground">
              Pooled vaults that loop a liquid staking token to multiply its yield, and its risk. Your position is the
              vault's <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">lsoda*</code> share token.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {vaults.map(vault => (
              <VaultCard
                key={vault.name}
                vault={vault}
                selected={vault.name === vaultName}
                onDeposit={() => select(vault.name, 'deposit')}
                onWithdraw={() => select(vault.name, 'withdraw')}
              />
            ))}
          </div>
        </section>

        <Card id="vault-actions" className="scroll-mt-4 lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>{tab === 'deposit' ? 'Deposit' : 'Withdraw'}</CardTitle>
            <CardDescription>
              {tab === 'deposit'
                ? 'Pay with a token on a supported network and receive vault shares.'
                : 'Sell your vault shares back into a token on a network you choose.'}
            </CardDescription>
            <fieldset className="mt-2 flex w-fit gap-1 rounded-full border bg-muted p-1">
              <legend className="sr-only">Action</legend>
              {TABS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={tab === option.value}
                  onClick={() => setTab(option.value)}
                  className={cn(
                    'rounded-full px-4 py-1 text-sm font-medium transition-colors',
                    tab === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </fieldset>
          </CardHeader>
          <CardContent>
            {tab === 'deposit' ? (
              <DepositCard vaultName={vaultName} onVaultChange={setVaultName} />
            ) : (
              <WithdrawCard vaultName={vaultName} onVaultChange={setVaultName} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
