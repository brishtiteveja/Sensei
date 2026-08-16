import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  FileText,
  GraduationCap,
  Trash2,
  Upload,
} from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { RichText } from '@/components/ui/RichText';
import { PhoneHandoff } from '@/components/tutor/PhoneHandoff';
import { gradeWork, type GradeReport } from '@/lib/api';
import { fileToDownscaledDataUri } from '@/lib/image';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

interface Attach {
  id: string;
  name: string;
  mime: string;
  data: string;
  isPdf: boolean;
}

/**
 * The teacher's side of Sensei: grade a pile of submitted work, and check the
 * pipeline against a public handwriting benchmark.
 *
 * Grading runs on the cloud model rather than the pinned local one: a teacher
 * marking thirty scripts is a batch job, and taking the DGX away from the
 * student who is mid-lesson to do it would be the wrong trade.
 */
export function TeachPage() {
  const [tab, setTab] = useState<'grade' | 'bench'>('grade');

  return (
    <Page
      title={t.teach.title}
      subtitle={t.teach.subtitle}
      actions={
        <div className="flex rounded-xl border border-line bg-surface p-0.5 text-[13px]">
          {(['grade', 'bench'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                tab === k ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink',
              )}
            >
              {k === 'grade' ? t.teach.tabGrade : t.teach.tabBench}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'grade' ? <GradePanel /> : <BenchPanel />}
    </Page>
  );
}

function GradePanel() {
  const { language } = useSettings();
  const [files, setFiles] = useState<Attach[]>([]);
  const [rubric, setRubric] = useState('');
  const [report, setReport] = useState<GradeReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const next: Attach[] = [];
    for (const f of Array.from(list).slice(0, 12)) {
      const isPdf = f.type === 'application/pdf';
      try {
        // PDFs go up whole; images are downscaled so a 12-page phone upload
        // does not become 40 MB of base64.
        const data = isPdf ? await fileToDataUri(f) : await fileToDownscaledDataUri(f);
        next.push({
          id: `${f.name}-${next.length}-${Date.now()}`,
          name: f.name,
          mime: isPdf ? 'application/pdf' : 'image/jpeg',
          data,
          isPdf,
        });
      } catch {
        /* skip anything unreadable */
      }
    }
    setFiles((prev) => [...prev, ...next].slice(0, 12));
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const run = async () => {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const r = await gradeWork(
        files.map((f) => ({ data: f.data, mime: f.mime, name: f.name })),
        rubric.trim() || undefined,
        language,
      );
      setReport(r.report);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* left: the pile */}
      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void add(e.dataTransfer.files);
            }}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface-alt/60 px-4 py-8 text-center"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-accent shadow-soft">
              <Upload size={20} />
            </span>
            <p className="text-[13.5px] text-ink">
              {t.teach.drop}{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-medium text-accent underline underline-offset-2"
              >
                {t.handwriting.browse}
              </button>
            </p>
            <p className="text-2xs text-ink-muted">{t.teach.accepts}</p>
            <button
              type="button"
              onClick={() => setPhoneOpen((v) => !v)}
              className="text-2xs font-medium text-accent underline underline-offset-2"
            >
              {t.phone.usePhone}
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => void add(e.target.files)}
          />

          {phoneOpen ? (
            <PhoneHandoff
              mode="photo"
              onClose={() => setPhoneOpen(false)}
              onImage={(data) => {
                setPhoneOpen(false);
                setFiles((prev) =>
                  [
                    ...prev,
                    {
                      id: `phone-${Date.now()}`,
                      name: 'phone-photo.jpg',
                      mime: 'image/jpeg',
                      data,
                      isPdf: false,
                    },
                  ].slice(0, 12),
                );
              }}
            />
          ) : null}

          {files.length ? (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2"
                >
                  {f.isPdf ? (
                    <FileText size={16} className="shrink-0 text-ink-muted" />
                  ) : (
                    <img src={f.data} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-2xs text-ink-soft">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                    aria-label={t.notebook.deleteBlock}
                    className="shrink-0 text-ink-faint hover:text-danger-text"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="space-y-2 p-5">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-ink-soft">{t.teach.rubric}</span>
            <textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              rows={4}
              placeholder={t.teach.rubricPlaceholder}
              className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </label>
          <Button onClick={() => void run()} disabled={!files.length || busy} className="w-full">
            <GraduationCap size={16} />
            {busy ? t.teach.grading : t.teach.grade}
          </Button>
        </Card>
      </div>

      {/* right: the scorecard */}
      <div>
        {busy ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void run()} />
        ) : report ? (
          <Scorecard report={report} />
        ) : (
          <Card className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 p-8 text-center">
            <GraduationCap size={26} className="text-ink-faint" />
            <p className="text-sm font-medium text-ink">{t.teach.emptyTitle}</p>
            <p className="max-w-sm text-[13px] text-ink-muted">{t.teach.emptyBody}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Scorecard({ report }: { report: GradeReport }) {
  const score = Math.max(0, Math.min(100, Number(report.score) || 0));
  const tone = score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger';

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-5 p-6">
        <div
          className={cn(
            'flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl',
            tone === 'success' && 'bg-success-bg text-success-text',
            tone === 'warning' && 'bg-warning-bg text-warning-text',
            tone === 'danger' && 'bg-danger-bg text-danger-text',
          )}
        >
          <span className="text-2xl font-semibold tabular-nums">{score}</span>
          <span className="text-2xs font-medium opacity-80">/ 100</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-ink">{report.grade}</p>
            <Badge tone="neutral">{t.teach.aiGraded}</Badge>
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{report.summary}</p>
        </div>
      </Card>

      {report.questions?.length ? (
        <Card className="divide-y divide-line p-0">
          {report.questions.map((q, i) => (
            <div key={i} className="flex gap-3 p-4">
              <VerdictIcon verdict={q.verdict} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink">{q.label}</p>
                {q.error ? (
                  <p className="mt-0.5 text-[12.5px] text-danger-text">{q.error}</p>
                ) : null}
                <RichText className="mt-1 text-[12.5px] text-ink-muted">{q.feedback}</RichText>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {report.strengths?.length ? (
          <Card className="space-y-2 p-5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-success-text">
              {t.teach.strengths}
            </p>
            <ul className="space-y-1.5">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-ink-soft">
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {report.next_steps?.length ? (
          <Card className="space-y-2 p-5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-accent">
              {t.teach.nextSteps}
            </p>
            <ul className="space-y-1.5">
              {report.next_steps.map((s, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-ink-soft">
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  const cls = 'mt-0.5 shrink-0';
  if (verdict === 'correct') return <CircleCheck size={17} className={cn(cls, 'text-success')} />;
  if (verdict === 'partial') return <CircleAlert size={17} className={cn(cls, 'text-warning-text')} />;
  return <CircleSlash size={17} className={cn(cls, 'text-danger-text')} />;
}

// ------------------------------------------------------------------ benchmark

interface BenchItem {
  id: string;
  file: string;
  label: number;
  subject: string;
  title: string;
}
interface BenchManifest {
  dataset: string;
  source: string;
  license: string;
  note: string;
  count: number;
  items: BenchItem[];
}

const benchUrl = (f: string) => `${import.meta.env.BASE_URL}notesbank/${f}`;

/**
 * The NoTeS-Bank panel: real student handwriting from a published benchmark,
 * with the dataset's own class label as ground truth. Grading a page here and
 * comparing what the model read against that label is a check anyone in the
 * room can make — unlike our own synthetic samples, we did not write these.
 */
function BenchPanel() {
  const { language } = useSettings();
  const [manifest, setManifest] = useState<BenchManifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<BenchItem | null>(null);
  const [report, setReport] = useState<GradeReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}notesbank/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setManifest)
      .catch(() => setFailed(true));
  }, []);

  const grouped = useMemo(() => {
    const by = new Map<string, BenchItem[]>();
    for (const it of manifest?.items ?? []) {
      const list = by.get(it.subject) ?? [];
      list.push(it);
      by.set(it.subject, list);
    }
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [manifest]);

  const verify = async (item: BenchItem) => {
    setActive(item);
    setReport(null);
    setBusy(true);
    try {
      const blob = await fetch(benchUrl(item.file)).then((r) => r.blob());
      const data = await blobToDataUri(blob);
      const r = await gradeWork(
        [{ data, mime: 'image/jpeg', name: item.file }],
        `These are a student's handwritten notes. Read them and grade the work shown.`,
        language,
      );
      setReport(r.report);
    } catch {
      setReport(null);
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <Card className="mx-auto max-w-2xl space-y-2 p-6">
        <p className="text-sm font-medium text-ink">{t.teach.benchMissing}</p>
        <p className="text-[13px] text-ink-muted">{t.teach.benchMissingBody}</p>
        <code className="block rounded-lg bg-surface-alt px-3 py-2 font-mono text-2xs text-ink-soft">
          python3 scripts/fetch_notesbank.py
        </code>
      </Card>
    );
  }
  if (!manifest) return <Skeleton className="mx-auto h-64 max-w-4xl rounded-2xl" />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
            <BadgeCheck size={15} className="text-accent" />
            {t.teach.benchTitle}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{manifest.note}</p>
        </div>
        <div className="flex items-center gap-2 text-2xs text-ink-faint">
          <Badge tone="neutral">{manifest.count} pages</Badge>
          <Badge tone="neutral">{manifest.license}</Badge>
          <a
            href={manifest.source}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            {t.teach.benchSource}
          </a>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-5">
          {grouped.map(([subject, items]) => (
            <div key={subject}>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                {subject}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => void verify(it)}
                    className={cn(
                      'overflow-hidden rounded-xl border bg-white text-left transition-colors',
                      active?.id === it.id
                        ? 'border-accent ring-2 ring-accent/25'
                        : 'border-line hover:border-accent/40',
                    )}
                  >
                    <img
                      src={benchUrl(it.file)}
                      alt={it.title}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1.5 text-2xs text-ink-soft">
                      {it.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {!active ? (
            <Card className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-8 text-center">
              <BadgeCheck size={24} className="text-ink-faint" />
              <p className="text-sm font-medium text-ink">{t.teach.benchPick}</p>
              <p className="max-w-xs text-[13px] text-ink-muted">{t.teach.benchPickBody}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              <Card className="space-y-1 p-4">
                <p className="text-2xs uppercase tracking-wide text-ink-faint">
                  {t.teach.groundTruth}
                </p>
                <p className="text-[15px] font-semibold text-ink">{active.title}</p>
                <p className="text-2xs text-ink-muted">
                  {t.teach.groundTruthBody}
                </p>
              </Card>
              {busy ? (
                <Skeleton className="h-56 rounded-2xl" />
              ) : report ? (
                <Scorecard report={report} />
              ) : (
                <Card className="p-4 text-[13px] text-ink-muted">{t.teach.benchFailed}</Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fileToDataUri(file: File): Promise<string> {
  return blobToDataUri(file);
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('read-failed'));
    fr.readAsDataURL(blob);
  });
}
