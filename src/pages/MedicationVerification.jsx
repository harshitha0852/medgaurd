import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, ShieldCheck, Video, Clock, Check, AlertTriangle, Loader2, Lock } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { todayKey, timeLabel, shortDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import LogStatusPill from '@/components/medication/LogStatusPill';
import VideoRecorder from '@/components/medication/VideoRecorder';
import EmptyState from '@/components/common/EmptyState';

const STATUS_FLOW = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'reminder_sent', label: 'Reminder sent' },
  { key: 'video_submitted', label: 'Video submitted' },
  { key: 'awaiting_review', label: 'Awaiting review' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'not_verified', label: 'Not verified' },
  { key: 'missed', label: 'Reported missed' },
];

export default function MedicationVerification() {
  const { account, activePatient, refreshPatients } = useSession();
  const email = activePatient?.account_email;
  const [meds, setMeds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [enabling, setEnabling] = useState(false);

  const load = async () => {
    if (!email) return;
    const [m, l, v] = await Promise.all([
      base44.entities.Medication.filter({ patient_email: email, active: true }),
      base44.entities.MedicationLog.filter({ patient_email: email }),
      base44.entities.VerificationVideo.filter({ patient_email: email }, { sort: '-submitted_at', limit: 30 }),
    ]);
    setMeds(m || []);
    setLogs(l || []);
    setVideos(Array.isArray(v) ? v : v.items || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [email]);

  const today = todayKey();
  const todayLogs = useMemo(
    () => logs.filter((l) => l.scheduled_date === today).sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')),
    [logs, today]
  );
  const selected = todayLogs.find((l) => l.id === selectedId) || todayLogs.find((l) => ['scheduled', 'reminder_sent', 'not_verified'].includes(l.status)) || todayLogs[0];
  const selectedMed = meds.find((m) => m.id === selected?.medication_id);

  const enableConsent = async () => {
    setEnabling(true);
    try {
      await base44.entities.PatientProfile.update(activePatient.id, { video_consent: true });
      await refreshPatients();
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Smart medication verification"
        title="Confirm a dose with a short video"
        subtitle="Only when you choose to: record a few seconds showing you taking your medicine, then your caregiver reviews it."
        icon={Camera}
      />

      <div className="mg-card p-4 sm:p-5">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Verification statuses</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FLOW.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="mg-chip bg-muted text-muted-foreground">{s.label}</span>
              {i < STATUS_FLOW.length - 1 ? <span className="text-border">→</span> : null}
            </span>
          ))}
        </div>
      </div>

      {!activePatient?.video_consent ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-amber-900">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Video verification is switched off. Nothing is recorded and the camera stays closed until consent is given.
          </p>
          <button onClick={enableConsent} disabled={enabling} className="mg-btn-primary mt-3 h-10 text-sm">
            {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Enable video verification
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="mg-card p-5">
            <h2 className="mb-3 text-[17px] font-bold text-foreground">Choose the dose to record</h2>
            <div className="space-y-2">
              {todayLogs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    selected?.id === l.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-bold text-primary ring-1 ring-border">
                    {timeLabel(l.scheduled_time).split(' ')[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{l.medication_name}</p>
                    <p className="text-[11.5px] text-muted-foreground">{timeLabel(l.scheduled_time)}</p>
                  </div>
                  <LogStatusPill status={l.status} />
                </button>
              ))}
              {todayLogs.length === 0 ? (
                <EmptyState icon={Clock} title="No doses scheduled today" description="Add a medicine with reminder times first." compact />
              ) : null}
            </div>
          </div>

          <div className="mg-card p-5">
            <h3 className="text-[15px] font-bold text-foreground">Recent verification videos</h3>
            <div className="mt-2.5 space-y-2">
              {videos.slice(0, 6).map((v) => (
                <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-2.5">
                  <Video className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{v.medication_name}</p>
                    <p className="text-[11px] text-muted-foreground">{shortDate(v.scheduled_date)} · {timeLabel(v.scheduled_time)}</p>
                  </div>
                  <span className={`mg-chip ${v.review_status === 'reviewed' ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : v.review_status === 'flagged' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                    {v.review_status === 'reviewed' ? 'Reviewed' : v.review_status === 'flagged' ? 'Concern raised' : 'Awaiting review'}
                  </span>
                </div>
              ))}
              {videos.length === 0 ? <p className="text-[13px] text-muted-foreground">No videos submitted yet.</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <div className="mg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recording for</p>
                    <p className="text-[17px] font-bold text-foreground">{selected.medication_name}</p>
                    <p className="text-[12.5px] text-muted-foreground">{timeLabel(selected.scheduled_time)} · {selectedMed?.dosage || ''}</p>
                  </div>
                  <LogStatusPill status={selected.status} />
                </div>
              </div>

              {activePatient?.video_consent ? (
                <VideoRecorder
                  patient={activePatient}
                  medication={selectedMed || { name: selected.medication_name }}
                  log={selected}
                  onSubmitted={load}
                />
              ) : (
                <div className="mg-card p-6 text-center text-[13px] text-muted-foreground">
                  Turn on video verification above to record this dose.
                </div>
              )}

              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  If you could not take the medicine, report it honestly from the medication schedule. A missing video is
                  shown as “not verified”, never automatically as missed.
                </p>
              </div>
            </>
          ) : (
            <EmptyState icon={Check} title="Nothing to verify yet" description="Once a dose is scheduled for today you can record a verification video here." />
          )}
        </div>
      </div>
    </div>
  );
}