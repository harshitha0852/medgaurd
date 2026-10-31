import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Stethoscope, ShieldAlert, Video, FileText, ArrowRight, Users, Pill, ChevronRight } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { analyzeMedications } from '@/lib/interactionEngine';
import { calcAge, shortDate, timeLabel } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import SeverityBadge from '@/components/common/SeverityBadge';
import EmptyState from '@/components/common/EmptyState';

export default function ProfessionalDashboard() {
  const { account, patients, activePatient, selectPatient } = useSession();
  const email = activePatient?.account_email;
  const [meds, setMeds] = useState([]);
  const [records, setRecords] = useState([]);
  const [pendingVideos, setPendingVideos] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!email) return;
    let alive = true;
    (async () => {
      const [m, r, v, l] = await Promise.all([
        base44.entities.Medication.filter({ patient_email: email, active: true }),
        base44.entities.MedicalRecord.filter({ patient_email: email }, { sort: '-record_date', limit: 6 }),
        base44.entities.VerificationVideo.filter({ patient_email: email, review_status: 'pending' }),
        base44.entities.CaregiverLink.filter({ patient_email: email }),
      ]);
      if (!alive) return;
      setMeds(m || []);
      setRecords(Array.isArray(r) ? r : r.items || []);
      setPendingVideos(v || []);
      setLinks(l || []);
    })();
    return () => { alive = false; };
  }, [email]);

  const analysis = useMemo(() => analyzeMedications(meds, activePatient), [meds, activePatient]);
  const consented = links.find((l) => l.caregiver_email === account.email && l.status === 'active');

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`${account.specialty || 'Clinician'}${account.hospital ? ` · ${account.hospital}` : ''}`}
        title="Clinician workspace"
        subtitle="Patients who have shared their records with you, with their current medicines and verified safety checks."
        icon={Stethoscope}
        actions={<Link to="/records" className="mg-btn-primary h-11 text-sm"><FileText className="h-4 w-4" /> Open records</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Shared patients" value={patients.length} hint="Consent granted by the patient" icon={Users} />
        <StatCard label="Pending video reviews" value={pendingVideos.length} hint={`For ${activePatient?.full_name || 'the selected patient'}`} icon={Video} tone="amber" />
        <StatCard label="Alerts on this patient" value={analysis.total} hint={`${analysis.counts.high} high risk`} icon={ShieldAlert} tone={analysis.counts.high ? 'red' : 'mint'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="mg-card p-5 sm:p-6">
          <h2 className="mb-3 text-[17px] font-bold text-foreground">Patients</h2>
          <div className="space-y-2">
            {patients.map((p) => {
              const active = p.account_email === activePatient?.account_email;
              return (
                <button
                  key={p.account_email}
                  onClick={() => selectPatient(p.account_email)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-[14px] font-bold text-primary">
                    {p.full_name?.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{p.full_name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {calcAge(p.date_of_birth) ? `${calcAge(p.date_of_birth)}y` : 'Age not set'} · {(p.conditions || []).slice(0, 2).join(', ') || 'No conditions recorded'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
            {patients.length === 0 ? <EmptyState icon={Users} title="No patients yet" description="Patients appear here once they grant your email access to their records." compact /> : null}
          </div>
        </div>

        <div className="space-y-5">
          <div className="mg-card p-5 sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">{activePatient?.full_name || 'Patient'} · medication safety</h2>
              <Link to="/conflicts" className="text-[13px] font-semibold text-primary hover:underline">Full check</Link>
            </div>
            <p className="mb-3 text-[12.5px] text-muted-foreground">
              {consented
                ? `Consent granted ${shortDate(consented.invited_at)} · video sharing ${consented.can_view_videos ? 'enabled' : 'disabled'}`
                : 'Reviewing as a clinician with shared access.'}
            </p>
            {analysis.alerts.length === 0 ? (
              <div className="rounded-2xl bg-[hsl(var(--mint))]/8 p-4 text-[13px] text-[hsl(var(--mint))]">
                No interactions detected across {meds.length} active medicines.
              </div>
            ) : (
              <div className="space-y-2.5">
                {analysis.alerts.slice(0, 4).map((a) => (
                  <div key={a.id} className="rounded-2xl border border-border/80 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <SeverityBadge severity={a.severity} />
                      <span className="truncate text-[11.5px] text-muted-foreground">{a.medicines.join(' + ')}</span>
                    </div>
                    <p className="mt-2 text-[13.5px] font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{a.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-foreground">Current medicines</h3>
              <Link to="/schedule" className="text-[12.5px] font-semibold text-primary hover:underline">Schedule</Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {meds.map((m) => (
                <span key={m.id} className="mg-chip bg-muted text-foreground"><Pill className="h-3 w-3" /> {m.name}</span>
              ))}
              {meds.length === 0 ? <p className="text-[13px] text-muted-foreground">No active medicines.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="mg-card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-foreground">Recent shared records</h2>
            <Link to="/records" className="text-[13px] font-semibold text-primary hover:underline">All</Link>
          </div>
          <div className="space-y-2">
            {records.map((r) => (
              <Link key={r.id} to="/records" className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 transition hover:border-primary/30">
                <FileText className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{r.title}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{r.hospital || r.doctor_name} · {shortDate(r.record_date)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
            {records.length === 0 ? <p className="text-[13px] text-muted-foreground">No records shared.</p> : null}
          </div>
        </div>

        <div className="mg-card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-foreground">Video records awaiting review</h2>
            <Link to="/video-review" className="text-[13px] font-semibold text-primary hover:underline">Review</Link>
          </div>
          <div className="space-y-2">
            {pendingVideos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                <Video className="h-4 w-4 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{v.medication_name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{shortDate(v.scheduled_date)} · {timeLabel(v.scheduled_time)}</p>
                </div>
              </div>
            ))}
            {pendingVideos.length === 0 ? <p className="text-[13px] text-muted-foreground">Nothing pending for this patient.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}