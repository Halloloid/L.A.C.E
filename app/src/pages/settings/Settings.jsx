import { Toggle } from '../../components/ui/Basics';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, getRole } from '../../lib/auth';
import { getCurrentUser } from '../../data/mockData';

export default function Settings() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser(getRole());
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);

  return (
    <div className="page settings-page">
      <div className="page__head">
        <h1>Settings</h1>
      </div>

      <div className="settings-page__section card">
        <span className="mono-label">Profile</span>
        <div className="settings-page__profile">
          <span className="app-shell__avatar">{currentUser.initials}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <p>{currentUser.role}</p>
            <p>{currentUser.org}</p>
          </div>
        </div>
      </div>

      <div className="settings-page__section card">
        <span className="mono-label">Notifications</span>
        <Toggle
          checked={notifyEmail}
          onChange={setNotifyEmail}
          label="Email alerts"
          description="Get notified when an inspection fails."
        />
        <Toggle
          checked={notifySms}
          onChange={setNotifySms}
          label="SMS alerts"
          description="Text alerts for high-priority violations."
        />
      </div>

      <div className="settings-page__section card">
        <span className="mono-label">Session</span>
        <button
          className="btn btn--secondary btn--md"
          onClick={() => {
            signOut();
            navigate('/', { replace: true });
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
