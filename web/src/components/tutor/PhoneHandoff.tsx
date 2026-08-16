import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  handoffUrl,
  newPairingCode,
  waitForHandoff,
  type HandoffMode,
} from '@/lib/handoff';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * "Use my phone" — shows a QR the phone scans, then waits for the image.
 *
 * Rendered inline by whichever desktop surface wants a picture (the scratchpad,
 * the upload panel). The QR is drawn locally into a canvas: no image service,
 * nothing leaves the box, consistent with the rest of the app.
 */
export function PhoneHandoff({
  mode,
  onImage,
  onClose,
}: {
  mode: HandoffMode;
  onImage: (dataUri: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code] = useState(newPairingCode);
  const [state, setState] = useState<'waiting' | 'got' | 'timeout'>('waiting');
  const url = handoffUrl(code, mode);

  useEffect(() => {
    const cv = canvasRef.current;
    if (cv) {
      void QRCode.toCanvas(cv, url, { width: 190, margin: 1, errorCorrectionLevel: 'M' });
    }

    const controller = new AbortController();
    void waitForHandoff(code, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      if (!res) {
        setState('timeout');
        return;
      }
      setState('got');
      onImage(res.image);
    });
    return () => controller.abort();
    // onImage is a fresh closure each render; re-subscribing would restart the
    // poll and drop an in-flight handoff, so the pairing code is the identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, url]);

  return (
    <div className="rounded-xl border border-line bg-surface-alt/60 p-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-lg bg-white p-2 shadow-soft">
          <canvas ref={canvasRef} className="block h-[190px] w-[190px]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
            <Smartphone size={15} />
            {mode === 'draw' ? t.phone.drawTitle : t.phone.photoTitle}
          </p>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            {mode === 'draw' ? t.phone.drawBody : t.phone.photoBody}
          </p>

          <p
            className={cn(
              'flex items-center gap-1.5 text-2xs font-medium',
              state === 'got' ? 'text-success-text' : 'text-ink-faint',
            )}
          >
            {state === 'waiting' ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                {t.phone.waiting}
              </>
            ) : state === 'got' ? (
              <>
                <Check size={12} />
                {t.phone.received}
              </>
            ) : (
              t.phone.timeout
            )}
          </p>

          {/* Same-device escape hatch: the phone may already be this browser. */}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-2xs text-accent underline underline-offset-2"
          >
            {url}
          </a>

          <Button variant="ghost" onClick={onClose} className="mt-1 h-8 px-2.5">
            <X size={14} />
            {t.common.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
