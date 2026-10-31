import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { hashPassword, readSessionEmail, writeSessionEmail, makeOtp } from './auth';
import { ensureDemoData } from './seedDemo';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [booting, setBooting] = useState(true);
  const [patients, setPatients] = useState([]);
  const [activePatient, setActivePatient] = useState(null);
  const [unread, setUnread] = useState(0);

  const loadPatients = useCallback(async (acc) => {
    if (!acc) {
      setPatients([]);
      setActivePatient(null);
      return [];
    }
    let list = [];
    if (acc.role === 'patient') {
      list = await base44.entities.PatientProfile.filter({ account_email: acc.email });
    } else {
      // Caregivers and clinicians only see patients who have granted them active access
      const links = await base44.entities.CaregiverLink.filter({ caregiver_email: acc.email, status: 'active' });
      const emails = [...new Set(links.map((l) => l.patient_email))];
      if (emails.length) {
        list = await base44.entities.PatientProfile.filter({ account_email: { $in: emails } });
      }
    }
    setPatients(list);
    setActivePatient((prev) => {
      if (prev && list.some((p) => p.account_email === prev.account_email)) {
        return list.find((p) => p.account_email === prev.account_email);
      }
      return list[0] || null;
    });
    return list;
  }, []);

  const refreshUnread = useCallback(async (email) => {
    const addr = email || account?.email;
    if (!addr) return;
    const res = await base44.entities.Notification.filter({ recipient_email: addr, read: false });
    setUnread(Array.isArray(res) ? res.length : 0);
  }, [account]);

  useEffect(() => {
    (async () => {
      try {
        await ensureDemoData();
        const email = readSessionEmail();
        if (email) {
          const found = await base44.entities.Account.filter({ email });
          const acc = found?.[0];
          if (acc) {
            setAccount(acc);
            await loadPatients(acc);
            const res = await base44.entities.Notification.filter({ recipient_email: acc.email, read: false });
            setUnread(Array.isArray(res) ? res.length : 0);
          } else {
            writeSessionEmail(null);
          }
        }
      } finally {
        setBooting(false);
      }
    })();
  }, [loadPatients]);

  const startSession = useCallback(async (acc) => {
    writeSessionEmail(acc.email);
    setAccount(acc);
    await loadPatients(acc);
    const res = await base44.entities.Notification.filter({ recipient_email: acc.email, read: false });
    setUnread(Array.isArray(res) ? res.length : 0);
    return acc;
  }, [loadPatients]);

  const signIn = useCallback(async (email, password) => {
    const clean = email.trim().toLowerCase();
    const found = await base44.entities.Account.filter({ email: clean });
    const acc = found?.[0];
    if (!acc) return { error: 'No account found with that email address.' };
    const hash = await hashPassword(password);
    if (acc.password_hash && acc.password_hash !== hash) {
      return { error: 'That password does not match. Please try again.' };
    }
    await startSession(acc);
    return { account: acc };
  }, [startSession]);

  const signUp = useCallback(async ({ full_name, email, password, role, phone, specialty, hospital, license_no }) => {
    const clean = email.trim().toLowerCase();
    const existing = await base44.entities.Account.filter({ email: clean });
    if (existing?.length) return { error: 'An account already exists with this email. Please sign in.' };
    const password_hash = await hashPassword(password);
    const acc = await base44.entities.Account.create({
      full_name: full_name.trim(), email: clean, password_hash, role,
      phone, specialty, hospital, license_no, consent_accepted: true, is_demo: false,
    });
    if (role === 'patient') {
      await base44.entities.PatientProfile.create({
        account_email: clean, full_name: full_name.trim(), allergies: [], conditions: [],
        video_consent: false, share_consent: false,
      });
    }
    return { account: acc };
  }, []);

  const requestOtp = useCallback((email) => {
    const code = makeOtp();
    sessionStorage.setItem('mg_otp', JSON.stringify({ code, email, ts: Date.now() }));
    return code;
  }, []);

  const verifyOtp = useCallback((email, code) => {
    const raw = sessionStorage.getItem('mg_otp');
    if (!raw) return { error: 'Please request a new code.' };
    const saved = JSON.parse(raw);
    if (saved.email !== email || saved.code !== code.trim()) {
      return { error: 'That code is not correct. Please check and try again.' };
    }
    sessionStorage.removeItem('mg_otp');
    return { ok: true };
  }, []);

  const signOut = useCallback(() => {
    writeSessionEmail(null);
    setAccount(null);
    setPatients([]);
    setActivePatient(null);
    setUnread(0);
  }, []);

  const selectPatient = useCallback((email) => {
    const found = patients.find((p) => p.account_email === email);
    if (found) setActivePatient(found);
  }, [patients]);

  const value = {
    account,
    booting,
    patients,
    activePatient,
    activePatientEmail: activePatient?.account_email || account?.email,
    selectPatient,
    setActivePatient,
    refreshPatients: () => loadPatients(account),
    unread,
    refreshUnread,
    signIn,
    signUp,
    requestOtp,
    verifyOtp,
    startSession,
    signOut,
    setAccount,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** Convenience hook that loads patient-scoped data for the current page. */
export function usePatientResource(entity, filter = {}, options = {}) {
  const { activePatient } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const email = activePatient?.account_email;

  const load = useCallback(async () => {
    if (!email) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await base44.entities[entity].filter({ patient_email: email, ...filter }, options);
      setItems(Array.isArray(res) ? res : res.items || []);
    } finally {
      setLoading(false);
    }
  }, [entity, email, JSON.stringify(filter), JSON.stringify(options)]);

  useEffect(() => { load(); }, [load]);

  return { items, setItems, loading, reload: load, email };
}