import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  CalendarClock, Plus, Pencil, Trash2, Check, X, Video, Loader2, Clock, ArrowRight, Pill,
} from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { adherenceSummary } from '@/lib/interactionEngine';
import { todayKey, timeLabel, shortDate, daysUntil } from '@/lib/format';
import { notifyCaregivers } from '@/lib/notify';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import AdherenceChart from '@/components/medication/AdherenceChart';
import LogStatusPill from '@/components/medication/LogStatusPill';
import MedicationFormDialog from '@/components/medication/MedicationFormDialog';
import EmptyState from '@/components/common/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function MedicationSchedule() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email;
  const [meds, setMeds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, med: null });
  const [range, setRange] = useState(7);
  const [missTarget, setMissTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const [m, l] = await Promise.all([
        base44.entities.Medication.filter({ patient_email: email, active: true }),
        base44.entities.MedicationLog.filter({ patient_email: email }),
      ]);
      setMeds(m || []);
      setLogs(l || []);
      return { meds: m || [], logs: l || [] };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const data = await load();
      if (!data || !email) return;
      // Create today's dose rows once per medicine/time so the schedule stays live.
      const today = todayKey();
      const existing = new Set(data.logs.filter((l) => l.scheduled_date === today).map((l) => `${l.medication_id}|${l.scheduled_time}`));
      const missing = [];
      data.meds.forEach((m) => {
        (m.times || []).forEach((t) => {
          if (!existing.has(`${m.id}|${t}`)) {
            missing.push({
              patient_email: email,
              medication_id: m.id,
              medication_name: m.name,
              scheduled_date: today,
              scheduled_time: t,
              status: 'scheduled',
            });
          }
        });
      });
      if (missing.length) {
        await base44.entities.MedicationLog.bulkCreate(missing);
        await load();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const today = todayKey();
  const todayLogs = useMemo(
    () => logs.filter((l) => l.scheduled_date === today).sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')),
    [logs, today]
  );
  const stats = useMemo(() => adherenceSummary(logs.filter((l) => l.scheduled_date !== today)), [logs, today]);
  const history = useMemo(
    () => logs.filter((l) => l.scheduled_date !== today).sort((a, b) => `${b.scheduled_date}${b.scheduled_time}`.localeCompare(`${a.scheduled_date}${a.scheduled_time}`)).slice(0, 20),
    [logs, today]
  );

  const setStatus = async (log, status, extra = {}) => {
    setBusyId(log.id);
    try {
      await base44.entities.MedicationLog.update(log.id, { status, taken_at: new Date().toISOString(), ...extra });
      setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, status, ...extra } : l)));
      if (status === 'missed') {
        await notifyCaregivers(email, {
          type: 'medication',
          title: `${activePatient?.full_name || 'Patient'} reported a missed dose`,
          message: `${log.medication_name} at ${timeLabel(log.scheduled_time)} was reported as missed${extra.reported_reason ? `: ${extra.reported_reason}` : ''}.`,
          link: '/schedule',
          severity: 'warning',
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const removeMed = async (med) => {
    await base44.entities.Medication.update(med.id, { active: false });
    setMeds((prev) => prev.filter((m) => m.id !== med.id));
  };

  const submitMissed = async () => {
    if (!missTarget) return;
    await setStatus(missTarget, 'missed', { reported_reason: reason || 'Not taken' });
    setMissTarget(null);
    setReason('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${activePatient?.full_name || 'Patient'} · daily routine`}
        title="Medication schedule"
        subtitle="Add medicines, set reminder times and record each dose as taken, missed or video-verified."
        icon={CalendarClock}
        actions={
          <>
            <Link to="/verification" className="mg-btn-ghost h-11 text-sm"><Video className="h-4 w-4" /> Verify with video</Link>
            <button onClick={() => setDialog({ open: true, med: null })} className="mg-btn-primary h-11 text-sm"><Plus className="h-4 w-4" /> Add medicine</button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active medicines" value={meds.length} hint="In the current prescription list" icon={Pill} />
        <StatCard label="Doses today" value={todayLogs.length} hint={`${todayLogs.filter((l) => ['reviewed', 'video_submitted', 'awaiting_review'].includes(l.status)).length} recorded so far`} icon={Clock} tone="mint" />
        <StatCard label="Adherence" value={`${stats.adherence}%`} hint="Based on recorded history" icon={Check} tone="violet" />
        <StatCard label="Unverified doses" value={stats.unverified} hint="Marked taken without a video" icon={Video} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="mg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-foreground">Today · {shortDate(new Date())}</h2>
            <span className="mg-chip bg-muted text-muted-foreground">{todayLogs.length} doses</span>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading schedule…</p>
          ) : todayLogs.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing scheduled today" description="Add a medicine with reminder times to build today’s schedule." compact />
          ) : (
            <div className="space-y-2.5">
              {todayLogs.map((log) => {
                const done = ['reviewed', 'video_submitted', 'awaiting_review', 'not_verified'].includes(log.status);
                return (
                  <div key={log.id} className="rounded-2xl border border-border/80 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${done ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : 'bg-primary/8 text-primary'}`}>
                        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : timeLabel(log.scheduled_time).split(' ')[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-semibold text-foreground">{log.medication_name}</p>
                        <p className="text-[12px] text-muted-foreground">{timeLabel(log.scheduled_time)}</p>
                      </div>
                      <LogStatusPill status={log.status} />
                    </div>
                    {!done ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-[52px]">
                        <button
                          onClick={() => setStatus(log, 'not_verified')}
                          disabled={busyId === log.id}
                          className="rounded-lg bg-[hsl(var(--mint))]/12 px-2.5 py-1.5 text-[11.5px] font-bold text-[hsl(var(--mint))] transition hover:bg-[hsl(var(--mint))]/20"
                        >
                          Mark as taken
                        </button>
                        <Link to="/verification" className="rounded-lg bg-primary/8 px-2.5 py-1.5 text-[11.5px] font-bold text-primary transition hover:bg-primary/15">
                          Record video
                        </Link>
                        <button
                          onClick={() => setMissTarget(log)}
                          className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11.5px] font-bold text-red-600 transition hover:bg-red-100"
                        >
                          Report missed
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="mg-card p-5 sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">Adherence trend</h2>
              <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                {[7, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRange(d)}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-bold transition ${range === d ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    {d === 7 ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>
            <AdherenceChart logs={logs} days={range} height={200} />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[16px] font-extrabold text-[hsl(var(--mint))]">{stats.taken}</p><p className="text-[11px] text-muted-foreground">Recorded</p></div>
              <div><p className="text-[16px] font-extrabold text-amber-600">{stats.unverified}</p><p className="text-[11px] text-muted-foreground">Unverified</p></div>
              <div><p className="text-[16px] font-extrabold text-red-600">{stats.missed}</p><p className="text-[11px] text-muted-foreground">Missed</p></div>
            </div>
          </div>

          <div className="mg-card p-5">
            <h3 className="text-[15px] font-bold text-foreground">Current medicines</h3>
            <div className="mt-2.5 space-y-2">
              {meds.map((m) => {
                const refillIn = daysUntil(m.refill_date);
                return (
                  <div key={m.id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-foreground">{m.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {m.dosage} · {(m.times || []).map(timeLabel).join(', ') || 'No time set'}
                          {m.prescribed_by ? ` · ${m.prescribed_by}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => setDialog({ open: true, med: m })} className="rounded-lg p-1.5 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeMed(m)} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {refillIn !== null && refillIn <= 7 ? (
                      <Link to="/ordering" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
                        Refill {refillIn <= 0 ? 'overdue' : `in ${refillIn} day${refillIn === 1 ? '' : 's'}`} <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
              {meds.length === 0 ? <p className="text-[13px] text-muted-foreground">No active medicines.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[17px] font-bold text-foreground">Medication history</h2>
          <Link to="/reports" className="text-[13px] font-semibold text-primary hover:underline">Full report</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">Date</th>
                <th className="px-5 py-2.5">Medicine</th>
                <th className="px-5 py-2.5">Time</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[13px]">
              {history.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3 text-muted-foreground">{shortDate(l.scheduled_date)}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{l.medication_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{timeLabel(l.scheduled_time)}</td>
                  <td className="px-5 py-3"><LogStatusPill status={l.status} /></td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">No history yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <MedicationFormDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, med: null })}
        patientEmail={email}
        medication={dialog.med}
        onSaved={load}
      />

      <Dialog open={!!missTarget} onOpenChange={(v) => !v && setMissTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">Report a missed dose</DialogTitle>
            <DialogDescription>{missTarget?.medication_name} · {timeLabel(missTarget?.scheduled_time)}</DialogDescription>
          </DialogHeader>
          <div>
            <label className="mg-label">What happened? (optional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mg-input h-auto py-3" placeholder="Felt unwell, forgot, ran out…" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setMissTarget(null)} className="mg-btn-ghost h-10 text-sm">Cancel</button>
            <button onClick={submitMissed} className="mg-btn h-10 bg-red-600 text-sm text-white">
              <X className="h-4 w-4" /> Report as missed
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}