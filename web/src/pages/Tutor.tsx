import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/components/layout/AppShell';
import { TutorChat } from '@/components/tutor/TutorChat';
import { useSubjects } from '@/hooks/useCurriculum';
import { t } from '@/i18n/strings';

/** Free-form Socratic session, not bound to a lesson. */
export function TutorPage() {
  const [searchParams] = useSearchParams();
  const subjects = useSubjects();
  const subject = searchParams.get('subject') ?? undefined;
  const ask = searchParams.get('ask');

  const suggestions = useMemo(() => {
    const fallback = t.tutor.prompts;
    const list = subjects.data ?? [];
    if (!list.length) return fallback;
    // `title` arrives already localised, so the interpolated prompt stays in
    // one language rather than mixing a translated subject into English.
    return [
      ...fallback.slice(0, 2),
      t.tutor.promptHardest(list[0].title),
      ...fallback.slice(2, 3),
    ];
  }, [subjects.data]);

  const seed = useMemo(() => (ask ? { key: ask, message: ask } : null), [ask]);

  return (
    <Page title={t.tutor.title} subtitle={t.tutor.subtitle}>
      <div className="h-[calc(100dvh-13rem)] min-h-[520px]">
        <TutorChat
          variant="page"
          contextType="free_chat"
          contextData={{ subject }}
          suggestions={suggestions}
          seed={seed}
          placeholder={t.tutor.placeholderFree}
          emptyBody={t.tutor.emptyBody}
        />
      </div>
    </Page>
  );
}
