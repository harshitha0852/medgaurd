import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserRound, Save, Loader2, Check, Phone, MapPin, Stethoscope, AlertTriangle } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { calcAge } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';

const empty = {
  full_name: '', date_of_birth: '', gender: 'Male', blood_group: '', height_cm: '', weight_kg: '',
  allergies: '', conditions: '', emergency_contact_name: '', emergency_contact_phone: '',
  primary_doctor: '', address: '', notes: '',
};

export default function PatientProfile() {
  const { account, activePatient, refreshPatients } = useSession();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activePatient) return;
    setForm({
      full_name: activePatient.full_name || '',
      date_of_birth: activePatient.date_of_birth || '',
      gender: activePatient.gender || 'Male',
      blood_group: activePatient.blood_group || '',
      height_cm: activePatient.height_cm || '',
      weight_kg: activePatient.weight_kg || '',
      allergies: (activePatient.allergies || []).join(', '),
      conditions: (activePatient.conditions || []).join(', '),
      emergency_contact_name: activePatient.emergency_contact_name || '',
      emergency_contact_phone: activePatient.emergency_contact_phone || '',
      primary_doctor: activePatient.primary_doctor || '',
      address: activePatient.address || '',
      notes: activePatient.notes || '',
    });
  }, [activePatient?.id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    setBusy(true);
    try {
      await base44.entities.PatientProfile.update(activePatient.id, {
        ...form,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: form.conditions.split(',').map((s) => s.trim()).filter(Boolean),
      });
      await refreshPatients();
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  const age = calcAge(form.date_of_birth);
  const bmi = form.height_cm && form.weight_kg
    ? (Number(form.weight_kg) / ((Number(form.height_cm) / 100) ** 2)).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Patient profile"
        title={activePatient?.full_name || 'Patient profile'}
        subtitle="Basic medical information used for safety checks and reports. Keep allergies and conditions up to date."
        icon={UserRound}
        actions={saved ? <span className="mg-chip bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]"><Check className="h-3.5 w-3.5" /> Saved</span> : null}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <form onSubmit={submit} className="mg-card p-5 sm:p-6">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mg-label">Full name</label>
              <input value={form.full_name} onChange={set('full_name')} className="mg-input" />
            </div>
            <div>
              <label className="mg-label">Date of birth</label>
              <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className="mg-input" />
            </div>
            <div>
              <label className="mg-label">Gender</label>
              <select value={form.gender} onChange={set('gender')} className="mg-input">
                {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="mg-label">Blood group</label>
              <input value={form.blood_group} onChange={set('blood_group')} className="mg-input" placeholder="B+" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mg-label">Height (cm)</label>
                <input type="number" value={form.height_cm} onChange={set('height_cm')} className="mg-input" placeholder="168" />
              </div>
              <div>
                <label className="mg-label">Weight (kg)</label>
                <input type="number" step="0.1" value={form.weight_kg} onChange={set('weight_kg')} className="mg-input" placeholder="71.4" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mg-label">Allergies (separate with commas)</label>
              <input value={form.allergies} onChange={set('allergies')} className="mg-input" placeholder="Penicillin, Aspirin" />
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> These are checked against every medicine during safety analysis.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="mg-label">Medical conditions (separate with commas)</label>
              <input value={form.conditions} onChange={set('conditions')} className="mg-input" placeholder="Type 2 Diabetes, Hypertension" />
            </div>
            <div>
              <label className="mg-label">Emergency contact name</label>
              <input value={form.emergency_contact_name} onChange={set('emergency_contact_name')} className="mg-input" placeholder="Priya Kumar (Daughter)" />
            </div>
            <div>
              <label className="mg-label">Emergency contact phone</label>
              <input value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} className="mg-input" placeholder="+91 …" />
            </div>
            <div className="sm:col-span-2">
              <label className="mg-label">Primary doctor</label>
              <input value={form.primary_doctor} onChange={set('primary_doctor')} className="mg-input" placeholder="Dr. Ananya Sharma" />
            </div>
            <div className="sm:col-span-2">
              <label className="mg-label">Address</label>
              <input value={form.address} onChange={set('address')} className="mg-input" placeholder="Street, area, city" />
            </div>
            <div className="sm:col-span-2">
              <label className="mg-label">Care notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3} className="mg-input h-auto py-3" placeholder="Hearing difficulty, language preference, mobility notes…" />
            </div>
          </div>
          <button type="submit" disabled={busy} className="mg-btn-primary mt-5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <div className="space-y-5">
          <div className="mg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">At a glance</p>
            <p className="mt-3 text-[22px] font-extrabold text-foreground">{form.full_name || '—'}</p>
            <div className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
              <p>Age: <span className="font-semibold text-foreground">{age ?? '—'}</span></p>
              <p>Blood group: <span className="font-semibold text-foreground">{form.blood_group || '—'}</span></p>
              {bmi ? <p>BMI: <span className="font-semibold text-foreground">{bmi}</span></p> : null}
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {form.emergency_contact_phone || 'No emergency number'}</p>
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {form.address || 'No address saved'}</p>
              <p className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> {form.primary_doctor || 'No primary doctor'}</p>
            </div>
          </div>
          <div className="mg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Signed in as</p>
            <p className="mt-2 text-[14px] font-semibold text-foreground">{account.full_name}</p>
            <p className="text-[12.5px] text-muted-foreground">{account.email} · {account.role}</p>
            {account.role === 'patient' ? null : (
              <p className="mt-3 rounded-xl bg-muted/60 p-3 text-[12px] leading-relaxed text-muted-foreground">
                You are viewing {activePatient?.full_name}’s profile through shared access. Changes are visible to the patient.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}