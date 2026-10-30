import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, Lock, Check } from 'lucide-react';

export default function AuthShell({ children, title, subtitle, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-[430px]">
          <Link to="/" className="mb-9 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-[17px] font-extrabold text-foreground">MedGuard</span>
          </Link>
          <h1 className="text-[28px] font-extrabold leading-tight text-foreground">{title}</h1>
          {subtitle ? <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[hsl(211_76%_18%)] lg:block">
        <div className="absolute inset-0 mg-glow opacity-60" />
        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '26px 26px' }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Built for elderly care
          </div>
          <div>
            <p className="max-w-md text-[30px] font-extrabold leading-tight">
              Every prescription, every dose, every caregiver — in one safe place.
            </p>
            <div className="mt-7 space-y-3">
              {[
                'All doctors and hospitals in one medical history',
                'Drug interaction alerts from verified clinical data',
                'Caregivers see medication videos after review',
              ].map((t) => (
                <div key={t} className="flex items-start gap-2.5 text-[14px] text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--mint))]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-2 text-[12px] text-white/60">
            <Lock className="h-3.5 w-3.5" /> Private storage · consent-based sharing · no facial recognition
          </p>
        </div>
      </div>
    </div>
  );
}
