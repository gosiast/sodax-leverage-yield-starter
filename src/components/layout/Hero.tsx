import { brand } from '@/brand/brand.config';
import { HeroBackdrop } from './HeroBackdrop';
import { HeroGlass } from './HeroGlass';

/** Primary-surface hero band. Display title in the display font, one accent word in the accent font. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero text-hero-foreground">
      <HeroBackdrop />
      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 pb-24 pt-10 sm:px-6 sm:pt-12">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-hero-muted">🇵🇱 Built in Poland</span>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            <span className="block">Leveraged staking yield,</span>
            <span className="block">
              <span className="font-accent text-hero-accent">one</span> deposit.
            </span>
          </h1>
          <p className="max-w-xl text-pretty text-lg font-light text-hero-muted">{brand.tagline}</p>
          <p className="max-w-xl text-pretty text-sm text-hero-muted">
            <span className="font-accent text-base text-hero-accent">Cheers to yield!</span> Top-shelf staking yield,
            poured into one deposit. <span className="whitespace-nowrap">Soplica optional, risk awareness not.</span>
          </p>
        </div>
        <HeroGlass />
      </div>
    </section>
  );
}
