import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NotebookEditor } from './NotebookEditor';
import type { NotebookContext } from '@/lib/notebook';
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
}: {
  open: boolean;
  onClose: () => void;
  context: NotebookContext;
  /** Present in the tutor: hand the compiled notebook to the chat. */
  onAttach?: (message: string) => void;
  /** Pinned above the blocks — the problem being solved, so it stays in view. */
  header?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.notebook.title}
      description={header ? undefined : (context.label ?? t.notebook.subtitle)}
      width="max-w-3xl"
    >
      {header ? <div className="mb-4">{header}</div> : null}
      <NotebookEditor context={context} onAttach={onAttach} compact />
    </Modal>
  );
}
