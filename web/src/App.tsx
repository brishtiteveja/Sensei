import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsProvider, useSettings } from '@/state/settings';
import { ProgressProvider } from '@/state/progress';
import { DashboardPage } from '@/pages/Dashboard';
import { CatalogPage } from '@/pages/Catalog';
import { CourseDetailPage } from '@/pages/CourseDetail';
import { LessonPage } from '@/pages/Lesson';
import { PracticePage } from '@/pages/Practice';
import { NotebookPage } from '@/pages/Notebook';
import { ProgressPage } from '@/pages/ProgressPage';
import { SettingsPage } from '@/pages/Settings';
import { TutorPage } from '@/pages/Tutor';
import { NotFoundPage } from '@/pages/NotFound';

/**
 * Served from a subpath, so the router basename must match vite's `base`.
 * `import.meta.env.BASE_URL` is '/sensei/' in the build and in dev, which keeps
 * the two in sync from one source of truth.
 */
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ProgressProvider>
          <LocalisedTree />
        </ProgressProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

/**
 * Remounts the whole tree when the language changes.
 *
 * `t` is a module singleton rather than context, so a locale switch does not
 * by itself invalidate anything React is tracking. Keying on the language
 * forces every component to re-read it, and drops in-flight requests carrying
 * the old `?lang=` along with it. Switching language is a deliberate, rare act
 * where losing transient view state is the correct outcome anyway.
 */
function LocalisedTree() {
  const { language } = useSettings();
  return (
    <BrowserRouter key={language} basename={BASENAME || '/'}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="courses" element={<CatalogPage />} />
          <Route path="courses/:subjectId" element={<CourseDetailPage />} />
          <Route path="courses/:subjectId/lessons/:lessonId" element={<LessonPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="notebook" element={<NotebookPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
