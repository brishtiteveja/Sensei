import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/components/layout/AppShell';
import { TutorChat } from '@/components/tutor/TutorChat';
import { useSubjects } from '@/hooks/useCurriculum';
import { t } from '@/i18n/strings';

const FALLBACK_PROMPTS = [
  'I have an exam in three weeks — where should I start?',
  'Explain why dimensional analysis catches wrong equations.',
  'I keep getting sign errors in kinematics. Help me find the pattern.',
  'Give me one hard question and do not tell me the answer.',
];

/** Free-form Socratic session, not bound to a lesson. */
export function TutorPage() {
  const [searchParams] = useSearchParams();
  const subjects = useSubjects();
  const subject = searchParams.get('subject') ?? undefined;
  const ask = searchParams.get('ask');

  const suggestions = useMemo(() => {
    const list = subjects.data ?? [];
    if (!list.length) return FALLBACK_PROMPTS;
    return [
      ...FALLBACK_PROMPTS.slice(0, 2),
      `What is the hardest idea in ${list[0].title} and why?`,
      ...FALLBACK_PROMPTS.slice(2, 3),
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
