import { useCallback, useRef, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NotebookEditor } from './NotebookEditor';
import { AttemptBar } from '@/components/replay/AttemptBar';
import { FloatingSensei } from '@/components/tutor/FloatingSensei';
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
  const pageRef = useRef<{ blocks: NotebookBlock[]; title: string }>({ blocks: [], title: '' });
  const snapshot = useCallback(
    () => renderNotebookSnapshot(pageRef.current.blocks, pageRef.current.title || problem),
    [problem],
  );

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
        <FloatingSensei problem={problem} getImage={snapshot} className="sticky bottom-3 left-0 mt-2" />
      </div>
    </Modal>
  );
}
