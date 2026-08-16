import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, FlaskConical, GraduationCap, Plus } from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { writeRaw } from '@/lib/storage';
import {
  FREE_DEFAULT,
  getNotebookByKey,
  listNotebooks,
  TUTOR_SEED_KEY,
  uid,
  type NotebookContext,
} from '@/lib/notebook';
import { t } from '@/i18n/strings';

/**
 * The notebook library. With `?k=<key>` it opens that notebook's editor; with
 * no key it lists every notebook — free pages plus the ones bound to lessons
 * and practice questions — so a student can get back to any problem's working.
 */
export function NotebookPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const key = params.get('k');

  if (key) {
    const nb = getNotebookByKey(key);
    const context: NotebookContext =
      nb?.context ?? (key === 'free:default' ? FREE_DEFAULT : { kind: 'free', id: key.split(':')[1] ?? 'default' });
    return (
      <Page
        title={t.notebook.title}
        subtitle={context.label ?? t.notebook.subtitle}
        actions={
          <Button variant="ghost" onClick={() => navigate('/notebook')}>
            <ArrowLeft size={16} />
            {t.notebook.library}
          </Button>
        }
      >
        <NotebookEditor
          context={context}
          onAttach={(message) => {
            // Park the compiled notebook (too long for a URL) and open the tutor.
            writeRaw(TUTOR_SEED_KEY, message);
            navigate('/tutor?seed=notebook');
          }}
        />
      </Page>
    );
  }

  return <NotebookLibrary />;
}

function NotebookLibrary() {
  const navigate = useNavigate();
  const notebooks = useMemo(() => listNotebooks(), []);

  const open = (k: string) => navigate(`/notebook?k=${encodeURIComponent(k)}`);
  const newPage = () => open(`free:${uid('nb')}`);

  return (
    <Page
      title={t.notebook.title}
      subtitle={t.notebook.librarySubtitle}
      actions={
        <Button onClick={newPage}>
          <Plus size={16} />
          {t.notebook.newPage}
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        {!notebooks.length ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title={t.notebook.empty}
            body={t.notebook.libraryEmptyBody}
            action={<Button onClick={newPage}>{t.notebook.newPage}</Button>}
          />
        ) : (
          <ul className="space-y-2">
            {notebooks.map((nb) => (
              <li key={nb.key}>
                <button
                  type="button"
                  onClick={() => open(nb.key)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <ContextIcon kind={nb.context.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {nb.title.trim() || t.notebook.untitled}
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                      {nb.context.label ?? contextName(nb.context.kind)} ·{' '}
                      {t.notebook.blockCount(nb.blocks.length)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}

function ContextIcon({ kind }: { kind: NotebookContext['kind'] }) {
  if (kind === 'lesson') return <GraduationCap size={17} />;
  if (kind === 'practice') return <FlaskConical size={17} />;
  return <BookOpen size={17} />;
}

function contextName(kind: NotebookContext['kind']): string {
  if (kind === 'lesson') return t.notebook.fromLesson;
  if (kind === 'practice') return t.notebook.fromPractice;
  return t.notebook.freePage;
}
