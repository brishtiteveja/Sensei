import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/components/layout/AppShell';
import { TutorChat } from '@/components/tutor/TutorChat';
import { useSubjects } from '@/hooks/useCurriculum';
import { readRaw, removeKey } from '@/lib/storage';
import { TUTOR_SEED_KEY } from '@/lib/notebook';
import { t } from '@/i18n/strings';

/** Free-form Socratic session, not bound to a lesson. */
export function TutorPage() {
  const [searchParams] = useSearchParams();
  const subjects = useSubjects();
  const subject = searchParams.get('subject') ?? undefined;
  const ask = searchParams.get('ask');
  // The notebook parks a long prompt in storage (too big for a URL) and sends
  // us here with ?seed=notebook. Read it once, then clear it so a refresh
  // doesn't replay the same hand-off.
  const seedSource = searchParams.get('seed');

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

  const seed = useMemo(() => {
    if (seedSource === 'notebook') {
      const parked = readRaw(TUTOR_SEED_KEY);
      if (parked) {
        removeKey(TUTOR_SEED_KEY);
        // Key on the content so re-parking a fresh notebook fires a new turn.
        return { key: `nb:${parked.length}:${parked.slice(0, 24)}`, message: parked };
      }
    }
    return ask ? { key: ask, message: ask } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, seedSource]);

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
