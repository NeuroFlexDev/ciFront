import { useSession } from '../../lib/session';
import { manages } from '../../lib/types';
import { Dashboard } from '../../ui/Dashboard';
import Learning from './learning';
export default function Home() {
  const { user } = useSession();
  return manages(user) ? <Dashboard /> : <Learning />;
}
