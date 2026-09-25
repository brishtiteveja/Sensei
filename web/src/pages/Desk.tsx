import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  Hand,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Mic,
  MicOff,
  Pause,
  Play,
  Plug,
  Repeat2,
  ScanFace,
  Send,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, type Tone } from '@/components/ui/Badge';
import {
  desk,
  deskUrl,
  loadDeskConfig,
  saveDeskConfig,
  subscribe,
  watchCall,
  type DeskConfig,
  type DeskEvent,
  type DeskMessage,
  type DeskStatus,
  type TutorAction,
  type TutorState,
} from '@/lib/desk';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * SenseiDesk: the controller for a human tutor or a parent.
 *
 * The student works on paper under the phone on the pan-tilt head; the phone calls the Sensei
 * Desk gateway on the Spark. This page watches that call live (video and, on request, the
 * student's voice), shows every interaction as it happens (what the student said, what Sensei
 * read on the page and said back, where the head looked), and can step in: start a session,
 * ask for a hint or a check, say something through the phone, or move the head.
 */
export function DeskPage() {
  const [cfg, setCfg] = useState<DeskConfig>(loadDeskConfig);
  const [connected, setConnected] = useState(false);

  return (
    <Page title={t.desk.title} subtitle={t.desk.subtitle} wide>
      {connected && cfg.key ? (
        <LiveDesk cfg={cfg} onDisconnect={() => setConnected(false)} />
      ) : (
        <ConnectCard
          cfg={cfg}
          onConnect={(next) => {
            saveDeskConfig(next);
            setCfg(next);
            setConnected(true);
          }}
        />
      )}
    </Page>
  );
}

// --- connect ----------------------------------------------------------------------------------

function ConnectCard({ cfg, onConnect }: { cfg: DeskConfig; onConnect: (c: DeskConfig) => void }) {
  const [url, setUrl] = useState(cfg.url);
  const [key, setKey] = useState(cfg.key);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryConnect = async () => {
    setBusy(true);
    setError(null);
    const next = { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
    try {
      await desk.status(next);
      onConnect(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <Plug size={20} className="text-accent" />
        <h2 className="text-lg font-semibold text-ink">{t.desk.connectTitle}</h2>
      </div>
      <p className="mb-5 text-sm text-ink-muted">{t.desk.connectHelp}</p>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{t.desk.gatewayUrl}</label>
      <input
        className="mb-4 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://spark-e257.tail803c7f.ts.net:8443"
      />
      <label className="mb-1 block text-xs font-medium text-ink-muted">{t.desk.accessKey}</label>
      <input
        className="mb-5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && tryConnect()}
      />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <Button onClick={tryConnect} disabled={busy || !url.trim()} fullWidth>
        {busy ? t.desk.connecting : t.desk.connect}
      </Button>
    </Card>
  );
}

// --- the live desk ----------------------------------------------------------------------------

function LiveDesk({ cfg, onDisconnect }: { cfg: DeskConfig; onDisconnect: () => void }) {
  const [status, setStatus] = useState<DeskStatus | null>(null);
  const [tutor, setTutor] = useState<TutorState | null>(null);
  const [events, setEvents] = useState<DeskEvent[]>([]);
  const [streamOpen, setStreamOpen] = useState(false);
  const [session, setSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onMessage = useCallback((m: DeskMessage) => {
    if (m.type === 'hello') {
      setStatus(m.status);
      setTutor(m.status.tutor ?? null);
      setEvents(m.history);
      setSession(m.session);
    } else if (m.type === 'event') {
      if (m.event === 'started') {
        setSession(m.session);
        setEvents([m]);
        return;
      }
      setEvents((prev) => [...prev.slice(-400), m]);
    } else if (m.type === 'phone' && m.msg.type === 'tutor') {
      setTutor(m.msg as unknown as TutorState);
    }
  }, []);

  useEffect(() => subscribe(cfg, onMessage, setStreamOpen), [cfg, onMessage]);

  // Status (fps, route, head) isn't evented; refresh it now and then.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await desk.status(cfg);
        if (alive) setStatus(s);
      } catch {
        /* the event stream reports being offline */
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [cfg]);

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [],
  );

  const live = Boolean(status?.connected);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <LiveVideo cfg={cfg} session={live ? session : null} />
        <StatePanel status={status} tutor={tutor} streamOpen={streamOpen} onDisconnect={onDisconnect} />
        <Controls cfg={cfg} status={status} tutor={tutor} live={live} act={act} error={error} />
      </div>
      <Timeline cfg={cfg} events={events} />
    </div>
  );
}

function LiveVideo({ cfg, session }: { cfg: DeskConfig; session: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'webrtc' | 'mjpeg' | 'off'>('off');
  const [muted, setMuted] = useState(true);

  // A new phone call means new tracks: watch again for every session.
  useEffect(() => {
    if (!session || !videoRef.current) {
      setMode('off');
      return;
    }
    let pc: RTCPeerConnection | null = null;
    let cancelled = false;
    watchCall(cfg, videoRef.current)
      .then((p) => {
        if (cancelled) p.close();
        else {
          pc = p;
          setMode('webrtc');
        }
      })
      .catch(() => !cancelled && setMode('mjpeg')); // no WebRTC path: fall back to the preview stream
    return () => {
      cancelled = true;
      pc?.close();
    };
  }, [cfg, session]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn('h-full w-full object-contain', mode !== 'webrtc' && 'hidden')}
        />
        {mode === 'mjpeg' ? (
          <img src={deskUrl(cfg, '/preview.mjpg')} alt="" className="h-full w-full object-contain" />
        ) : null}
        {mode === 'off' ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            {t.desk.noPhone}
          </div>
        ) : null}
        {mode === 'webrtc' ? (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? t.desk.listen : t.desk.mute}
          </button>
        ) : null}
        {mode !== 'off' ? (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {t.desk.live}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

function StatePanel({
  status,
  tutor,
  streamOpen,
  onDisconnect,
}: {
  status: DeskStatus | null;
  tutor: TutorState | null;
  streamOpen: boolean;
  onDisconnect: () => void;
}) {
  const left = tutor && tutor.phase !== 'ended' ? tutor.remaining_s : null;
  const cells: Array<[string, React.ReactNode]> = [
    [t.desk.phone, status?.connected ? `${status.fps ?? 0} fps` : t.desk.offline],
    [t.desk.session, tutor ? phaseLabel(tutor.phase) : '—'],
    [t.desk.timeLeft, left != null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '—'],
    [t.desk.subject, tutor?.subject ? `${tutor.subject}${tutor.topic ? ` · ${tutor.topic}` : ''}` : '—'],
    [t.desk.problem, tutor?.problem ?? '—'],
    [t.desk.hints, tutor ? `${tutor.hints_given} (level ${tutor.hint_level})` : '—'],
    [t.desk.head, status?.head?.connected ? `${status.head.looking_at ?? ''} ${status.head.pan}°/${status.head.tilt}°` : t.desk.offline],
    [t.desk.voice, status?.voice ? t.desk.on : t.desk.off],
  ];
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={status?.connected ? 'success' : 'neutral'}>
          {status?.connected ? t.desk.phoneLive : t.desk.noPhone}
        </Badge>
        {tutor?.thinking ? <Badge tone="info">{t.desk.thinking}</Badge> : null}
        {status?.jev?.on ? <Badge tone="accent">Jev · {status.jev.backend}</Badge> : null}
        {status?.brain ? <Badge tone="neutral">{status.brain}</Badge> : null}
        <Badge tone={streamOpen ? 'success' : 'warning'}>{streamOpen ? t.desk.streaming : t.desk.reconnecting}</Badge>
        <button type="button" onClick={onDisconnect} className="ml-auto text-xs text-ink-muted hover:text-ink">
          {t.desk.changeGateway}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {cells.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{k}</dt>
            <dd className="truncate text-sm font-medium text-ink" title={typeof v === 'string' ? v : undefined}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function phaseLabel(phase: TutorState['phase']): string {
  return { idle: t.desk.idle, watching: t.desk.watching, paused: t.desk.paused, ended: t.desk.ended }[phase];
}

function Controls({
  cfg,
  status,
  tutor,
  live,
  act,
  error,
}: {
  cfg: DeskConfig;
  status: DeskStatus | null;
  tutor: TutorState | null;
  live: boolean;
  act: (fn: () => Promise<unknown>) => void;
  error: string | null;
}) {
  const [text, setText] = useState('');
  const watching = tutor?.phase === 'watching';
  const paused = tutor?.phase === 'paused';
  const run = (a: TutorAction, minutes?: number) => act(() => desk.tutor(cfg, a, minutes));
  const say = () => {
    const msg = text.trim();
    if (!msg) return;
    act(async () => {
      await desk.say(cfg, msg);
      setText('');
    });
  };

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-ink">{t.desk.controls}</h3>

      <div className="mb-4 flex flex-wrap gap-2">
        {!watching && !paused
          ? [5, 10, 15].map((m) => (
              <Button key={m} size="sm" disabled={!live} onClick={() => run('start', m)}>
                <Play size={14} /> {t.desk.start(m)}
              </Button>
            ))
          : null}
        <Button size="sm" variant="secondary" disabled={!watching} onClick={() => run('hint')}>
          <Lightbulb size={14} /> {t.desk.hint}
        </Button>
        <Button size="sm" variant="secondary" disabled={!watching} onClick={() => run('check')}>
          <ListChecks size={14} /> {t.desk.check}
        </Button>
        <Button size="sm" variant="secondary" disabled={!watching} onClick={() => run('look')}>
          <Eye size={14} /> {t.desk.whatDoYouSee}
        </Button>
        <Button size="sm" variant="ghost" disabled={!live} onClick={() => run('repeat')}>
          <Repeat2 size={14} /> {t.desk.repeat}
        </Button>
        {watching ? (
          <Button size="sm" variant="ghost" onClick={() => run('pause')}>
            <Pause size={14} /> {t.desk.pause}
          </Button>
        ) : null}
        {paused ? (
          <Button size="sm" variant="ghost" onClick={() => run('resume')}>
            <Play size={14} /> {t.desk.resume}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" disabled={!live} onClick={() => act(() => desk.hush(cfg))}>
          <Hand size={14} /> {t.desk.hush}
        </Button>
        <Button size="sm" variant="danger" disabled={!watching && !paused} onClick={() => run('end')}>
          <Square size={14} /> {t.desk.end}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder={t.desk.sayPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && say()}
          disabled={!live}
        />
        <Button size="sm" onClick={say} disabled={!live || !text.trim()}>
          <Send size={14} /> {t.desk.say}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-ink-muted">{t.desk.head}</span>
        {(['notebook', 'student', 'home'] as const).map((p) => (
          <Button key={p} size="sm" variant="subtle" disabled={!status?.head?.connected}
            onClick={() => act(() => desk.head(cfg, { preset: p }))}>
            {p === 'notebook' ? t.desk.lookNotebook : p === 'student' ? t.desk.lookStudent : t.desk.lookHome}
          </Button>
        ))}
        {(
          [
            [ArrowLeft, { nudge_pan: -5 }],
            [ArrowRight, { nudge_pan: 5 }],
            [ArrowUp, { nudge_tilt: -5 }],
            [ArrowDown, { nudge_tilt: 5 }],
          ] as const
        ).map(([Icon, body], i) => (
          <Button key={i} size="sm" variant="ghost" disabled={!status?.head?.connected}
            onClick={() => act(() => desk.head(cfg, body))}>
            <Icon size={14} />
          </Button>
        ))}
        <Button size="sm" variant="ghost" disabled={!status?.head?.connected || !live}
          onClick={() => act(() => desk.head(cfg, { find_face: true }))}>
          <ScanFace size={14} /> {t.desk.findFace}
        </Button>
        <Button size="sm" variant="ghost" disabled={!status?.head?.connected}
          onClick={() => act(() => desk.head(cfg, { auto: !status?.head?.auto }))}>
          {status?.head?.auto ? t.desk.autoLookOn : t.desk.autoLookOff}
        </Button>
        {status?.jev?.available ? (
          <Button size="sm" variant="ghost" onClick={() => act(() => desk.jev(cfg, !status.jev?.on))}>
            {status.jev.on ? <Mic size={14} /> : <MicOff size={14} />} {status.jev.on ? t.desk.jevOn : t.desk.jevOff}
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

// --- the timeline -----------------------------------------------------------------------------

type Item =
  | { kind: 'student'; t: number; text: string; note?: string }
  | { kind: 'sensei'; t: number; text: string; why?: string }
  | { kind: 'desk'; t: number; text: string }
  | { kind: 'read'; t: number; ev: DeskEvent }
  | { kind: 'note'; t: number; text: string; tone: Tone };

/** Turn raw log events into what a person watching wants to read. */
function toItems(events: DeskEvent[]): Item[] {
  const items: Item[] = [];
  for (const e of events) {
    const s = (k: string) => (e[k] == null ? '' : String(e[k]));
    switch (e.event) {
      case 'heard':
        items.push({ kind: 'student', t: e.t, text: s('text') });
        break;
      case 'student_said':
        if (e.answered === false) items.push({ kind: 'note', t: e.t, text: t.desk.notAnswered(s('text')), tone: 'neutral' });
        break;
      case 'heard_noise':
        items.push({ kind: 'note', t: e.t, text: t.desk.noise, tone: 'neutral' });
        break;
      case 'tutor_say':
        items.push({ kind: 'sensei', t: e.t, text: s('text'), why: s('why') });
        break;
      case 'say':
        items.push({ kind: 'desk', t: e.t, text: s('text') });
        break;
      case 'tutor_assessment':
        if (e.request !== 'talk') items.push({ kind: 'read', t: e.t, ev: e });
        break;
      case 'tutor_unconfirmed':
        items.push({ kind: 'note', t: e.t, text: t.desk.possibleMistake(s('line')), tone: 'warning' });
        break;
      case 'tutor_detected':
        items.push({ kind: 'note', t: e.t, text: t.desk.mistakeHeld(s('line')), tone: 'warning' });
        break;
      case 'tutor_subject':
        items.push({ kind: 'note', t: e.t, text: t.desk.subjectNow(s('now')), tone: 'accent' });
        break;
      case 'look':
        items.push({ kind: 'note', t: e.t, text: t.desk.looked(s('at'), s('why')), tone: e.ok === false ? 'danger' : 'info' });
        break;
      case 'student_face':
        items.push({ kind: 'note', t: e.t, text: t.desk.face(s('expression')), tone: 'info' });
        break;
      case 'tutor_start':
        items.push({ kind: 'note', t: e.t, text: t.desk.sessionStarted(s('minutes')), tone: 'success' });
        break;
      case 'tutor_end':
        items.push({ kind: 'note', t: e.t, text: t.desk.sessionEnded, tone: 'success' });
        break;
      case 'phone:request':
        items.push({ kind: 'note', t: e.t, text: t.desk.tapped(s('what')), tone: 'accent' });
        break;
      case 'phone:voice':
        items.push({ kind: 'note', t: e.t, text: e.on ? t.desk.voiceOn : t.desk.voiceOff, tone: 'neutral' });
        break;
      case 'ended':
        items.push({ kind: 'note', t: e.t, text: t.desk.callEnded, tone: 'neutral' });
        break;
      default:
        break;
    }
  }
  return items;
}

function Timeline({ cfg, events }: { cfg: DeskConfig; events: DeskEvent[] }) {
  const items = useMemo(() => toItems(events), [events]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A block body on purpose: newer browsers return a Promise from scrollIntoView, and an
    // effect that returns anything but a cleanup function crashes React.
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [items.length]);

  return (
    <Card className="flex max-h-[calc(100vh-10rem)] min-h-[420px] flex-col p-0">
      <div className="border-b border-line px-5 py-3">
        <h3 className="text-sm font-semibold text-ink">{t.desk.timeline}</h3>
        <p className="text-xs text-ink-muted">{t.desk.timelineHelp}</p>
      </div>
      <div className="s-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">{t.desk.timelineEmpty}</p>
        ) : (
          items.map((it, i) => <TimelineItem key={i} cfg={cfg} item={it} />)
        )}
        <div ref={endRef} />
      </div>
    </Card>
  );
}

function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function TimelineItem({ cfg, item }: { cfg: DeskConfig; item: Item }) {
  const time = <span className="shrink-0 pt-0.5 font-mono text-[11px] text-ink-muted">{clock(item.t)}</span>;
  if (item.kind === 'note') {
    return (
      <div className="flex items-start gap-3">
        {time}
        <Badge tone={item.tone}>{item.text}</Badge>
      </div>
    );
  }
  if (item.kind === 'read') {
    const e = item.ev;
    const steps = Array.isArray(e.steps) ? (e.steps as string[]) : [];
    const wrong = typeof e.first_error === 'number' ? (e.first_error as number) : null;
    return (
      <div className="flex items-start gap-3">
        {time}
        <div className="min-w-0 flex-1 rounded-xl border border-line bg-surface/60 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Eye size={13} /> {t.desk.senseiRead}
            {e.subject ? <Badge tone="accent">{String(e.subject)}</Badge> : null}
            {typeof e.latency_s === 'number' ? <span>{(e.latency_s as number).toFixed(1)} s</span> : null}
            {e.request ? <Badge tone="info">{String(e.request)}</Badge> : null}
          </div>
          <div className="flex gap-3">
            {e.frame ? (
              <a href={deskUrl(cfg, `/judged/${e.frame}`)} target="_blank" rel="noreferrer" className="shrink-0">
                <img src={deskUrl(cfg, `/judged/${e.frame}`)} alt="" className="h-24 w-auto rounded-lg border border-line object-cover" />
              </a>
            ) : null}
            <div className="min-w-0 text-sm">
              {e.problem ? <p className="mb-1 font-medium text-ink">{String(e.problem)}</p> : null}
              <ol className="space-y-0.5 font-mono text-[12px]">
                {steps.map((line, i) => (
                  <li
                    key={i}
                    className={cn(
                      'truncate rounded px-1',
                      wrong === i + 1 ? 'bg-danger/15 text-danger' : 'text-ink-muted',
                    )}
                  >
                    {line}
                  </li>
                ))}
              </ol>
              {wrong == null && steps.length ? <p className="mt-1 text-xs text-success">{t.desk.allCorrect}</p> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const who =
    item.kind === 'student'
      ? { label: t.desk.student, icon: <Mic size={13} />, cls: 'bg-surface border-line' }
      : item.kind === 'desk'
        ? { label: t.desk.you, icon: <Send size={13} />, cls: 'bg-info/10 border-info/30' }
        : { label: 'Sensei', icon: <HelpCircle size={13} />, cls: 'bg-accent-soft border-accent/30' };
  return (
    <div className="flex items-start gap-3">
      {time}
      <div className={cn('min-w-0 flex-1 rounded-xl border px-3 py-2', who.cls)}>
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          {who.icon} {who.label}
          {item.kind === 'sensei' && item.why ? <span className="font-normal">· {item.why}</span> : null}
        </div>
        <p className="text-sm text-ink">{item.text}</p>
      </div>
    </div>
  );
}
