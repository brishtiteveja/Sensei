import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Globe2, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { Aurora } from '@/components/art/Aurora';
import { SenseiOwl } from '@/components/art/SenseiOwl';
import { HeroConstellation } from '@/components/art/HeroArt';
import { t } from '@/i18n/strings';

/**
 * The first screen: what Sensei is and why it can exist now.
 *
 * The claim doing the work is Bloom's two-sigma — one-on-one tutoring is the
 * largest effect ever measured in education, and it has only ever been
 * affordable for some families. Everything below it is evidence that this is a
 * real tutor rather than a chat window: it sees handwriting, it speaks eight
 * languages, and it keeps working with the network unplugged.
 */
export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-page">
      <Aurora />

      <main className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <SenseiOwl size={82} className="shadow-glow-sm rounded-3xl" />

        <h1 className="mt-7 text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[60px]">
          {t.app.name}
        </h1>
        <p className="s-gradient-text mt-3 text-xl font-medium tracking-[-0.02em] sm:text-2xl">
          {t.landing.tagline}
        </p>

        <p className="mt-7 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
          {t.landing.problem}
        </p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
          {t.landing.built}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/practice"
            className="s-gradient-fill inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold text-white shadow-glow-sm transition hover:opacity-95"
          >
            {t.landing.start}
            <ArrowRight size={17} />
          </Link>
          <Link
            to="/tutor"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-[15px] font-medium text-ink transition hover:border-accent/40"
          >
            <Sparkles size={16} />
            {t.landing.ask}
          </Link>
        </div>

        <HeroConstellation className="pointer-events-none mt-14 h-32 w-full max-w-2xl opacity-90" />

        <div className="mt-14 grid w-full gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          <Pillar icon={<Camera size={18} />} title={t.landing.p1} body={t.landing.p1body} />
          <Pillar icon={<Globe2 size={18} />} title={t.landing.p2} body={t.landing.p2body} />
          <Pillar icon={<ShieldCheck size={18} />} title={t.landing.p3} body={t.landing.p3body} />
          <Pillar icon={<WifiOff size={18} />} title={t.landing.p4} body={t.landing.p4body} />
        </div>

        <p className="mt-14 max-w-2xl text-[13.5px] leading-relaxed text-ink-faint">
          {t.landing.spark}
        </p>
      </main>
    </div>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5 shadow-card">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <p className="mt-3 text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
