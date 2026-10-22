import {useAuth} from '@/auth/useAuth';
import {Navigate} from 'react-router-dom';
import AuthorAnalytics from "./AuthorAnalytics";
import LearningDashboard from "./LearningDashboard";
export default function Dashboard({
  analytics = false,
}: {
  analytics?: boolean;
}) {
  const {user} = useAuth();
  if (!analytics && user?.organization_kind === 'business' && ['owner', 'admin', 'manager'].includes(user.organization_role ?? '')) return <Navigate to='/company' replace />;
  return analytics ? <AuthorAnalytics analytics /> : <LearningDashboard />;
}
