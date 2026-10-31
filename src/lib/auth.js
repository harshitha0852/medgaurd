export async function hashPassword(password) {
  const data = new TextEncoder().encode(`medguard::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const SESSION_KEY = 'medguard_session_email';

export function readSessionEmail() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeSessionEmail(email) {
  try {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export const ROLE_LABEL = {
  patient: 'Patient',
  caregiver: 'Family / Caregiver',
  professional: 'Healthcare Professional',
};

export const ROLE_HOME = {
  patient: '/patient-dashboard',
  caregiver: '/caregiver-dashboard',
  professional: '/professional-dashboard',
};