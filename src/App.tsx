import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { ProtectedRoute } from './auth/ProtectedRoute';

const MainPage = lazy(() => import('./Pages/MainPage/MainPage'));
const AuthPage = lazy(() => import('./Pages/AuthPage/AuthPage'));
const PrivacyPage = lazy(() => import('./Pages/PrivacyPage/PrivacyPage'));
const AiHelperPage = lazy(() => import('./Pages/AiHelperPage/AiHelperPage'));
const TemplatesPage = lazy(() => import('./Pages/TemplatesPage/TemplatesPage'));
const ExpressPage = lazy(() => import('./Pages/ExpressPage/ExpressPage'));
const MyCoursesPage = lazy(() => import('./Pages/MyCourses/MyCourses'));
const CourseEditPage = lazy(() => import('./Components/CourseEditPage/CourseEditPage'));
const LerniumCanvasPage = lazy(() => import('./Pages/LerniumCanvasPage/LerniumCanvasPage'));

function AppFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '18px 16px 32px',
        background: 'linear-gradient(180deg, var(--ui-bg-secondary), var(--ui-bg) 38%, #050d16 100%)',
        color: 'var(--ui-text)',
      }}
    >
      <div
        style={{
          width: 'min(calc(100% - 4px), 1360px)',
          margin: '0 auto',
          borderRadius: '32px',
          padding: '28px 32px',
          background: 'color-mix(in srgb, var(--ui-surface-strong) 90%, transparent)',
          boxShadow: 'var(--ui-shadow)',
        }}
      >
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: '0.76rem' }}>Lernium</div>
        <div style={{ marginTop: '16px', color: 'var(--ui-muted)' }}>Загружаем интерфейс...</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
    <BrowserRouter>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/" element={<MainPage/>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/ai-helper" element={<ProtectedRoute><AiHelperPage /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
          <Route path="/express" element={<ProtectedRoute><ExpressPage /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><MyCoursesPage /></ProtectedRoute>} />
          <Route path="/courses/:id/edit" element={<ProtectedRoute><CourseEditPage /></ProtectedRoute>} />
          <Route path="/courses/:id/canvas" element={<ProtectedRoute><LerniumCanvasPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </>
  )
}

export default App
