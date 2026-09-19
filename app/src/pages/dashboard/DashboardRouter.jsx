import { isInspector } from '../../lib/auth';
import Dashboard from './Dashboard';
import ConsumerDashboard from './ConsumerDashboard';

// The Inspection Officer portal and the Consumer portal land on the same
// /dashboard route but see very different content, so this just picks
// the right one based on which portal the person signed in through.
export default function DashboardRouter() {
  return isInspector() ? <Dashboard /> : <ConsumerDashboard />;
}
