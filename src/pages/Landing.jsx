import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, ScanLine, ShieldAlert, Mic, Camera, FileText, Users,
  HeartPulse, Check, Lock, Stethoscope, Pill, CalendarClock, Sparkles,
} from 'lucide-react';

const DEMOS = [
  { role: 'Patient', name: 'Ramesh Kumar', email: 'ramesh@medguard.demo', detail: '74, lives with his daughter, on 8 medicines' },
  { role: 'Caregiver', name: 'Priya Kumar', email: 'priya@medguard.demo', detail: 'Reviews her father’s and grandmother’s medicines' },
  { role: 'Clinician', name: 'Dr. Ananya Sharma', email: 'ananya@medguard.demo', detail: 'Geriatrician monitoring shared patient records' },
];

const FEATURES = [
  { icon: FileText, title: 'One medical history', text: 'Prescriptions, lab reports, consultations and scans from every doctor and hospital, filed under one patient profile.' },
  { icon: ScanLine, title: 'Prescription scanning', text: 'Photograph a prescription — medicine names, dosage and timing are read out for you to confirm before saving.' },
  { icon: ShieldAlert, title: 'Interaction detection', text: 'Every medicine checked against verified clinical references for interactions, duplicate ingredients and allergies.' },
  { icon: Camera, title: 'Smart verification', text: 'A patient-initiated video record per dose, reviewed by an authorised caregiver — never a claim that medicine was swallowed.' },
  { icon: Mic, title: 'Voice assistant', text: 'Ask about your medicines in English, Kannada, Telugu or Hindi and hear simple answers from your own records.' },
  { icon: Users, title: 'Caregiver monitoring', text: 'Family members see schedules, adherence history, alerts and submitted videos for the people they care for.' },
];

const STEPS = [
  { n: '01', title: 'Gather every record', text: 'Upload prescriptions and reports from any doctor, clinic or hospital. Everything is organised by specialist and date.' },
  { n: '02', title: 'Check medicine safety', text: 'MedGuard analyses the full medicine list for interactions, duplicate ingredients and allergy conflicts.' },
  { n: '03', title: 'Stay connected', text: 'Patients get reminders and record short videos; caregivers review them and see adherence over time.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.3} />
            </span>
            <span className="text-[16px] font-extrabold text-foreground">MedGuard</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#safety" className="transition hover:text-foreground">Safety & privacy</a>
            <a href="#demo" className="transition hover:text-foreground">Demo accounts</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground transition hover:bg-muted">
              Sign in
            </Link>
            <Link to="/register" className="mg-btn-primary h-10 px-4 text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] mg-glow" />
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
          <div className="mg-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1.5 text-[12px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI medication safety for families
            </div>
            <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-[52px]">
              The safest way for
              <span className="text-primary"> elderly families </span>
              to manage medicines.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
              MedGuard brings every prescription, report and reminder into one calm place. It checks
              medicine combinations against verified clinical data and keeps family caregivers in the loop —
              without replacing their doctor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="mg-btn-primary h-12 px-6">
                Create a free account <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => navigate('/login?email=ramesh@medguard.demo')}
                className="mg-btn-ghost h-12 px-6"
              >
                Explore the patient demo
              </button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              {['Verified interaction data', 'Private video storage', '5 Indian languages'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[hsl(var(--mint))]" strokeWidth={3} /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="mg-card overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Today · Ramesh Kumar</p>
                  <p className="mt-1 text-[19px] font-extrabold text-foreground">Medication summary</p>
                </div>
                <span className="mg-chip bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">9 doses</span>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { time: '08:00', name: 'Ecosprin 75', note: 'after breakfast', done: true },
                  { time: '13:00', name: 'Shelcal 500', note: 'after lunch', done: true },
                  { time: '20:00', name: 'Warfarin 5 mg', note: 'at night', done: false },
                ].map((m) => (
                  <div key={m.time} className="flex items-center gap-3 rounded-2xl border border-border/80 bg-white px-3.5 py-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.done ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : 'bg-primary/8 text-primary'}`}>
                      {m.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <CalendarClock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-foreground">{m.name}</p>
                      <p className="text-[12px] text-muted-foreground">{m.time} · {m.note}</p>
                    </div>
                    <span className={`mg-chip ${m.done ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : 'bg-primary/8 text-primary'}`}>
                      {m.done ? 'Reviewed' : 'Due'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3.5 rounded-2xl border border-red-200 bg-red-50/80 p-3.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-red-700">
                  <ShieldAlert className="h-4 w-4" /> High-risk combination found
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-red-700/85">
                  Warfarin + Brufen 400 can cause serious bleeding. Consult your doctor before the next dose.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-muted/70 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary">PK</span>
                <p className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Priya reviewed a video</span> — Ecosprin taken at 08:00
                </p>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 hidden w-[230px] rounded-2xl border border-border bg-white p-3.5 shadow-xl shadow-primary/10 sm:block">
              <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
                <Mic className="h-3.5 w-3.5" /> Voice assistant
              </div>
              <p className="mt-1.5 text-[13px] font-semibold text-foreground">“ನನ್ನ ಮದ್ದು ಯಾವಾಗ?”</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                ನಿಮ್ಮ ಮುಂದಿನ ಮದ್ದು ರಾತ್ರಿ 8 ಗಂಟೆಗೆ — ವಾರ್ಫರಿನ್ 5 ಮಿಗ್ರಾಂ.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1180px] px-5 pb-16">
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-border bg-white p-6 sm:grid-cols-4">
            {[
              { v: '1 place', l: 'for every medical record' },
              { v: '5 languages', l: 'voice assistant support' },
              { v: '7 stages', l: 'of dose verification status' },
              { v: '100%', l: 'caregiver-reviewed videos' },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-[24px] font-extrabold text-foreground">{s.v}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-border bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="max-w-2xl">
            <p className="mg-eyebrow">What MedGuard does</p>
            <h2 className="mt-2 text-[30px] font-extrabold leading-tight text-foreground sm:text-[38px]">
              Built around the realities of ageing and caregiving
            </h2>
            <p className="mt-3 text-[15.5px] text-muted-foreground">
              Large text, clear buttons and short sentences — designed with elderly patients in mind,
              powerful enough for the family members managing their care.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="mg-card mg-card-hover p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <f.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="mt-4 text-[16px] font-bold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mg-eyebrow">How it works</p>
              <h2 className="mt-2 text-[30px] font-extrabold leading-tight text-foreground sm:text-[38px]">
                Three steps to a safer routine
              </h2>
              <div className="mt-8 space-y-6">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-[13px] font-bold text-white">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-[15.5px] font-bold text-foreground">{s.title}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mg-card overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-6 py-4">
                <p className="text-[13px] font-bold text-foreground">Centralised record · Ramesh Kumar</p>
                <p className="text-[12px] text-muted-foreground">4 sources · last updated today</p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { icon: Stethoscope, t: 'Cardiology follow-up · ECG', s: 'Dr. Mehta · Apollo Hospital', d: '18 Sep 2026' },
                  { icon: FileText, t: 'HbA1c & lipid profile', s: 'Metropolis Diagnostics', d: '02 Oct 2026' },
                  { icon: Pill, t: 'Prescription — Warfarin adjustment', s: 'Dr. Ananya Sharma · Sunrise Clinic', d: '12 Oct 2026' },
                  { icon: HeartPulse, t: 'Knee X-ray report', s: 'Dr. Rao · City Orthopaedic', d: '30 Aug 2026' },
                ].map((r) => (
                  <div key={r.t} className="flex items-center gap-3 px-6 py-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 text-primary">
                      <r.icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">{r.t}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{r.s}</p>
                    </div>
                    <span className="hidden shrink-0 text-[11.5px] text-muted-foreground sm:block">{r.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="border-y border-border bg-[hsl(211_76%_18%)] py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Safety & privacy</p>
            <h2 className="mt-2 text-[30px] font-extrabold leading-tight sm:text-[36px]">
              Honest about what technology can and cannot do
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/70">
              MedGuard is a coordination tool. It never diagnoses, never prescribes, and never invents
              clinical results. Interaction warnings come from curated clinical references and are always
              paired with “consult your doctor or pharmacist”.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Lock, t: 'Consent first', d: 'Video and record sharing starts switched off until the patient agrees.' },
              { icon: ShieldAlert, t: 'Verified sources', d: 'Interactions cite Micromedex/BNF-style monographs, not AI guesswork.' },
              { icon: Camera, t: 'Camera on your terms', d: 'Recording starts only when the patient taps — never in the background.' },
              { icon: Check, t: 'Human review', d: 'A video is a visual record, not proof. Caregivers decide.' },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <c.icon className="h-5 w-5 text-[hsl(var(--mint))]" />
                <p className="mt-2.5 text-[13.5px] font-bold">{c.t}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="text-center">
            <p className="mg-eyebrow">Demonstration accounts</p>
            <h2 className="mt-2 text-[30px] font-extrabold text-foreground sm:text-[36px]">Try all three roles</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
              These are sample accounts with clearly labelled demonstration data. The password for all three is <span className="font-semibold text-foreground">demo1234</span>.
            </p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {DEMOS.map((d) => (
              <div key={d.email} className="mg-card mg-card-hover flex flex-col p-6">
                <span className="mg-chip w-fit bg-primary/8 text-primary">{d.role}</span>
                <p className="mt-3 text-[17px] font-bold text-foreground">{d.name}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{d.detail}</p>
                <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 font-mono text-[12px] text-muted-foreground">{d.email}</p>
                <button onClick={() => navigate(`/login?email=${d.email}`)} className="mg-btn-ghost mt-4 w-full">
                  Sign in as {d.role.toLowerCase()} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[32px] bg-gradient-to-br from-primary to-[hsl(202_70%_28%)] px-8 py-12 text-center text-white sm:px-14 sm:py-16">
          <h2 className="mx-auto max-w-2xl text-[30px] font-extrabold leading-tight sm:text-[38px]">
            Bring your family’s medicines under one calm roof
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-white/75">
            Set up a patient profile in a minute, then add the first prescription.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="mg-btn h-12 bg-white px-6 text-primary hover:bg-white/90">
              Create free account
            </Link>
            <Link to="/login" className="mg-btn h-12 border border-white/30 px-6 text-white hover:bg-white/10">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-3 px-5 text-[12.5px] text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> MedGuard · medication safety & elderly care
          </p>
          <p>Demo product · not a substitute for professional medical advice.</p>
        </div>
      </footer>
    </div>
  );
}