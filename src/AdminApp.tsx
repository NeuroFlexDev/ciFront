import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/useAuth';
import { LoadingState } from './Components/RequestState';
import { useLocale } from './i18n/useLocale';
import type { ReactNode } from 'react';
import './App.css';
const Auth = lazy(() => import('./Pages/AuthPage/AuthPage'));
const Admin = lazy(() => import('./Pages/AdminPage/AdminPage'));
const Delivery = lazy(() => import('./Pages/AdminPage/DeliveryPage'));
const Billing = lazy(() => import('./Pages/Billing/BillingPage'));
const Operations = lazy(() => import('./Pages/Integrations/AdminOperationsPage'));
const Support = lazy(() => import('./Pages/TeamLearning/SupportAccessPage'));
const Account = lazy(() => import('./Pages/AccountPage/AccountPage'));
const Access = lazy(() => import('./Pages/AccessPage/AccessPage'));
const Status = lazy(() => import('./Pages/AccessPage/StatusPage'));
function Operator({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  return (
    <ProtectedRoute>
      {!isLoading && user && !user.is_admin ? (
        <Status code='403' title='Доступ только для администратора Лерниума' />
      ) : (
        children
      )}
    </ProtectedRoute>
  );
}
export default function AdminApp() {
  const { t } = useLocale();
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState>{t('Загружаем интерфейс...')}</LoadingState>}>
        <Routes>
          <Route path='/' element={<Navigate to='/admin' replace />} />
          <Route path='/auth' element={<Auth />} />
          <Route path='/forgot-password' element={<Access />} />
          <Route path='/reset-password' element={<Access reset />} />
          <Route
            path='/admin'
            element={
              <Operator>
                <Admin />
              </Operator>
            }
          />
          <Route
            path='/admin/organizations/:organizationId/delivery'
            element={
              <Operator>
                <Delivery />
              </Operator>
            }
          />
          <Route
            path='/admin/organizations/:organizationId/billing'
            element={
              <Operator>
                <Billing />
              </Operator>
            }
          />
          <Route
            path='/admin/operations'
            element={
              <Operator>
                <Operations />
              </Operator>
            }
          />
          <Route
            path='/support-access'
            element={
              <Operator>
                <Support />
              </Operator>
            }
          />
          <Route
            path='/account'
            element={
              <Operator>
                <Account />
              </Operator>
            }
          />
          <Route path='*' element={<Status />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
