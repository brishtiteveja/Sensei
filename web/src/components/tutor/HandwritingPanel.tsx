import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImageUp, Smartphone, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PhoneHandoff } from '@/components/tutor/PhoneHandoff';
import { fileToDownscaledDataUri } from '@/lib/image';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Handwriting upload.
 *
 * IMPORTANT: this SenseiClaw build exposes no multipart / image route —
 * `/tutor/stream` takes JSON only (verified against its OpenAPI schema). So the
 * image is previewed locally and never transmitted; the panel says so plainly
 * rather than pretending. The typed question IS sent to the tutor, with a note
 * that the student has written work in front of them. Wiring the real thing is
 * a one-function change once a vision endpoint exists.
 */
export function HandwritingPanel({
  open,
  onClose,
  onAskInText,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onAskInText: (message: string) => void;
  /** Hand the picture to the caller so the tutor can actually look at it. */
  onInsert?: (dataUri: string, name?: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState('');
  const [phoneOpen, setPhoneOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const accept = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError(t.handwriting.wrongType);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t.handwriting.tooLarge);
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  const clear = () => {
    setFile(null);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleAsk = () => {
    const detail = note.trim();
    const message = detail
      ? `I have my handwritten working in front of me. ${detail}`
      : 'I have my handwritten working in front of me for this problem. Ask me what I did at each step so we can find where I went wrong.';
    onAskInText(message);
    onClose();
  };

  /** Downscale before handing over: a phone photo is several MB of data URI. */
  const handleInsert = async () => {
    if (!file || !onInsert) return;
    try {
      onInsert(await fileToDownscaledDataUri(file), file.name);
    } catch {
      setError(t.handwriting.wrongType);
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.handwriting.title}
      description={t.handwriting.subtitle}
      width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          {onInsert ? (
            <>
              <Button variant="secondary" onClick={handleAsk}>
                {t.handwriting.sendAnyway}
              </Button>
              <Button onClick={() => void handleInsert()} disabled={!file}>
                {t.handwriting.insert}
              </Button>
            </>
          ) : (
            <Button onClick={handleAsk}>{t.handwriting.sendAnyway}</Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {previewUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface-alt">
            <img
              src={previewUrl}
              alt={file?.name ?? 'Uploaded work'}
              className="max-h-64 w-full object-contain"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-black/65 px-2.5 py-1.5 text-2xs font-medium text-white backdrop-blur transition hover:bg-black/80"
            >
              <Trash2 size={13} />
              {t.handwriting.remove}
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200',
              dragging ? 'border-accent bg-accent-soft' : 'border-line bg-surface-alt/60',
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-accent shadow-soft">
              <ImageUp size={22} />
            </div>
            <div className="text-sm text-ink">
              {t.handwriting.drop}{' '}
              <span className="text-ink-muted">{t.handwriting.or}</span>{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-medium text-accent underline underline-offset-2 hover:text-accent-strong"
              >
                {t.handwriting.browse}
              </button>
            </div>
            <p className="text-2xs text-ink-muted">{t.handwriting.accepted}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => accept(e.target.files?.[0])}
            />
            {/* The page being photographed is usually next to the phone, not
                the laptop, so offer the phone as the camera. */}
            <button
              type="button"
              onClick={() => setPhoneOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-2xs font-medium text-accent underline underline-offset-2"
            >
              <Smartphone size={12} />
              {t.phone.usePhone}
            </button>
          </div>
        )}

        {phoneOpen ? (
          <PhoneHandoff
            mode="photo"
            onClose={() => setPhoneOpen(false)}
            onImage={(dataUri) => {
              setPhoneOpen(false);
              if (onInsert) {
                onInsert(dataUri, 'phone-photo.jpg');
                onClose();
              } else {
                // No insert path here (older callers) — at least show it.
                setPreviewUrl(dataUri);
              }
            }}
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] font-medium text-danger-text">
            {error}
          </p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-[13px] font-medium text-ink-soft">
            What should Sensei look at?
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. I got -4 for the acceleration and the answer key says 4."
            className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <div className="flex gap-3 rounded-xl border border-warning/35 bg-warning-bg px-4 py-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-text" />
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-warning-text">
              {t.handwriting.notWiredTitle}
            </p>
            <p className="text-[12.5px] leading-relaxed text-warning-text/90">
              {t.handwriting.notWiredBody}
            </p>
            <p className="text-[12.5px] leading-relaxed text-warning-text/90">
              {t.handwriting.requiresVision}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function HandwritingTriggerHint() {
  return (
    <span className="inline-flex items-center gap-1 text-2xs text-ink-faint">
      <Upload size={11} />
      {t.handwriting.notWiredShort}
    </span>
  );
}
