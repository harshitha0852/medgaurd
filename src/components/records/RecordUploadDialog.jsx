import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const TYPES = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab / diagnostic report' },
  { value: 'consultation', label: 'Consultation note' },
  { value: 'imaging', label: 'Scan / imaging' },
  { value: 'discharge', label: 'Discharge summary' },
  { value: 'other', label: 'Other document' },
];

export default function RecordUploadDialog({ open, onClose, patientEmail, uploaderEmail, onSaved }) {
  const [form, setForm] = useState({
    title: '', type: 'prescription', doctor_name: '', hospital: '', specialty: '',
    record_date: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Give this record a short title.');
    setBusy(true);
    try {
      let file_uri = '';
      if (file) {
        const res = await base44.integrations.Core.UploadPrivateFile({ file });
        file_uri = res.file_uri;
      }
      await base44.entities.MedicalRecord.create({
        patient_email: patientEmail,
        ...form,
        file_uri,
        file_name: file?.name || '',
        uploaded_by: uploaderEmail,
        shared_with: [],
      });
      setForm({ title: '', type: 'prescription', doctor_name: '', hospital: '', specialty: '', record_date: new Date().toISOString().slice(0, 10), notes: '' });
      setFile(null);
      onSaved?.();
      onClose();
    } catch {
      setError('The record could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-bold">Add a medical record</DialogTitle>
          <DialogDescription>
            Upload a prescription, report or note from any doctor, hospital or therapist. Files are stored privately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-3.5">
          <div>
            <label className="mg-label">Record title</label>
            <input value={form.title} onChange={set('title')} className="mg-input" placeholder="e.g. Cardiology follow-up" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mg-label">Record type</label>
              <select value={form.type} onChange={set('type')} className="mg-input">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mg-label">Date</label>
              <input type="date" value={form.record_date} onChange={set('record_date')} className="mg-input" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mg-label">Doctor</label>
              <input value={form.doctor_name} onChange={set('doctor_name')} className="mg-input" placeholder="Dr. Mehta" />
            </div>
            <div>
              <label className="mg-label">Hospital / clinic</label>
              <input value={form.hospital} onChange={set('hospital')} className="mg-input" placeholder="Apollo Hospital" />
            </div>
          </div>
          <div>
            <label className="mg-label">Speciality</label>
            <input value={form.specialty} onChange={set('specialty')} className="mg-input" placeholder="Cardiology" />
          </div>
          <div>
            <label className="mg-label">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} className="mg-input h-auto py-3" placeholder="What did the doctor advise?" />
          </div>

          <div>
            <label className="mg-label">Attach file (PDF or photo)</label>
            {file ? (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5">
                <span className="truncate text-[13px] font-medium text-foreground">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="rounded-lg p-1 text-muted-foreground hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition hover:border-primary/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground">Choose a file</span>
                <span className="text-[11.5px] text-muted-foreground">PDF, JPG or PNG · stored privately</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          {error ? <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="mg-btn-ghost h-11 text-sm">Cancel</button>
            <button type="submit" disabled={busy} className="mg-btn-primary h-11 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? 'Saving…' : 'Save record'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}