import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRound, Users, Stethoscope, Mail, Lock, Phone, Loader2, AlertCircle, Check, ShieldCheck } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { useSession } from '@/lib/SessionContext';

const ROLES = [
  { id: 'patient', label: 'Patient', desc: 'I manage my own medicines', icon: UserRound },
  { id: 'caregiver', label: 'Family / Caregiver', desc: 'I look after someone else', icon: Users },
  { id: 'professional', label: 'Healthcare professional', desc: 'Doctor, nurse or pharmacist', icon: Stethoscope },
];

export default function Register() {
  const navigate = useNavigate();
  const { signUp, requestOtp } = useSession();
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '', specialty: '', hospital: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) return setError('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email address.');
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    if (!consent) return setError('Please accept the consent notice to continue.');

    setLoading(true);
    try {
      const res = await signUp({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role,
        phone: form.phone,
        specialty: form.specialty,
        hospital: form.hospital,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const code = requestOtp(form.email.trim().toLowerCase());
      sessionStorage.setItem('mg_pending_otp_email', form.email.trim().toLowerCase());
      sessionStorage.setItem('mg_demo_otp_hint', code);
      navigate(`/verify-otp?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch {
      setError('We could not create the account just now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your MedGuard account"
      subtitle="One profile for medicines, records and the people who help you."
      footer={<span>Already registered? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></span>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mg-label">I am signing up as</p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  role === r.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
                    : 'border-border bg-white hover:border-primary/40'
                }`}
              >
                <r.icon className={`h-5 w-5 ${role === r.id ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.9} />
                <p className="mt-2 text-[13px] font-bold text-foreground">{r.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mg-label" htmlFor="full_name">Full name</label>
          <input id="full_name" value={form.full_name} onChange={set('full_name')} className="mg-input" placeholder="e.g. Ramesh Kumar" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mg-label" htmlFor="email">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="email" type="email" value={form.email} onChange={set('email')} className="mg-input pl-10" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="mg-label" htmlFor="phone">Phone number</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="phone" value={form.phone} onChange={set('phone')} className="mg-input pl-10" placeholder="+91 …" />
            </div>
          </div>
        </div>

        {role === 'professional' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mg-label" htmlFor="specialty">Speciality</label>
              <input id="specialty" value={form.specialty} onChange={set('specialty')} className="mg-input" placeholder="Geriatric medicine" />
            </div>
            <div>
              <label className="mg-label" htmlFor="hospital">Hospital / clinic</label>
              <input id="hospital" value={form.hospital} onChange={set('hospital')} className="mg-input" placeholder="Sunrise Clinic" />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mg-label" htmlFor="password">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="password" type="password" value={form.password} onChange={set('password')} className="mg-input pl-10" placeholder="At least 8 characters" />
            </div>
          </div>
          <div>
            <label className="mg-label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} className="mg-input" placeholder="Repeat password" />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-muted/50 p-3.5">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
          <span className="text-[12.5px] leading-relaxed text-muted-foreground">
            I consent to MedGuard storing my medical information securely. Sharing with caregivers or doctors stays off
            until I allow it in Settings. I understand MedGuard does not diagnose conditions or replace my doctor.
          </span>
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="mg-btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {loading ? 'Creating account…' : 'Create account & verify email'}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-[hsl(var(--mint))]" /> You will verify your email with a 6-digit code
        </p>
      </form>
    </AuthShell>
  );
}