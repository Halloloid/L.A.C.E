import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSignedIn, getRole } from '../../lib/auth';

// Wraps every page that needs a signed-in person (scan, dashboard, etc).
// Not signed in? Send them to /login and remember where they were going,
// so after login we can drop them right back there (e.g. /scan).
//
// Pass `role="inspector"` to additionally lock a route to the Inspection
// Officer portal — a consumer who lands on an officer-only URL is bounced
// back to their own dashboard instead of seeing a broken/irrelevant page.
export default function RequireAuth({ role }) {
  const location = useLocation();

  if (!isSignedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && getRole() !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
