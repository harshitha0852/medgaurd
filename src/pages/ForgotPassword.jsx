import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Mail, KeyRound, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { useSession } from '@/lib/SessionContext';
import { hashPassword } from '@/lib/auth';

export default function ForgotPassword() {
  const { requestOtp, verifyOtp } = useSession();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const found = await base44.entities.Account.filter({ email: email.trim().toLowerCase() });
      setHint(requestOtp(email.trim().toLowerCase()));
      setStep(2);
      if (!found?.length) {
        setError('No account uses that email yet — you can create one instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters for the new password.');
    if (password !== confirm) return setError('The two passwords do not match.');
    const check = verifyOtp(email.trim().toLowerCase(), code);
    if (check.error) return setError(check.error);

    setLoading(true);
    try {
      const found = await base44.entities.Account.filter({ email: email.trim().toLowerCase() });
      if (!found?.length) {
        setError('No account uses that email yet.');
        return;
      }
      const password_hash = await hashPassword(password);
      await base44.entities.Account.update(found[0].id, { password_hash });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="rounded-2xl border border-[hsl(var(--mint))]/30 bg-[hsl(var(--mint))]/6 p-5 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-[hsl(var(--mint))]" />
          <p className="mt-2 text-[14px] font-semibold text-foreground">All set.</p>
        </div>
        <Link to="/login" className="mg-btn-primary mt-4 w-full">
          Go to sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={step === 1 ? 'Enter the email on your account and we will send a reset code.' : 'Enter the code we sent and choose a new password.'}
      footer={<span>Remembered it? <Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link></span>}
    >
      {step === 1 ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="mg-label" htmlFor="email">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mg-input pl-10" placeholder="you@example.com" />
            </div>
          </div>
          {error ? (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          ) : null}
          <button type="submit" disabled={loading} className="mg-btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset code
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Demo mode</p>
            <p className="mt-1 text-[13px] text-foreground">
              Email delivery is simulated. Your reset code is <span className="font-mono text-[15px] font-bold">{hint}</span>
            </p>
          </div>
          <div>
            <label className="mg-label" htmlFor="code">Reset code</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="mg-input pl-10 tracking-[0.3em]" placeholder="000000" />
            </div>
          </div>
          <div>
            <label className="mg-label" htmlFor="new">New password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="new" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mg-input pl-10" placeholder="At least 8 characters" />
            </div>
          </div>
          <div>
            <label className="mg-label" htmlFor="confirm">Confirm new password</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mg-input" placeholder="Repeat password" />
          </div>
          {error ? (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          ) : null}
          <button type="submit" disabled={loading} className="mg-btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}