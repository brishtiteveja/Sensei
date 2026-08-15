import { Compass } from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/States';
import { LinkButton } from '@/components/ui/Button';
import { t } from '@/i18n/strings';

export function NotFoundPage() {
  return (
    <Page>
      <div className="py-16">
        <EmptyState
          title={t.errors.notFoundTitle}
          body={t.errors.notFoundBody}
          icon={<Compass size={24} />}
          action={<LinkButton to="/">{t.nav.dashboard}</LinkButton>}
        />
      </div>
    </Page>
  );
}
