import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Video, ShieldAlert, Activity, CalendarClock, ArrowRight, Check, Clock, FileText } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { analyzeMedications, adherenceSummary } from '@/lib/interactionEngine';
import { calcAge, todayKey, timeLabel, shortDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import SeverityBadge from '@/components/common/SeverityBadge';
import AdherenceChart from '@/components/medication/AdherenceChart';
import LogStatusPill from '@/components/medication/LogStatusPill';
import EmptyState from '@/components/common/EmptyState';

export default function CaregiverDashboard() {
  const { account, patients, activePatient, selectPatient, refreshPatients } = useSession();
  const email = activePatient?.account_email;
  const [meds, setMeds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [records, setRecords] = useState([]);
  const [links, setLinks] = useState([]);
  const [invites, setInvites] = useState([]);

  const loadInvites = async () => {
    const res = await base44.entities.CaregiverLink.filter({ caregiver_email: account.email, status: 'pending' });
    setInvites(res || []);
  };

  useEffect(() => { loadInvites(); /* eslint-disable-next-line */ }, [account.email]);

  const respondInvite = async (invite, accept) => {
    await base44.entities.CaregiverLink.update(invite.id, { status: accept ? 'active' : 'revoked' });
    await loadInvites();
    if (accept) await refreshPatients();
  };

  useEffect(() => {
    if (!email) return;
    let alive = true;
    (async () => {
      const [m, l, v, r, c] = await Promise.all([
        base44.entities.Medication.filter({ patient_email: email, active: true }),
        base44.entities.MedicationLog.filter({ patient_email: email }),
        base44.entities.VerificationVideo.filter({ patient_email: email }),
        base44.entities.MedicalRecord.filter({ patient_email: email }, { sort: '-record_date', limit: 5 }),
        base44.entities.CaregiverLink.filter({ patient_email: email, status: 'active' }),
      ]);
      if (!alive) return;
      setMeds(m || []);
      setLogs(l || []);
      setVideos(v || []);
      setRecords(Array.isArray(r) ? r : r.items || []);
      setLinks(c || []);
    })();
    return () => { alive = false; };
  }, [email]);

  const today = todayKey();
  const todayLogs = useMemo(() => logs.filter((l) => l.scheduled_date === today), [logs, today]);
  const takenToday = todayLogs.filter((l) => ['reviewed', 'video_submitted', 'awaiting_review'].includes(l.status)).length;
  const adherence = useMemo(() => adherenceSummary(logs), [logs]);
  const analysis = useMemo(() => analyzeMedications(meds, activePatient), [meds, activePatient]);
  const pendingVideos = videos.filter((v) => v.review_status === 'pending');
  const missedWeek = logs.filter((l) => {
    if (l.status !== 'missed') return false;
    const d = new Date(l.scheduled_date);
    return (Date.now() - d.getTime()) / 86400000 <= 7;
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`${account.full_name} · caregiver`}
        title="Care overview"
        subtitle="Everything the people you care for have shared with you — records, schedules, alerts and medication videos."
        icon={Users}
        actions={<Link to="/video-review" className="mg-btn-primary h-11 text-sm"><Video className="h-4 w-4" /> Review videos</Link>}
      />

      {invites.length > 0 ? (
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div>
                <p className="text-[13.5px] font-bold text-foreground">Access invitation from {inv.patient_email}</p>
                <p className="text-[12px] text-muted-foreground">Accept to view their records, schedules and medication videos as their {inv.relation?.toLowerCase() || 'caregiver'}.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => respondInvite(inv, false)} className="mg-btn-ghost h-9 text-[12.5px]">Decline</button>
                <button onClick={() => respondInvite(inv, true)} className="mg-btn-primary h-9 px-3 text-[12.5px]"><Check className="h-3.5 w-3.5" /> Accept access</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients linked yet"
          description="Ask the patient to invite your email from their Settings & privacy page. Once they approve, their records appear here."
          action={<Link to="/settings" className="mg-btn-primary h-11 text-sm">Manage access</Link>}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {patients.map((p) => {
              const isActive = p.account_email === activePatient?.account_email;
              return (
                <button
                  key={p.account_email}
                  onClick={() => selectPatient(p.account_email)}
                  className={`mg-card mg-card-hover p-4 text-left transition ${isActive ? 'border-primary ring-2 ring-primary/10' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-[15px] font-bold text-primary">
                      {p.full_name?.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-foreground">{p.full_name}</p>
                      <p className="text-[12px] text-muted-foreground">{calcAge(p.date_of_birth) ? `${calcAge(p.date_of_birth)} years` : 'Age not set'} · {p.account_email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(p.conditions || []).slice(0, 2).map((c) => (
                      <span key={c} className="mg-chip bg-muted text-muted-foreground">{c}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Videos to review" value={pendingVideos.length} hint="Submitted by the patient" icon={Video} tone={pendingVideos.length ? 'amber' : 'mint'} />
            <StatCard label="Doses recorded today" value={`${takenToday}/${todayLogs.length}`} hint="Taken or awaiting your review" icon={Check} tone="mint" />
            <StatCard label="30-day adherence" value={`${adherence.adherence}%`} hint={`${adherence.unverified} doses unverified`} icon={Activity} tone="violet" />
            <StatCard label="High-risk alerts" value={analysis.counts.high} hint={`${analysis.total} alerts across ${meds.length} medicines`} icon={ShieldAlert} tone={analysis.counts.high ? 'red' : 'mint'} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="mg-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-foreground">Needs your attention</h2>
                <Link to="/video-review" className="text-[13px] font-semibold text-primary hover:underline">Open review</Link>
              </div>
              <div className="space-y-2.5">
                {pendingVideos.slice(0, 3).map((v) => (
                  <Link key={v.id} to="/video-review" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 transition hover:border-amber-300">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-600"><Video className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">{v.medication_name}</p>
                      <p className="text-[12px] text-muted-foreground">{shortDate(v.scheduled_date)} · {timeLabel(v.scheduled_time)} · awaiting review</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                  </Link>
                ))}
                {analysis.alerts.filter((a) => a.severity === 'high').slice(0, 2).map((a) => (
                  <Link key={a.id} to="/conflicts" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-3.5 transition hover:border-red-300">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-600"><ShieldAlert className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-foreground">{a.title}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{a.medicines.join(' + ')}</p>
                    </div>
                    <SeverityBadge severity="high" />
                  </Link>
                ))}
                {missedWeek.slice(0, 2).map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600"><Clock className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">{l.medication_name} reported missed</p>
                      <p className="text-[12px] text-muted-foreground">{shortDate(l.scheduled_date)} · {l.reported_reason || 'No reason given'}</p>
                    </div>
                    <LogStatusPill status={l.status} />
                  </div>
                ))}
                {pendingVideos.length === 0 && analysis.counts.high === 0 && missedWeek.length === 0 ? (
                  <div className="rounded-2xl bg-[hsl(var(--mint))]/8 p-4 text-[13px] text-[hsl(var(--mint))]">
                    Nothing needs your attention right now — all recent doses are recorded and no high-risk combinations are active.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              <div className="mg-card p-5 sm:p-6">
                <h2 className="mb-2 text-[17px] font-bold text-foreground">Adherence this week</h2>
                <AdherenceChart logs={logs} days={7} height={210} />
              </div>
              <div className="mg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-foreground">Authorised people</h3>
                  <Link to="/settings" className="text-[12.5px] font-semibold text-primary hover:underline">Manage</Link>
                </div>
                <div className="space-y-2">
                  {links.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-[13px]">
                      <span className="truncate font-medium text-foreground">{l.caregiver_name} <span className="text-muted-foreground">· {l.relation}</span></span>
                      <span className="mg-chip bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="mg-card p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-foreground">Today’s schedule</h2>
                <Link to="/schedule" className="text-[13px] font-semibold text-primary hover:underline">Open schedule</Link>
              </div>
              <div className="space-y-2">
                {todayLogs.sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')).map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <p className="flex-1 truncate text-[13.5px] font-medium text-foreground">{l.medication_name}</p>
                    <span className="text-[12px] text-muted-foreground">{timeLabel(l.scheduled_time)}</span>
                    <LogStatusPill status={l.status} />
                  </div>
                ))}
                {todayLogs.length === 0 ? <p className="text-[13px] text-muted-foreground">No medicines scheduled today.</p> : null}
              </div>
            </div>

            <div className="mg-card p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-foreground">Shared medical records</h2>
                <Link to="/records" className="text-[13px] font-semibold text-primary hover:underline">All records</Link>
              </div>
              <div className="space-y-2">
                {records.map((r) => (
                  <Link key={r.id} to="/records" className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 transition hover:border-primary/30">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-foreground">{r.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">{r.doctor_name || r.hospital} · {shortDate(r.record_date)}</p>
                    </div>
                  </Link>
                ))}
                {records.length === 0 ? <p className="text-[13px] text-muted-foreground">No records shared yet.</p> : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}