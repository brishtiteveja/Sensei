import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NotebookEditor } from './NotebookEditor';
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tour } from '@/components/tour/Tour';
import { AttemptBar } from '@/components/replay/AttemptBar';
import { registerSurface } from '@/lib/senseiSurface';
import { renderNotebookSnapshot } from '@/lib/snapshot';
import type { NotebookBlock } from '@/lib/notebook';
import type { NotebookContext, NotebookHandoff } from '@/lib/notebook';
import { t } from '@/i18n/strings';

/**
 * A notebook opened over another surface (Practice, Lesson, or the tutor),
 * bound to that problem's context. Same editor as the full Notebook page, just
 * in a modal so a student can jot working without leaving the problem.
 */
export function NotebookSheet({
  open,
  onClose,
  context,
  onAttach,
  header,
  problem,
  recordAttempts,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  context: NotebookContext;
  /** Present in the tutor: hand the compiled notebook to the chat. */
  onAttach?: (handoff: NotebookHandoff) => void;
  /** Pinned above the blocks — the problem being solved, so it stays in view. */
  header?: ReactNode;
  /** Plain-text problem for the scratchpad's watching owl. */
  problem?: string;
  /** Record this sitting against the problem, and offer its past attempts. */
  recordAttempts?: boolean;
  subject?: string;
}) {
  // The owl looks at the page, not one drawing: a student's working is usually
  // a couple of typed lines beside a sketch, so the whole notebook is composited.
  const [tourOpen, setTourOpen] = useState(false);
  const pageRef = useRef<{ blocks: NotebookBlock[]; title: string }>({ blocks: [], title: '' });
  const snapshot = useCallback(
    () => renderNotebookSnapshot(pageRef.current.blocks, pageRef.current.title || problem),
    [problem],
  );

  useEffect(() => {
    if (!open) return;
    return registerSurface({
      getImage: snapshot,
      problem,
      contextKey: `${context.kind}:${context.id}`,
      label: context.label ?? t.notebook.title,
    });
  }, [open, snapshot, problem, context.kind, context.id, context.label]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.notebook.title}
      description={header ? undefined : (context.label ?? t.notebook.subtitle)}
      width="max-w-3xl"
    >
      {recordAttempts ? (
        <div className="mb-3">
          <AttemptBar
            problemKey={`${context.kind}:${context.id}`}
            problemTitle={context.label ?? t.notebook.title}
            problemText={problem}
            subject={subject}
          />
        </div>
      ) : null}
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" className="h-7 px-2 text-2xs" onClick={() => setTourOpen(true)}>
          <HelpCircle size={13} />
          {t.tour.startHere}
        </Button>
      </div>
      <Tour open={tourOpen} onClose={() => setTourOpen(false)} name="notebook" />
      {header ? <div className="mb-4">{header}</div> : null}
      <div className="relative">
        <NotebookEditor
          context={context}
          onAttach={onAttach}
          problem={problem}
          onPageChange={(p) => {
            pageRef.current = p;
          }}
          compact
        />
      </div>
    </Modal>
  );
}
