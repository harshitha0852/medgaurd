import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { todayKey } from '@/lib/format';

export default function MedicationFormDialog({ open, onClose, patientEmail, medication, onSaved }) {
  const [form, setForm] = useState({
    name: '', generic_name: '', dosage: '', form: 'Tablet', frequency: 'Once daily',
    times: '08:00', start_date: todayKey(), refill_date: '', prescribed_by: '', purpose: '', instructions: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (medication) {
      setForm({
        name: medication.name || '',
        generic_name: medication.generic_name || '',
        dosage: medication.dosage || '',
        form: medication.form || 'Tablet',
        frequency: medication.frequency || 'Once daily',
        times: (medication.times || []).join(', ') || '08:00',
        start_date: medication.start_date || todayKey(),
        refill_date: medication.refill_date || '',
        prescribed_by: medication.prescribed_by || '',
        purpose: medication.purpose || '',
        instructions: medication.instructions || '',
      });
    } else {
      setForm({ name: '', generic_name: '', dosage: '', form: 'Tablet', frequency: 'Once daily', times: '08:00', start_date: todayKey(), refill_date: '', prescribed_by: '', purpose: '', instructions: '' });
    }
    setError('');
  }, [medication, open]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Enter the medicine name.');
    const times = form.times.split(',').map((t) => t.trim()).filter(Boolean);
    if (times.length === 0) return setError('Add at least one reminder time, like 08:00.');
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, patient_email: patientEmail, times, active: true };
      if (medication) await base44.entities.Medication.update(medication.id, payload);
      else await base44.entities.Medication.create(payload);
      onSaved?.();
      onClose();
    } catch {
      setError('The medicine could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-bold">{medication ? 'Edit medicine' : 'Add a medicine'}</DialogTitle>
          <DialogDescription>Set the dose and reminder times so it appears on the daily schedule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mg-label">Medicine name</label>
              <input value={form.name} onChange={set('name')} className="mg-input" placeholder="e.g. Metformin 500" />
            </div>
            <div>
              <label className="mg-label">Generic / active ingredient</label>
              <input value={form.generic_name} onChange={set('generic_name')} className="mg-input" placeholder="e.g. metformin" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mg-label">Dosage</label>
              <input value={form.dosage} onChange={set('dosage')} className="mg-input" placeholder="500 mg" />
            </div>
            <div>
              <label className="mg-label">Form</label>
              <select value={form.form} onChange={set('form')} className="mg-input">
                {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Drops', 'Sachet', 'Cream'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="mg-label">Frequency</label>
              <input value={form.frequency} onChange={set('frequency')} className="mg-input" placeholder="Twice daily" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mg-label">Reminder times (24-hour)</label>
              <input value={form.times} onChange={set('times')} className="mg-input" placeholder="08:00, 20:00" />
            </div>
            <div>
              <label className="mg-label">Prescribed by</label>
              <input value={form.prescribed_by} onChange={set('prescribed_by')} className="mg-input" placeholder="Dr. …" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mg-label">Started on</label>
              <input type="date" value={form.start_date} onChange={set('start_date')} className="mg-input" />
            </div>
            <div>
              <label className="mg-label">Next refill due</label>
              <input type="date" value={form.refill_date} onChange={set('refill_date')} className="mg-input" />
            </div>
          </div>
          <div>
            <label className="mg-label">What is it for?</label>
            <input value={form.purpose} onChange={set('purpose')} className="mg-input" placeholder="Blood sugar control" />
          </div>
          <div>
            <label className="mg-label">Instructions</label>
            <textarea value={form.instructions} onChange={set('instructions')} rows={2} className="mg-input h-auto py-3" placeholder="Take with food…" />
          </div>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="mg-btn-ghost h-11 text-sm">Cancel</button>
            <button type="submit" disabled={busy} className="mg-btn-primary h-11 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {busy ? 'Saving…' : 'Save medicine'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}