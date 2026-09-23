import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { CourseLibraryPage } from './pages/CourseLibraryPage';
import { CourseWorkspacePage } from './pages/CourseWorkspacePage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<CourseLibraryPage />} />
        <Route path="courses/:courseId" element={<CourseWorkspacePage />} />
        <Route path="*" element={<CourseLibraryPage />} />
      </Route>
    </Routes>
  );
}
