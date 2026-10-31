import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  ScanLine, Camera, Upload, Loader2, Check, AlertTriangle, Sparkles, Pill, ShieldAlert, ArrowRight, Trash2,
} from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { analyzeMedications } from '@/lib/interactionEngine';
import { notifyCaregivers } from '@/lib/notify';
import { todayKey } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import SeverityBadge from '@/components/common/SeverityBadge';

const SCHEMA = {
  type: 'object',
  properties: {
    doctor_name: { type: 'string' },
    hospital: { type: 'string' },
    prescription_date: { type: 'string' },
    medicines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          generic_name: { type: 'string' },
          dosage: { type: 'string' },
          frequency: { type: 'string' },
          duration: { type: 'string' },
          purpose: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  required: ['medicines'],
};

const defaultTimes = (frequency = '') => {
  const f = frequency.toLowerCase();
  if (f.includes('thrice') || f.includes('three') || f.includes('3')) return '08:00,14:00,20:00';
  if (f.includes('twice') || f.includes('two') || f.includes('2') || f.includes('bd')) return '08:00,20:00';
  if (f.includes('night') || f.includes('bed')) return '21:00';
  if (f.includes('evening')) return '18:00';
  return '08:00';
};

export default function PrescriptionScanner() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email;
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('capture'); // capture | review | saved
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ doctor_name: '', hospital: '', prescription_date: '' });
  const [fileUri, setFileUri] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  const onPick = (f) => {
    if (!f) return;
    setFile(f);
    setError('');
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    else setPreview('');
  };

  const extract = async () => {
    if (!file) {
      setError('Choose a photo of the prescription first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const upload = await base44.integrations.Core.UploadPrivateFile({ file });
      setFileUri(upload.file_uri);
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: upload.file_uri, expires_in: 900 });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a careful prescription transcription assistant for a medication safety app.
Read the attached prescription image and transcribe ONLY what is clearly legible.
Return each medicine with its name as written, the generic name if printed, dosage, frequency and duration.
If a value is unclear or not written, return an empty string for it.
Never invent a medicine, dose or instruction. Do not add advice or diagnoses.
Also transcribe the prescribing doctor, clinic/hospital and date if visible.`,
        file_urls: [signed_url],
        response_json_schema: SCHEMA,
      });

      const meds = (result?.medicines || []).filter((m) => m.name);
      if (meds.length === 0) {
        setError('No medicines could be read clearly. Try a sharper photo with good lighting and the full prescription in frame.');
        return;
      }
      setMeta({
        doctor_name: result.doctor_name || '',
        hospital: result.hospital || '',
        prescription_date: result.prescription_date || todayKey(),
      });
      setRows(
        meds.map((m, i) => ({
          key: `${i}-${m.name}`,
          selected: true,
          name: m.name,
          generic_name: m.generic_name || '',
          dosage: m.dosage || '',
          frequency: m.frequency || 'Once daily',
          times: defaultTimes(m.frequency),
          duration: m.duration || '',
          purpose: m.purpose || '',
        }))
      );
      setStep('review');
    } catch {
      setError('The prescription could not be read. Please try again with a photo taken in brighter light.');
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);

  const save = async () => {
    if (selectedRows.length === 0) {
      setError('Select at least one medicine to add.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await base44.entities.Medication.bulkCreate(
        selectedRows.map((r) => ({
          patient_email: email,
          name: r.name,
          generic_name: r.generic_name,
          dosage: r.dosage,
          frequency: r.frequency,
          times: r.times.split(',').map((t) => t.trim()).filter(Boolean),
          start_date: todayKey(),
          refill_date: '',
          prescribed_by: meta.doctor_name,
          purpose: r.purpose,
          instructions: r.duration ? `Course: ${r.duration}` : '',
          active: true,
        }))
      );

      await base44.entities.MedicalRecord.create({
        patient_email: email,
        title: `Prescription${meta.doctor_name ? ` — ${meta.doctor_name}` : ''}`,
        type: 'prescription',
        doctor_name: meta.doctor_name,
        hospital: meta.hospital,
        record_date: meta.prescription_date || todayKey(),
        file_uri: fileUri,
        file_name: file?.name || 'prescription.jpg',
        notes: `Added from prescription scan: ${selectedRows.map((r) => r.name).join(', ')}`,
        uploaded_by: account.email,
        shared_with: [],
      });

      const existing = await base44.entities.Medication.filter({ patient_email: email, active: true });
      const analysis = analyzeMedications(existing, activePatient);

      await notifyCaregivers(email, {
        type: 'record',
        title: `New prescription added for ${activePatient?.full_name || 'a patient'}`,
        message: `${selectedRows.length} medicine${selectedRows.length > 1 ? 's' : ''} added from a scanned prescription${analysis.alerts.length ? ` · ${analysis.alerts.length} safety alert${analysis.alerts.length > 1 ? 's' : ''} detected` : ''}.`,
        link: '/records',
        severity: analysis.counts.high ? 'critical' : 'info',
      });

      setSaved({ count: created.length, alerts: analysis.alerts, checked: analysis.checkedAt });
      setStep('saved');
    } catch {
      setError('The medicines could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview('');
    setRows([]);
    setFileUri('');
    setSaved(null);
    setStep('capture');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI prescription scanner"
        title="Scan a prescription"
        subtitle="Photograph a prescription and we will read the medicines out for you to confirm — nothing is saved until you approve it."
        icon={ScanLine}
        actions={<Link to="/schedule" className="mg-btn-ghost h-11 text-sm"><Pill className="h-4 w-4" /> Medication list</Link>}
      />

      {step === 'capture' ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="mg-card p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-8 transition hover:bg-primary/10"
              >
                <Camera className="h-7 w-7 text-primary" />
                <span className="text-[14px] font-bold text-foreground">Take a photo</span>
                <span className="text-[11.5px] text-muted-foreground">Opens your camera</span>
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-8 transition hover:border-primary/40"
              >
                <Upload className="h-7 w-7 text-muted-foreground" />
                <span className="text-[14px] font-bold text-foreground">Upload a file</span>
                <span className="text-[11.5px] text-muted-foreground">JPG, PNG or PDF</span>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
            <input ref={galleryRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />

            {file ? (
              <div className="mt-5">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5">
                  <span className="truncate text-[13px] font-semibold text-foreground">{file.name}</span>
                  <button onClick={reset} className="rounded-lg p-1 text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                {preview ? (
                  <img src={preview} alt="Prescription preview" className="mt-3 max-h-[320px] w-full rounded-2xl border border-border object-contain" />
                ) : null}
                <button onClick={extract} disabled={busy} className="mg-btn-primary mt-4 w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {busy ? 'Reading your prescription…' : 'Read medicines from this prescription'}
                </button>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
                Tip: place the prescription on a flat surface in bright light and include the whole page.
                Extraction works best with printed prescriptions. Handwriting may need corrections — you can edit everything before saving.
              </p>
            )}

            {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{error}</p> : null}
          </div>

          <div className="mg-card p-5 sm:p-6">
            <h3 className="text-[15px] font-bold text-foreground">What happens next</h3>
            <div className="mt-4 space-y-3.5">
              {[
                { icon: ScanLine, t: 'Text is read from the image', d: 'An OCR model transcribes medicine names, dosage and timing.' },
                { icon: Check, t: 'You confirm each medicine', d: 'Correct anything the scanner misread before saving.' },
                { icon: ShieldAlert, t: 'Safety check runs automatically', d: 'New medicines are checked against your full list for interactions.' },
              ].map((s) => (
                <div key={s.t} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><s.icon className="h-4 w-4" /></span>
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">{s.t}</p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
              AI extraction can make mistakes. MedGuard always asks you to confirm before a medicine enters your record.
            </p>
          </div>
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="space-y-5">
          <div className="mg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold text-foreground">Confirm the extracted medicines</h2>
                <p className="text-[13px] text-muted-foreground">Check each row, fix any mistakes, then add them to the medication list.</p>
              </div>
              <button onClick={reset} className="mg-btn-ghost h-10 text-sm">Scan another</button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mg-label">Prescribing doctor</label>
                <input value={meta.doctor_name} onChange={(e) => setMeta({ ...meta, doctor_name: e.target.value })} className="mg-input" placeholder="Dr. …" />
              </div>
              <div>
                <label className="mg-label">Hospital / clinic</label>
                <input value={meta.hospital} onChange={(e) => setMeta({ ...meta, hospital: e.target.value })} className="mg-input" placeholder="Clinic name" />
              </div>
              <div>
                <label className="mg-label">Prescription date</label>
                <input type="date" value={meta.prescription_date} onChange={(e) => setMeta({ ...meta, prescription_date: e.target.value })} className="mg-input" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.key} className={`mg-card p-4 sm:p-5 ${r.selected ? '' : 'opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={r.selected} onChange={(e) => updateRow(r.key, 'selected', e.target.checked)} className="mt-3 h-4 w-4 accent-[hsl(var(--primary))]" />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mg-label">Medicine name</label>
                      <input value={r.name} onChange={(e) => updateRow(r.key, 'name', e.target.value)} className="mg-input" />
                    </div>
                    <div>
                      <label className="mg-label">Generic / ingredient</label>
                      <input value={r.generic_name} onChange={(e) => updateRow(r.key, 'generic_name', e.target.value)} className="mg-input" placeholder="e.g. metformin" />
                    </div>
                    <div>
                      <label className="mg-label">Dosage</label>
                      <input value={r.dosage} onChange={(e) => updateRow(r.key, 'dosage', e.target.value)} className="mg-input" placeholder="500 mg" />
                    </div>
                    <div>
                      <label className="mg-label">Frequency</label>
                      <input value={r.frequency} onChange={(e) => updateRow(r.key, 'frequency', e.target.value)} className="mg-input" placeholder="Twice daily" />
                    </div>
                    <div>
                      <label className="mg-label">Reminder times</label>
                      <input value={r.times} onChange={(e) => updateRow(r.key, 'times', e.target.value)} className="mg-input" placeholder="08:00,20:00" />
                    </div>
                    <div>
                      <label className="mg-label">Duration / purpose</label>
                      <input value={r.duration} onChange={(e) => updateRow(r.key, 'duration', e.target.value)} className="mg-input" placeholder="5 days" />
                    </div>
                  </div>
                  <button onClick={() => removeRow(r.key)} className="mt-2 rounded-lg p-1.5 text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{error}</p> : null}

          <div className="mg-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedRows.length}</span> medicine{selectedRows.length === 1 ? '' : 's'} will be added to {activePatient?.full_name || 'the patient'}’s list, with the prescription stored as a record.
            </p>
            <button onClick={save} disabled={busy} className="mg-btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {busy ? 'Saving…' : 'Confirm and add medicines'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'saved' && saved ? (
        <div className="mg-card p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]"><Check className="h-5 w-5" strokeWidth={3} /></span>
            <div>
              <h2 className="text-[18px] font-bold text-foreground">{saved.count} medicine{saved.count === 1 ? '' : 's'} added</h2>
              <p className="text-[13px] text-muted-foreground">The prescription is saved in medical records and your caregivers have been notified.</p>
            </div>
          </div>

          {saved.alerts.length > 0 ? (
            <div className="mt-5 space-y-2.5">
              <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground"><AlertTriangle className="h-4 w-4 text-amber-600" /> Safety check found {saved.alerts.length} item{saved.alerts.length > 1 ? 's' : ''} to review</p>
              {saved.alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-2xl border border-border p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="truncate text-[11.5px] text-muted-foreground">{a.medicines.join(' + ')}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-semibold text-foreground">{a.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[hsl(var(--mint))]/8 p-4 text-[13px] text-[hsl(var(--mint))]">
              No interactions found between the new medicines and the existing list.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/conflicts" className="mg-btn-primary h-11 text-sm">Review all alerts <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/schedule" className="mg-btn-ghost h-11 text-sm">Set reminder times</Link>
            <button onClick={reset} className="mg-btn-ghost h-11 text-sm">Scan another prescription</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}