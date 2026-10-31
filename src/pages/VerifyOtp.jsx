import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Loader2, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { useSession } from '@/lib/SessionContext';
import { ROLE_HOME } from '@/lib/auth';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { verifyOtp, requestOtp, startSession } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('email') || sessionStorage.getItem('mg_pending_otp_email') || '';
    setEmail(target);
    const stored = sessionStorage.getItem('mg_demo_otp_hint');
    if (stored) setHint(stored);
    else if (target) setHint(requestOtp(target));
  }, [requestOtp]);

  const resend = () => {
    if (!email) return;
    const fresh = requestOtp(email);
    setHint(fresh);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    const res = verifyOtp(email, code);
    if (res.error) {
      setError(res.error);
      return;
    }
    setLoading(true);
    try {
      const found = await base44.entities.Account.filter({ email });
      if (!found?.length) {
        setError('We could not find that account. Please register again.');
        return;
      }
      await startSession(found[0]);
      sessionStorage.removeItem('mg_pending_otp_email');
      sessionStorage.removeItem('mg_demo_otp_hint');
      navigate(ROLE_HOME[found[0].role] || '/patient-dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email || 'your email address'}. Enter it below to finish setting up.`}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mg-label" htmlFor="otp">Verification code</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mg-input pl-10 text-center text-[22px] font-bold tracking-[0.4em]"
              placeholder="000000"
            />
          </div>
        </div>

        {hint ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Demo mode</p>
            <p className="mt-1 text-[13px] text-foreground">
              Email delivery is simulated. Your code is <span className="font-mono text-[15px] font-bold">{hint}</span>
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="mg-btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {loading ? 'Verifying…' : 'Verify and continue'}
        </button>

        <button type="button" onClick={resend} className="mg-btn-ghost w-full">
          <RefreshCw className="h-4 w-4" /> Send a new code
        </button>
      </form>
    </AuthShell>
  );
}