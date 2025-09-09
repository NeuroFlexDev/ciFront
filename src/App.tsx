import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import MainPage from '@/Pages/MainPage/MainPage';
import AiHelperPage from '@/Pages/AiHelperPage/AiHelperPage';
import TemplatesPage from '@/Pages/TemplatesPage/TemplatesPage';
import ExpressPage from '@/Pages/ExpressPage/ExpressPage';
import MyCoursesPage from '@/Pages/MyCourses/MyCourses';
import CourseEditPage from '@/Components/CourseEditPage/CourseEditPage';
import NotFoundPage from '@/Pages/NotFound/NotFound';
import ServerError from '@/Pages/ServerError/ServerError';
import AuthPage from '@/Pages/AuthPage/AuthPage';
import RegistrationPage from '@/Pages/RegistrationPage/RegistrationPage';
import LandPage from '@/Pages/LandingPage/LandPage';
import MainLayout from '@/Pages/MainLayot/MainLayot';
import AccountPage from '@/Pages/AccountPage/AccountPage';
import type { PropsWithChildren, ReactElement } from 'react';

import { useAuth } from '@/hooks/useAuth';

function PrivateRoute({ children }: PropsWithChildren): ReactElement {
  const { user: _user } = useAuth();
  if (loading) return <div>Загрузка...</div>;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        {/* Публичные */}
        <Route path="/" element={<LandPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/registration" element={<RegistrationPage />} />

        {/* Защищённые внутри MainLayout */}
        <Route element={<MainLayout />}>
          <Route
            path="/main"
            element={
              <PrivateRoute>
                <MainPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-helper"
            element={
              <PrivateRoute>
                <AiHelperPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <PrivateRoute>
                <TemplatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/express"
            element={
              <PrivateRoute>
                <ExpressPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <PrivateRoute>
                <MyCoursesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:id/edit"
            element={
              <PrivateRoute>
                <CourseEditPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/account"
            element={
              <PrivateRoute>
                <AccountPage />
              </PrivateRoute>
            }
          />
          <Route path="/500" element={<ServerError />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
