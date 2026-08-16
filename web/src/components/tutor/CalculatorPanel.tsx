import { useCallback, useEffect, useMemo, useState } from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { evaluate } from '@/lib/calc';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * A button-grid calculator, mirroring the phone app's tool. It evaluates as you
 * build the expression (via the safe evaluator in lib/calc), and "Insert to
 * chat" drops `expression = result` into the composer — the tutor is text-only,
 * so a computed value belongs in the message, not sent as its own thing.
 */

type Key = {
  label: string;
  /** Text appended to the expression; defaults to `label`. */
  ins?: string;
  kind?: 'num' | 'op' | 'fn' | 'act' | 'eq';
  sci?: boolean;
};

const KEYS: Key[] = [
  // scientific row (only shown in scientific mode)
  { label: 'sin', ins: 'sin(', kind: 'fn', sci: true },
  { label: 'cos', ins: 'cos(', kind: 'fn', sci: true },
  { label: 'tan', ins: 'tan(', kind: 'fn', sci: true },
  { label: '^', kind: 'op', sci: true },
  { label: '√', ins: 'sqrt(', kind: 'fn', sci: true },
  { label: 'ln', ins: 'ln(', kind: 'fn', sci: true },
  { label: 'log', ins: 'log(', kind: 'fn', sci: true },
  { label: 'π', kind: 'num', sci: true },
  { label: 'e', kind: 'num', sci: true },
  { label: '(', kind: 'op', sci: true },
  { label: ')', kind: 'op', sci: true },
  { label: '%', kind: 'op', sci: true },
  // main pad
  { label: '7', kind: 'num' },
  { label: '8', kind: 'num' },
  { label: '9', kind: 'num' },
  { label: '÷', ins: '/', kind: 'op' },
  { label: '4', kind: 'num' },
  { label: '5', kind: 'num' },
  { label: '6', kind: 'num' },
  { label: '×', ins: '*', kind: 'op' },
  { label: '1', kind: 'num' },
  { label: '2', kind: 'num' },
  { label: '3', kind: 'num' },
  { label: '−', ins: '-', kind: 'op' },
  { label: '0', kind: 'num' },
  { label: '.', kind: 'num' },
  { label: '=', kind: 'eq' },
  { label: '+', kind: 'op' },
];

export function CalculatorPanel({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}) {
  const [mode, setMode] = useState<'basic' | 'scientific'>('basic');
  const [expr, setExpr] = useState('');

  useEffect(() => {
    if (open) setExpr('');
  }, [open]);

  const result = useMemo(() => evaluate(expr), [expr]);

  const press = useCallback(
    (k: Key) => {
      if (k.kind === 'eq') {
        // Collapse the expression to its value so you can keep computing on it.
        if (result.text) setExpr(result.text);
        return;
      }
      setExpr((e) => e + (k.ins ?? k.label));
    },
    [result.text],
  );

  // Physical keyboard: let people just type.
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      const k = ev.key;
      if (k === 'Enter' || k === '=') {
        ev.preventDefault();
        if (result.text) setExpr(result.text);
      } else if (k === 'Backspace') {
        ev.preventDefault();
        setExpr((e) => e.slice(0, -1));
      } else if (/^[0-9.+\-*/%^()]$/.test(k)) {
        setExpr((e) => e + k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, result.text]);

  const insert = () => {
    if (!result.text) return;
    onInsert(`${expr.trim()} = ${result.text}`);
    onClose();
  };

  const keys = KEYS.filter((k) => mode === 'scientific' || !k.sci);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.calc.title}
      description={t.calc.subtitle}
      width="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={insert} disabled={!result.text}>
            {t.calc.insert}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* mode toggle */}
        <div className="flex rounded-lg border border-line bg-surface-alt p-0.5 text-[13px]">
          {(['basic', 'scientific'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
                mode === m ? 'bg-surface text-accent shadow-soft' : 'text-ink-muted hover:text-ink',
              )}
            >
              {m === 'basic' ? t.calc.basic : t.calc.scientific}
            </button>
          ))}
        </div>

        {/* display */}
        <div className="rounded-xl border border-line bg-surface-alt px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-h-[1.25rem] flex-1 truncate font-mono text-[13px] text-ink-muted" dir="ltr">
              {expr || ' '}
            </p>
            <button
              type="button"
              aria-label={t.calc.backspace}
              onClick={() => setExpr((e) => e.slice(0, -1))}
              className="shrink-0 rounded p-1 text-ink-faint hover:text-ink"
            >
              <Delete size={16} />
            </button>
          </div>
          <p className="mt-1 truncate text-right font-mono text-2xl font-semibold text-ink" dir="ltr">
            {result.text ?? (result.error ? '—' : '0')}
          </p>
          {mode === 'scientific' ? (
            <p className="mt-1 text-right text-2xs text-ink-faint">{t.calc.radians}</p>
          ) : null}
        </div>

        {/* keypad */}
        <div className="grid grid-cols-4 gap-1.5">
          {keys.map((k, i) => (
            <button
              key={`${k.label}-${i}`}
              type="button"
              onClick={() => press(k)}
              className={cn(
                'h-11 rounded-lg text-[15px] font-medium tabular-nums transition-colors',
                'border border-line bg-surface hover:bg-surface-alt active:scale-[0.97]',
                k.kind === 'op' && 'bg-accent-soft text-accent hover:bg-accent-soft/70',
                k.kind === 'fn' && 'bg-surface-alt text-ink-soft text-[13px]',
                k.kind === 'eq' && 's-gradient-fill border-transparent text-white hover:opacity-90',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
