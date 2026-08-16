import { useRef, useState } from 'react';
import { ImageUp, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RichText } from '@/components/ui/RichText';
import { PhoneHandoff } from '@/components/tutor/PhoneHandoff';
import { draftQuestion, type DraftedQuestion } from '@/lib/api';
import { fileToDownscaledDataUri } from '@/lib/image';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';

/**
 * Teacher's "add a question" flow.
 *
 * A teacher types or photographs a rough problem; the server finalises it into
 * a structured question — clean statement, answer, worked steps and the mistake
 * students usually make — which is what the practice list needs and what a
 * teacher should not have to write out by hand.
 */
export function AddQuestion({ onAdded }: { onAdded: (q: DraftedQuestion) => void }) {
  const { language } = useSettings();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftedQuestion | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText('');
    setImage(null);
    setSubject('');
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (!text.trim() && !image) return;
    setBusy(true);
    setError(null);
    try {
      const r = await draftQuestion(
        { text: text.trim() || undefined, image: image ?? undefined, subject_hint: subject || undefined },
        language,
      );
      setResult(r.question);
      onAdded(r.question);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button data-tour="le-add" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={15} />
        {t.addq.button}
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={t.addq.title}
        description={t.addq.subtitle}
        width="max-w-2xl"
        footer={
          result ? (
            <>
              <Button variant="ghost" onClick={reset}>
                {t.addq.another}
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                {t.common.done}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void submit()} disabled={busy || (!text.trim() && !image)}>
                <Sparkles size={15} />
                {busy ? t.addq.working : t.addq.finalise}
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-2xs font-semibold text-accent">
                {result.subject}
              </span>
              <span className="rounded-full bg-surface-alt px-2.5 py-1 text-2xs text-ink-soft">
                {result.level}
              </span>
              <p className="text-[15px] font-semibold text-ink">{result.title}</p>
            </div>
            <Field label={t.addq.problem}>
              <RichText className="text-[13.5px] text-ink-soft">{result.problem}</RichText>
            </Field>
            <Field label={t.addq.answer}>
              <RichText className="text-[13.5px] text-ink-soft">{result.answer}</RichText>
            </Field>
            {result.common_mistake ? (
              <Field label={t.addq.commonMistake}>
                <p className="text-[13.5px] text-warning-text">{result.common_mistake}</p>
              </Field>
            ) : null}
            {result.solution_steps?.length ? (
              <Field label={t.addq.steps}>
                <ol className="list-decimal space-y-1 pl-5">
                  {result.solution_steps.map((s, i) => (
                    <li key={i}>
                      <RichText className="text-[13px] text-ink-muted">{s}</RichText>
                    </li>
                  ))}
                </ol>
              </Field>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-ink-soft">{t.addq.rough}</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={t.addq.roughPlaceholder}
                className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink focus:border-accent focus:outline-none"
              >
                <option value="">{t.addq.autoSubject}</option>
                <option value="physics">{t.subjects.physics}</option>
                <option value="chemistry">{t.subjects.chemistry}</option>
                <option value="math">{t.subjects.math}</option>
                <option value="biology">{t.subjects.biology}</option>
              </select>
              <Button variant="ghost" onClick={() => fileRef.current?.click()} className="h-9 px-2.5">
                <ImageUp size={15} />
                {t.addq.photo}
              </Button>
              <Button variant="ghost" onClick={() => setPhoneOpen((v) => !v)} className="h-9 px-2.5">
                {t.phone.usePhone}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setImage(await fileToDownscaledDataUri(f));
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />
            </div>

            {phoneOpen ? (
              <PhoneHandoff
                mode="photo"
                onClose={() => setPhoneOpen(false)}
                onImage={(d) => {
                  setImage(d);
                  setPhoneOpen(false);
                }}
              />
            ) : null}

            {image ? (
              <div className="relative overflow-hidden rounded-xl border border-line bg-white">
                <img src={image} alt="" className="mx-auto max-h-52 w-auto" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-2xs text-white"
                >
                  {t.handwriting.remove}
                </button>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-[13px] font-medium text-danger-text">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-alt/60 p-3">
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      {children}
    </div>
  );
}
