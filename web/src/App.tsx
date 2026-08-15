import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsProvider } from '@/state/settings';
import { ProgressProvider } from '@/state/progress';
import { DashboardPage } from '@/pages/Dashboard';
import { CatalogPage } from '@/pages/Catalog';
import { CourseDetailPage } from '@/pages/CourseDetail';
import { LessonPage } from '@/pages/Lesson';
import { PracticePage } from '@/pages/Practice';
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
          <BrowserRouter basename={BASENAME || '/'}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="courses" element={<CatalogPage />} />
                <Route path="courses/:subjectId" element={<CourseDetailPage />} />
                <Route path="courses/:subjectId/lessons/:lessonId" element={<LessonPage />} />
                <Route path="practice" element={<PracticePage />} />
                <Route path="tutor" element={<TutorPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ProgressProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
