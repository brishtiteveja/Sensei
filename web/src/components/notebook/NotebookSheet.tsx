import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NotebookEditor } from './NotebookEditor';
import { AttemptBar } from '@/components/replay/AttemptBar';
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
      <NotebookEditor context={context} onAttach={onAttach} problem={problem} compact />
    </Modal>
  );
}
