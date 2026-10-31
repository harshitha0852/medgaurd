import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';
import { FileBarChart, Download, Printer, Loader2, ShieldAlert, Check, Video, Pill } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { analyzeMedications, adherenceSummary } from '@/lib/interactionEngine';
import { calcAge, formatDate, timeLabel, todayKey, shortDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import SeverityBadge from '@/components/common/SeverityBadge';

export default function MedicalReports() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!email) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [meds, records, logs, videos, links] = await Promise.all([
          base44.entities.Medication.filter({ patient_email: email, active: true }),
          base44.entities.MedicalRecord.filter({ patient_email: email }, { sort: '-record_date', limit: 50 }),
          base44.entities.MedicationLog.filter({ patient_email: email }),
          base44.entities.VerificationVideo.filter({ patient_email: email }, { sort: '-submitted_at', limit: 20 }),
          base44.entities.CaregiverLink.filter({ patient_email: email, status: 'active' }),
        ]);
        if (!alive) return;
        setData({
          meds: meds || [],
          records: Array.isArray(records) ? records : records.items || [],
          logs: logs || [],
          videos: Array.isArray(videos) ? videos : videos.items || [],
          links: links || [],
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [email]);

  const analysis = useMemo(() => (data ? analyzeMedications(data.meds, activePatient) : null), [data, activePatient]);
  const adherence = useMemo(() => (data ? adherenceSummary(data.logs) : null), [data]);

  const exportPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const M = 48;
      let y = 58;

      const line = (text, opts = {}) => {
        const { size = 10, bold = false, color = [30, 41, 59], gap = 15 } = opts;
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const wrapped = doc.splitTextToSize(String(text || ''), 500);
        wrapped.forEach((w) => {
          if (y > 780) { doc.addPage(); y = 58; }
          doc.text(w, M, y);
          y += gap;
        });
      };

      line('MedGuard — Patient Medical Report', { size: 18, bold: true, color: [21, 96, 168], gap: 22 });
      line(`Generated ${formatDate(new Date())} · prepared for discussion with your care team`, { size: 9, color: [100, 116, 139], gap: 22 });

      line('Patient profile', { size: 13, bold: true, gap: 18 });
      line(`Name: ${activePatient?.full_name || ''}`, { gap: 14 });
      line(`Age: ${calcAge(activePatient?.date_of_birth) || '—'} · Gender: ${activePatient?.gender || '—'} · Blood group: ${activePatient?.blood_group || '—'}`, { gap: 14 });
      line(`Conditions: ${(activePatient?.conditions || []).join(', ') || 'None recorded'}`, { gap: 14 });
      line(`Allergies: ${(activePatient?.allergies || []).join(', ') || 'None recorded'}`, { gap: 14 });
      line(`Emergency contact: ${activePatient?.emergency_contact_name || '—'} ${activePatient?.emergency_contact_phone || ''}`, { gap: 20 });

      line('Current medicines', { size: 13, bold: true, gap: 18 });
      data.meds.forEach((m) => line(`• ${m.name} ${m.dosage || ''} — ${m.frequency || ''} at ${(m.times || []).map(timeLabel).join(', ') || '—'}${m.prescribed_by ? ` (${m.prescribed_by})` : ''}`, { gap: 13 }));
      if (!data.meds.length) line('None recorded', { gap: 13 });
      y += 8;

      line('Interaction & duplicate ingredient alerts', { size: 13, bold: true, gap: 18 });
      if (analysis?.alerts.length) {
        analysis.alerts.forEach((a) => {
          line(`${a.severity.toUpperCase()} — ${a.title} (${a.medicines.join(' + ')})`, { bold: true, gap: 13 });
          line(`Explanation: ${a.explanation}`, { size: 9, gap: 12 });
          line(`Advice: ${a.recommendation}`, { size: 9, gap: 12 });
          line(`Source: ${a.source}`, { size: 8, color: [100, 116, 139], gap: 16 });
        });
      } else {
        line('No known interactions detected across the active medicine list.', { gap: 14 });
      }

      line('Medication adherence', { size: 13, bold: true, gap: 18 });
      line(`Recorded doses: ${adherence.taken} · Unverified: ${adherence.unverified} · Reported missed: ${adherence.missed} · Adherence: ${adherence.adherence}%`, { gap: 20 });

      line('Caregiver verification records', { size: 13, bold: true, gap: 18 });
      data.videos.slice(0, 10).forEach((v) => {
        line(`• ${v.medication_name} on ${shortDate(v.scheduled_date)} at ${timeLabel(v.scheduled_time)} — ${v.review_status === 'reviewed' ? `reviewed by ${v.reviewed_by || 'caregiver'}` : v.review_status === 'flagged' ? 'concern raised' : 'awaiting review'}`, { gap: 13 });
      });
      if (!data.videos.length) line('No verification videos submitted.', { gap: 13 });
      y += 8;

      line('Medical record history', { size: 13, bold: true, gap: 18 });
      data.records.forEach((r) => {
        line(`• ${shortDate(r.record_date)} — ${r.title}${r.doctor_name ? ` · ${r.doctor_name}` : ''}${r.hospital ? ` · ${r.hospital}` : ''}`, { gap: 13 });
        if (r.notes) line(`   ${r.notes}`, { size: 9, color: [80, 90, 105], gap: 14 });
      });
      if (!data.records.length) line('No records uploaded.', { gap: 13 });

      y += 14;
      line('This report is an information summary generated from records the patient has shared. It is not a diagnosis or prescription. Please review it with a qualified doctor or pharmacist.', { size: 8, color: [100, 116, 139] });

      doc.save(`MedGuard-${(activePatient?.full_name || 'patient').replace(/\s+/g, '-')}-${todayKey()}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !data) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Building the report…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Downloadable summary"
        title="Medical reports"
        subtitle="A structured snapshot of the patient’s profile, medicines, safety alerts, adherence and caregiver reviews."
        icon={FileBarChart}
        actions={
          <>
            <button onClick={() => window.print()} className="mg-btn-ghost h-11 text-sm"><Printer className="h-4 w-4" /> Print</button>
            <button onClick={exportPdf} disabled={exporting} className="mg-btn-primary h-11 text-sm">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
            </button>
          </>
        }
      />

      <style>{`@media print { header, aside, footer, .no-print { display: none !important; } main { padding: 0 !important; max-width: none !important; } .print-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; } body { background: white !important; } }`}</style>

      <div className="space-y-5">
        <div className="mg-card print-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mg-eyebrow">MedGuard patient report</p>
              <h2 className="mt-1 text-[21px] font-extrabold text-foreground">{activePatient?.full_name || account.full_name}</h2>
              <p className="text-[13px] text-muted-foreground">
                {calcAge(activePatient?.date_of_birth) ? `${calcAge(activePatient.date_of_birth)} years · ` : ''}
                {activePatient?.gender || '—'} · Blood group {activePatient?.blood_group || '—'}
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground">Generated {formatDate(new Date())}</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Medical conditions</p>
              <p className="mt-1 text-[13px] text-foreground">{(activePatient?.conditions || []).join(', ') || 'None recorded'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Allergies</p>
              <p className="mt-1 text-[13px] text-foreground">{(activePatient?.allergies || []).join(', ') || 'None recorded'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Primary doctor</p>
              <p className="mt-1 text-[13px] text-foreground">{activePatient?.primary_doctor || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Emergency contact</p>
              <p className="mt-1 text-[13px] text-foreground">{activePatient?.emergency_contact_name || '—'} {activePatient?.emergency_contact_phone || ''}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="mg-card print-card p-5">
            <p className="flex items-center gap-2 text-[14px] font-bold text-foreground"><Pill className="h-4 w-4 text-primary" /> Current medicines</p>
            <div className="mt-2 space-y-1.5">
              {data.meds.map((m) => (
                <p key={m.id} className="text-[12.5px] text-foreground">
                  <span className="font-semibold">{m.name}</span> {m.dosage} · {(m.times || []).map(timeLabel).join(', ')}
                </p>
              ))}
              {data.meds.length === 0 ? <p className="text-[12.5px] text-muted-foreground">None recorded</p> : null}
            </div>
          </div>
          <div className="mg-card print-card p-5">
            <p className="flex items-center gap-2 text-[14px] font-bold text-foreground"><Check className="h-4 w-4 text-[hsl(var(--mint))]" /> Adherence</p>
            <p className="mt-2 text-[26px] font-extrabold text-foreground">{adherence.adherence}%</p>
            <p className="text-[12px] text-muted-foreground">{adherence.taken} recorded · {adherence.unverified} unverified · {adherence.missed} missed</p>
          </div>
          <div className="mg-card print-card p-5">
            <p className="flex items-center gap-2 text-[14px] font-bold text-foreground"><Video className="h-4 w-4 text-indigo-600" /> Verification videos</p>
            <p className="mt-2 text-[26px] font-extrabold text-foreground">{data.videos.length}</p>
            <p className="text-[12px] text-muted-foreground">{data.videos.filter((v) => v.review_status === 'reviewed').length} reviewed by caregivers</p>
          </div>
        </div>

        <div className="mg-card print-card p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-foreground"><ShieldAlert className="h-4 w-4 text-red-600" /> Interaction & duplicate ingredient alerts</p>
          <div className="mt-3 space-y-2.5">
            {analysis.alerts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SeverityBadge severity={a.severity} />
                  <span className="text-[11.5px] text-muted-foreground">{a.medicines.join(' + ')}</span>
                </div>
                <p className="mt-2 text-[13.5px] font-semibold text-foreground">{a.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{a.explanation}</p>
                <p className="mt-1 text-[12px] font-medium text-primary">{a.recommendation}</p>
              </div>
            ))}
            {analysis.alerts.length === 0 ? <p className="text-[13px] text-muted-foreground">No interactions detected.</p> : null}
          </div>
        </div>

        <div className="mg-card print-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <p className="text-[15px] font-bold text-foreground">Medical record history</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5">Record</th>
                  <th className="px-5 py-2.5">Doctor / hospital</th>
                  <th className="px-5 py-2.5">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[12.5px]">
                {data.records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(r.record_date)}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{r.title}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.doctor_name || '—'}{r.hospital ? ` · ${r.hospital}` : ''}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.type.replace('_', ' ')}</td>
                  </tr>
                ))}
                {data.records.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">No records yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mg-card print-card p-5 sm:p-6">
          <p className="text-[15px] font-bold text-foreground">Caregiver verification records</p>
          <div className="mt-3 space-y-2">
            {data.videos.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5">
                <span className="text-[13px] font-medium text-foreground">{v.medication_name} · {shortDate(v.scheduled_date)} at {timeLabel(v.scheduled_time)}</span>
                <span className="text-[11.5px] text-muted-foreground">
                  {v.review_status === 'reviewed' ? `Reviewed by ${v.reviewed_by || 'caregiver'}` : v.review_status === 'flagged' ? 'Concern raised' : 'Awaiting review'}
                </span>
              </div>
            ))}
            {data.videos.length === 0 ? <p className="text-[13px] text-muted-foreground">No verification videos yet.</p> : null}
          </div>
        </div>

        <p className="rounded-2xl bg-muted/60 p-4 text-[11.5px] leading-relaxed text-muted-foreground">
          This report summarises records the patient has shared in MedGuard. It is not a diagnosis or a prescription.
          Please review it with a qualified doctor or pharmacist before changing any medicine.
        </p>
      </div>
    </div>
  );
}