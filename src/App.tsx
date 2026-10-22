import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { AppErrorBoundary } from './Components/AppErrorBoundary';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useLocale } from '@/i18n/useLocale';
import { LoadingState } from './Components/RequestState';
import logo from './assets/icons/logo.svg';

const MainPage = lazy(() => import('./Pages/MainPage/MainPage'));
const AuthPage = lazy(() => import('./Pages/AuthPage/AuthPage'));
const AccountPage = lazy(() => import('./Pages/AccountPage/AccountPage'));
const AccessPage = lazy(() => import('./Pages/AccessPage/AccessPage'));
const StatusPage = lazy(() => import('./Pages/AccessPage/StatusPage'));
function PrivacyRedirect() {
  window.location.replace('/legal/privacy/');
  return null;
}
const AiHelperPage = lazy(() => import('./Pages/AiHelperPage/AiHelperPage'));
const TemplatesPage = lazy(() => import('./Pages/Workspace/Templates'));
const Dashboard = lazy(() => import('./Pages/Workspace/Dashboard'));
const TeamPage = lazy(() => import('./Pages/Workspace/TeamPage'));
const BusinessPage = lazy(() => import('./Pages/Business/BusinessPage'));
const IntegrationsPage = lazy(() => import('./Pages/Integrations/IntegrationsPage'));
const BillingPage = lazy(() => import('./Pages/Billing/BillingPage'));
const InvitePage = lazy(() => import('./Pages/InvitePage/InvitePage'));
const ExpressPage = lazy(() => import('./Pages/ExpressPage/ExpressPage'));
const MyCoursesPage = lazy(() => import('./Pages/MyCourses/MyCourses'));
const CourseEditPage = lazy(() => import('./Components/CourseEditPage/CourseEditPage'));
const LerniumCanvasPage = lazy(() => import('./Pages/LerniumCanvasPage/LerniumCanvasPage'));
const LearningHome = lazy(() => import('./Pages/Learning/LearningHome'));
const LearningCourse = lazy(() => import('./Pages/Learning/LearningCourse'));
const ReviewsPage = lazy(() => import('./Pages/Learning/ReviewsPage'));
const CourseReviewsPage = lazy(() => import('./Pages/Learning/CourseReviewsPage'));
const GroupsPage = lazy(() => import('./Pages/TeamLearning/GroupsPage'));
const AssignmentsPage = lazy(() => import('./Pages/TeamLearning/AssignmentsPage'));
const ProgramsPage = lazy(() => import('./Pages/TeamLearning/ProgramsPage'));
const TeamSettingsPage = lazy(() => import('./Pages/TeamLearning/TeamSettingsPage'));
const LearningAnalytics = lazy(() => import('./Pages/TeamLearning/LearningAnalytics'));
const SupportAccessPage = lazy(() => import('./Pages/TeamLearning/SupportAccessPage'));

function AppFallback() {
  const { t } = useLocale();
  return (
    <div className='app-loading'>
      <div className='app-loading__panel'>
        <img className='app-loading__brand' src={logo} alt={t('Лерниум')} />
        <LoadingState>{t('Загружаем интерфейс...')}</LoadingState>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<AppFallback />}>
          <Routes>
            <Route path='/' element={<MainPage />} />
            <Route path='/auth' element={<AuthPage />} />
            <Route path='/privacy' element={<PrivacyRedirect />} />
            <Route
              path='/account'
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route path='/forgot-password' element={<AccessPage />} />
            <Route path='/reset-password' element={<AccessPage reset />} />
            <Route
              path='/dashboard'
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path='/analytics'
              element={
                <ProtectedRoute>
                  <Dashboard analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path='/employees'
              element={
                <ProtectedRoute>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/integrations'
              element={
                <ProtectedRoute>
                  <IntegrationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/billing'
              element={
                <ProtectedRoute>
                  <BillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/learning'
              element={
                <ProtectedRoute>
                  <LearningHome />
                </ProtectedRoute>
              }
            />
            <Route
              path='/learning/:id'
              element={
                <ProtectedRoute>
                  <LearningCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path='/reviews'
              element={
                <ProtectedRoute>
                  <ReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/course-reviews'
              element={
                <ProtectedRoute>
                  <CourseReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/groups'
              element={
                <ProtectedRoute>
                  <GroupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/assignments'
              element={
                <ProtectedRoute>
                  <AssignmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/programs'
              element={
                <ProtectedRoute>
                  <ProgramsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/team-settings'
              element={
                <ProtectedRoute>
                  <TeamSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/support-access'
              element={
                <ProtectedRoute>
                  <SupportAccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/learning-analytics'
              element={
                <ProtectedRoute>
                  <LearningAnalytics />
                </ProtectedRoute>
              }
            />
            <Route path='/company' element={<ProtectedRoute><BusinessPage /></ProtectedRoute>} />
            <Route path='/invite' element={<InvitePage />} />
            <Route path='*' element={<StatusPage />} />
            <Route
              path='/ai-helper'
              element={
                <ProtectedRoute>
                  <AiHelperPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/templates'
              element={
                <ProtectedRoute>
                  <TemplatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/express'
              element={
                <ProtectedRoute>
                  <ExpressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/courses'
              element={
                <ProtectedRoute>
                  <MyCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/courses/:id/edit'
              element={
                <ProtectedRoute>
                  <CourseEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/courses/:id/canvas'
              element={
                <ProtectedRoute>
                  <LerniumCanvasPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
