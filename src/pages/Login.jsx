import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { useSession } from '@/lib/SessionContext';
import { ROLE_HOME } from '@/lib/auth';

const DEMO_USERS = [
  { label: 'Patient', email: 'ramesh@medguard.demo' },
  { label: 'Caregiver', email: 'priya@medguard.demo' },
  { label: 'Clinician', email: 'ananya@medguard.demo' },
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn, account, booting } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('email');
    if (preset) {
      setEmail(preset);
      setPassword('demo1234');
    }
  }, []);

  useEffect(() => {
    if (account) navigate(ROLE_HOME[account.role] || '/patient-dashboard', { replace: true });
  }, [account, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        navigate(ROLE_HOME[res.account.role] || '/patient-dashboard');
      }
    } catch {
      setError('We could not sign you in just now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your medicines, records and care team."
      footer={
        <span>
          New to MedGuard?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mg-label" htmlFor="email">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mg-input pl-10"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="mg-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="mb-1.5 text-[13px] font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mg-input pl-10 pr-11"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="mg-btn-primary w-full">
          {loading || booting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {booting ? 'Preparing demo accounts…' : loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-7 rounded-2xl border border-border bg-muted/40 p-4">
        <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Demo accounts · password demo1234</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DEMO_USERS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => { setEmail(d.email); setPassword('demo1234'); setError(''); }}
              className="rounded-xl border border-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}