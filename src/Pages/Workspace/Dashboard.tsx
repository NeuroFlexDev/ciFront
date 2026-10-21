import AuthorAnalytics from "./AuthorAnalytics";
import LearningDashboard from "./LearningDashboard";
export default function Dashboard({
  analytics = false,
}: {
  analytics?: boolean;
}) {
  return analytics ? <AuthorAnalytics analytics /> : <LearningDashboard />;
}
