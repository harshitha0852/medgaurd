import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  FileText, Search, Plus, Share2, ExternalLink, Trash2, Loader2, Stethoscope, FlaskConical,
  ScanLine, ClipboardList, FileStack, UserRound, Calendar,
} from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { shortDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import RecordUploadDialog from '@/components/records/RecordUploadDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const TYPE_META = {
  prescription: { label: 'Prescription', icon: ClipboardList, tone: 'bg-primary/8 text-primary' },
  lab_report: { label: 'Lab report', icon: FlaskConical, tone: 'bg-violet-50 text-violet-600' },
  consultation: { label: 'Consultation', icon: Stethoscope, tone: 'bg-sky-50 text-sky-600' },
  imaging: { label: 'Imaging', icon: ScanLine, tone: 'bg-amber-50 text-amber-700' },
  discharge: { label: 'Discharge', icon: FileStack, tone: 'bg-rose-50 text-rose-600' },
  other: { label: 'Document', icon: FileText, tone: 'bg-slate-100 text-slate-600' },
};

const FILTERS = [
  { value: 'all', label: 'All records' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'lab_report', label: 'Lab reports' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'discharge', label: 'Discharge' },
];

export default function MedicalRecords() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email;
  const [records, setRecords] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [shareWith, setShareWith] = useState([]);
  const [opening, setOpening] = useState(null);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        base44.entities.MedicalRecord.filter({ patient_email: email }, { sort: '-record_date', limit: 100 }),
        base44.entities.CaregiverLink.filter({ patient_email: email }),
      ]);
      setRecords(Array.isArray(r) ? r : r.items || []);
      setLinks(c || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [email]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      const typeOk = filter === 'all' || r.type === filter;
      const textOk = !q || [r.title, r.doctor_name, r.hospital, r.specialty, r.notes].some((v) => (v || '').toLowerCase().includes(q));
      return typeOk && textOk;
    });
  }, [records, query, filter]);

  const openFile = async (record) => {
    if (!record.file_uri) return;
    setOpening(record.id);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: record.file_uri, expires_in: 600 });
      window.open(signed_url, '_blank', 'noopener');
    } finally {
      setOpening(null);
    }
  };

  const remove = async (record) => {
    await base44.entities.MedicalRecord.delete(record.id);
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
  };

  const openShare = (record) => {
    setShareTarget(record);
    setShareWith(record.shared_with || []);
  };

  const saveShare = async () => {
    await base44.entities.MedicalRecord.update(shareTarget.id, { shared_with: shareWith });
    setRecords((prev) => prev.map((r) => (r.id === shareTarget.id ? { ...r, shared_with: shareWith } : r)));
    setShareTarget(null);
  };

  const toggleShare = (em) => {
    setShareWith((prev) => (prev.includes(em) ? prev.filter((x) => x !== em) : [...prev, em]));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centralised medical history"
        title="Medical records"
        subtitle="Every prescription, report and consultation from every doctor and hospital, filed under one profile."
        icon={FileText}
        actions={<button onClick={() => setUploadOpen(true)} className="mg-btn-primary h-11 text-sm"><Plus className="h-4 w-4" /> Add record</button>}
      />

      <div className="mg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by doctor, hospital, speciality or title…"
              className="mg-input pl-10"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition ${
                  filter === f.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading records…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={records.length === 0 ? 'No records yet' : 'No records match your search'}
          description={records.length === 0 ? 'Upload your first prescription or report so everything lives in one place.' : 'Try a different doctor, hospital or document type.'}
          action={<button onClick={() => setUploadOpen(true)} className="mg-btn-primary h-11 text-sm"><Plus className="h-4 w-4" /> Add record</button>}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.other;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="mg-card mg-card-hover p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mg-chip bg-muted text-muted-foreground">{meta.label}</span>
                      {r.shared_with?.length ? (
                        <span className="mg-chip bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
                          <Share2 className="h-3 w-3" /> Shared with {r.shared_with.length}
                        </span>
                      ) : null}
                      {r.is_demo ? <span className="mg-chip bg-slate-100 text-slate-500">Demo record</span> : null}
                    </div>
                    <h3 className="mt-2 text-[15.5px] font-bold text-foreground">{r.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                      {r.doctor_name ? <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{r.doctor_name}</span> : null}
                      {r.hospital ? <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{r.hospital}</span> : null}
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{shortDate(r.record_date)}</span>
                    </div>
                    {r.notes ? <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{r.notes}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {r.file_uri ? (
                      <button onClick={() => openFile(r)} className="mg-btn-ghost h-9 px-3 text-[12.5px]">
                        {opening === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />} Open file
                      </button>
                    ) : null}
                    <button onClick={() => openShare(r)} className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-primary" title="Share record">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(r)} className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-red-600" title="Delete record">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecordUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        patientEmail={email}
        uploaderEmail={account.email}
        onSaved={load}
      />

      <Dialog open={!!shareTarget} onOpenChange={(v) => !v && setShareTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">Share “{shareTarget?.title}”</DialogTitle>
            <DialogDescription>Only the people you select can open this record.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {links.filter((l) => l.status === 'active').map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={shareWith.includes(l.caregiver_email)}
                  onChange={() => toggleShare(l.caregiver_email)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground">{l.caregiver_name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{l.relation} · {l.caregiver_email}</p>
                </div>
              </label>
            ))}
            {links.filter((l) => l.status === 'active').length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No authorised caregivers yet. Invite someone from Settings & privacy.</p>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShareTarget(null)} className="mg-btn-ghost h-10 text-sm">Cancel</button>
            <button onClick={saveShare} className="mg-btn-primary h-10 text-sm"><Share2 className="h-4 w-4" /> Save sharing</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}