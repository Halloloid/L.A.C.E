// Super simple "am I signed in?" helper for the demo.
// We keep a few flags in sessionStorage, so the session resets when the tab is closed.
// Names people typed when creating an account are remembered in localStorage, so signing
// in again with the same email shows the same name.
// When the real Rust/Axum backend is ready, swap this for a real token check.

const KEY = 'lace_signed_in';
const ROLE_KEY = 'lace_role';
const NAME_KEY = 'lace_user_name';
const ACCOUNTS_KEY = 'lace_demo_accounts';

export const ROLES = {
  CONSUMER: 'consumer',
  INSPECTOR: 'inspector',
};

export function isSignedIn() {
  try {
    return sessionStorage.getItem(KEY) === 'yes';
  } catch (err) {
    return false; // storage blocked? then treat as signed out
  }
}

// Which portal the signed-in person is using. Defaults to consumer so an
// unexpected/blocked storage read never accidentally unlocks the officer tools.
export function getRole() {
  try {
    return sessionStorage.getItem(ROLE_KEY) === ROLES.INSPECTOR ? ROLES.INSPECTOR : ROLES.CONSUMER;
  } catch (err) {
    return ROLES.CONSUMER;
  }
}

export function isInspector() {
  return getRole() === ROLES.INSPECTOR;
}

// ---- Account name -------------------------------------------------------

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// "aditi.rao@example.com" -> "Aditi Rao". Returns '' when nothing readable can be
// made of it (a phone number, for instance) so the caller can pick a fallback.
export function nameFromIdentifier(identifier = '') {
  const raw = String(identifier).trim();
  if (!raw) return '';
  const local = raw.includes('@') ? raw.split('@')[0] : raw;
  if (/^[+\d\s()-]+$/.test(local)) return ''; // looks like a phone number
  const words = local
    .split(/[._\-\s]+/)
    .map((w) => w.replace(/\d+/g, ''))
    .filter(Boolean);
  return words.map(titleCase).join(' ');
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
  } catch (err) {
    return {};
  }
}

// Called by the Register page so the name typed there is what shows up next time.
export function saveAccountName(identifier, name) {
  const key = String(identifier).trim().toLowerCase();
  if (!key || !name) return;
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ ...readAccounts(), [key]: name.trim() }));
  } catch (err) {
    // nothing to do
  }
}

// Best name to show for whatever the person typed into the sign-in box.
export function resolveAccountName(identifier, role = ROLES.CONSUMER) {
  const saved = readAccounts()[String(identifier).trim().toLowerCase()];
  if (saved) return saved;
  const derived = nameFromIdentifier(identifier);
  if (derived) return derived;
  return role === ROLES.INSPECTOR ? 'Inspection Officer' : 'Shopper';
}

// The name of whoever is signed in right now ('' when signed out).
export function getUserName() {
  try {
    return sessionStorage.getItem(NAME_KEY) || '';
  } catch (err) {
    return '';
  }
}

export function signIn(role = ROLES.CONSUMER, name = '') {
  try {
    sessionStorage.setItem(KEY, 'yes');
    sessionStorage.setItem(ROLE_KEY, role === ROLES.INSPECTOR ? ROLES.INSPECTOR : ROLES.CONSUMER);
    if (name) sessionStorage.setItem(NAME_KEY, name.trim());
    else sessionStorage.removeItem(NAME_KEY);
  } catch (err) {
    // nothing to do, demo will just ask again
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(NAME_KEY);
  } catch (err) {
    // nothing to do
  }
}
