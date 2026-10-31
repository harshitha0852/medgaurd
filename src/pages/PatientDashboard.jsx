import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Pill, CalendarClock, ShieldAlert, HeartPulse, FileText, Users, ArrowRight,
  Check, Clock, Sparkles, Activity, Droplets,
} from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { analyzeMedications, adherenceSummary } from '@/lib/interactionEngine';
import { calcAge, greeting, timeLabel, todayKey, shortDate } from '@/lib/format';
import StatCard from '@/components/common/StatCard';
import SeverityBadge from '@/components/common/SeverityBadge';
import AdherenceChart from '@/components/medication/AdherenceChart';
import LogStatusPill from '@/components/medication/LogStatusPill';
import EmptyState from '@/components/common/EmptyState';

export default function PatientDashboard() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email || account?.email;
  const [meds, setMeds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [records, setRecords] = useState([]);
  const [links, setLinks] = useState([]);
  const [water, setWater] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [m, l, r, c, w] = await Promise.all([
          base44.entities.Medication.filter({ patient_email: email, active: true }),
          base44.entities.MedicationLog.filter({ patient_email: email }),
          base44.entities.MedicalRecord.filter({ patient_email: email }, { sort: '-record_date', limit: 4 }),
          base44.entities.CaregiverLink.filter({ patient_email: email, status: 'active' }),
          base44.entities.HealthMetric.filter({ patient_email: email, type: 'water' }),
        ]);
        if (!alive) return;
        setMeds(m || []);
        setLogs(l || []);
        setRecords(Array.isArray(r) ? r : r.items || []);
        setLinks(c || []);
        const today = todayKey();
        setWater((w || []).filter((x) => (x.recorded_date || '').startsWith(today)).reduce((s, x) => s + (x.value || 0), 0));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [email]);

  const today = todayKey();
  const todayLogs = useMemo(
    () => logs.filter((l) => l.scheduled_date === today).sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')),
    [logs, today]
  );
  const adherence = useMemo(() => adherenceSummary(logs.filter((l) => l.scheduled_date !== today)), [logs, today]);
  const analysis = useMemo(() => analyzeMedications(meds, activePatient), [meds, activePatient]);
  const takenToday = todayLogs.filter((l) => ['reviewed', 'video_submitted', 'awaiting_review'].includes(l.status)).length;
  const remaining = todayLogs.filter((l) => ['scheduled', 'reminder_sent'].includes(l.status));

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading your health summary…</div>;
  }

  return (
    <div className="space-y-7">
      <div className="mg-card relative overflow-hidden p-6 sm:p-7">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mg-eyebrow">{greeting()} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="mt-1.5 text-[27px] font-extrabold text-foreground sm:text-[32px]">
              {activePatient?.full_name || account.full_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              {activePatient?.date_of_birth ? <span>{calcAge(activePatient.date_of_birth)} years</span> : null}
              {activePatient?.blood_group ? <><span className="text-border">·</span><span>Blood group {activePatient.blood_group}</span></> : null}
              {activePatient?.primary_doctor ? <><span className="text-border">·</span><span>{activePatient.primary_doctor}</span></> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(activePatient?.conditions || []).map((c) => (
                <span key={c} className="mg-chip bg-muted text-muted-foreground">{c}</span>
              ))}
              {(activePatient?.allergies || []).map((a) => (
                <span key={a} className="mg-chip bg-red-50 text-red-700">Allergy: {a}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/schedule" className="mg-btn-primary h-11 text-sm"><CalendarClock className="h-4 w-4" /> Today’s schedule</Link>
            <Link to="/assistant" className="mg-btn-ghost h-11 text-sm"><Sparkles className="h-4 w-4" /> Ask the assistant</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active medicines" value={meds.length} hint="Prescribed and currently running" icon={Pill} />
        <StatCard label="Doses remaining today" value={remaining.length} hint={`${takenToday} of ${todayLogs.length} already recorded`} icon={Clock} tone="mint" />
        <StatCard label="30-day adherence" value={`${adherence.adherence}%`} hint={`${adherence.taken} taken · ${adherence.missed} missed · ${adherence.unverified} unverified`} icon={Activity} tone="violet" />
        <StatCard label="Safety alerts" value={analysis.total} hint={analysis.counts.high > 0 ? `${analysis.counts.high} high risk — needs a review` : 'No high-risk combination'} icon={ShieldAlert} tone={analysis.counts.high ? 'red' : 'mint'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="mg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-foreground">Today’s medicines</h2>
              <p className="text-[13px] text-muted-foreground">{todayLogs.length} scheduled doses · {remaining.length} still due</p>
            </div>
            <Link to="/schedule" className="text-[13px] font-semibold text-primary hover:underline">Manage</Link>
          </div>
          {todayLogs.length === 0 ? (
            <EmptyState icon={Pill} title="No medicines scheduled today" description="Add a medicine and its timings to build your daily schedule." compact />
          ) : (
            <div className="space-y-2.5">
              {todayLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-2xl border border-border/80 px-3.5 py-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold ${['reviewed', 'video_submitted', 'awaiting_review'].includes(log.status) ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : 'bg-primary/8 text-primary'}`}>
                    {['reviewed', 'video_submitted', 'awaiting_review'].includes(log.status) ? <Check className="h-4 w-4" strokeWidth={3} /> : timeLabel(log.scheduled_time).split(' ')[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-foreground">{log.medication_name}</p>
                    <p className="text-[12.5px] text-muted-foreground">{timeLabel(log.scheduled_time)}</p>
                  </div>
                  <LogStatusPill status={log.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="mg-card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">Safety alerts</h2>
              <Link to="/conflicts" className="text-[13px] font-semibold text-primary hover:underline">Full check</Link>
            </div>
            {analysis.alerts.length === 0 ? (
              <div className="rounded-2xl bg-[hsl(var(--mint))]/8 p-4 text-[13px] text-[hsl(var(--mint))]">
                No interactions found in your current list. Keep it up to date when medicines change.
              </div>
            ) : (
              <div className="space-y-2.5">
                {analysis.alerts.slice(0, 3).map((a) => (
                  <Link to="/conflicts" key={a.id} className="block rounded-2xl border border-border/80 p-3.5 transition hover:border-primary/30">
                    <div className="flex items-center justify-between gap-2">
                      <SeverityBadge severity={a.severity} />
                      <span className="text-[11px] font-medium text-muted-foreground">{a.medicines.join(' + ')}</span>
                    </div>
                    <p className="mt-2 text-[13.5px] font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{a.explanation}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mg-card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">Your care team</h2>
              <Link to="/settings" className="text-[13px] font-semibold text-primary hover:underline">Access</Link>
            </div>
            {links.length === 0 ? (
              <EmptyState icon={Users} title="No caregivers linked" description="Invite a family member from Settings so they can help with your medicines." compact />
            ) : (
              <div className="space-y-2.5">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                      {l.caregiver_name?.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">{l.caregiver_name}</p>
                      <p className="text-[12px] text-muted-foreground">{l.relation}{l.can_view_videos ? ' · can review videos' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="mg-card p-5 sm:p-6">
          <div className="mb-2">
            <h2 className="text-[17px] font-bold text-foreground">Adherence this week</h2>
            <p className="text-[13px] text-muted-foreground">Doses recorded against doses scheduled</p>
          </div>
          <AdherenceChart logs={logs} days={7} />
        </div>

        <div className="space-y-5">
          <div className="mg-card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">Recent records</h2>
              <Link to="/records" className="text-[13px] font-semibold text-primary hover:underline">All records</Link>
            </div>
            <div className="space-y-2.5">
              {records.slice(0, 3).map((r) => (
                <Link key={r.id} to="/records" className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2.5 transition hover:border-primary/30">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{r.title}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">{r.doctor_name || r.hospital} · {shortDate(r.record_date)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
              {records.length === 0 ? <p className="text-[13px] text-muted-foreground">No records uploaded yet.</p> : null}
            </div>
          </div>

          <div className="mg-card flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Droplets className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">Water today</p>
              <p className="text-[12px] text-muted-foreground">{water} ml of 2000 ml goal</p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (water / 2000) * 100)}%` }} />
              </div>
            </div>
            <Link to="/health" className="text-[13px] font-semibold text-primary hover:underline">Log</Link>
          </div>
        </div>
      </div>
    </div>
  );
}