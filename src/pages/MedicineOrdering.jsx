import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Pill, Truck, Loader2, Plus, PackageCheck, Store, Upload, AlertTriangle, X } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { daysUntil, shortDate, todayKey } from '@/lib/format';
import { notifyCaregivers } from '@/lib/notify';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PHARMACIES = [
  'MedPlus Pharmacy, Jayanagar',
  'Apollo Pharmacy, 4th Block',
  'Wellness Forever, Koramangala',
];

const STEPS = ['requested', 'confirmed', 'packed', 'shipped', 'delivered'];
const STATUS_TONE = {
  requested: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-sky-50 text-sky-700',
  packed: 'bg-indigo-50 text-indigo-700',
  shipped: 'bg-amber-50 text-amber-800',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function MedicineOrdering() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email;
  const [meds, setMeds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ pharmacy: PHARMACIES[0], quantity: '30 tablets', notes: '', file: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const [m, o] = await Promise.all([
        base44.entities.Medication.filter({ patient_email: email, active: true }),
        base44.entities.MedicineOrder.filter({ patient_email: email }, { sort: '-requested_at', limit: 40 }),
      ]);
      setMeds(m || []);
      setOrders(Array.isArray(o) ? o : o.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [email]);

  const dueSoon = useMemo(
    () => meds.map((m) => ({ ...m, due: daysUntil(m.refill_date) })).sort((a, b) => (a.due ?? 999) - (b.due ?? 999)),
    [meds]
  );

  const request = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let prescription_uri = '';
      if (form.file) {
        const res = await base44.integrations.Core.UploadPrivateFile({ file: form.file });
        prescription_uri = res.file_uri;
        await base44.entities.MedicalRecord.create({
          patient_email: email,
          title: `Refill prescription — ${target.name}`,
          type: 'prescription',
          doctor_name: target.prescribed_by,
          record_date: todayKey(),
          file_uri: prescription_uri,
          file_name: form.file.name,
          uploaded_by: account.email,
          shared_with: [],
        });
      }
      await base44.entities.MedicineOrder.create({
        patient_email: email,
        medication_id: target.id,
        medication_name: target.name,
        pharmacy: form.pharmacy,
        quantity: form.quantity,
        notes: form.notes,
        prescription_uri,
        requested_at: new Date().toISOString(),
        requested_by: account.email,
        status: 'requested',
      });
      await notifyCaregivers(email, {
        type: 'refill',
        title: `Refill requested for ${target.name}`,
        message: `${account.full_name} requested a refill from ${form.pharmacy} (${form.quantity}).`,
        link: '/ordering',
        severity: 'info',
      });
      setTarget(null);
      setForm({ pharmacy: PHARMACIES[0], quantity: '30 tablets', notes: '', file: null });
      await load();
    } catch {
      setError('The refill request could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (order) => {
    await base44.entities.MedicineOrder.update(order.id, { status: 'cancelled' });
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Refills & pharmacy"
        title="Medicine ordering"
        subtitle="See what is running out, request a refill from a partner pharmacy and follow the order status. Nothing is purchased automatically."
        icon={Pill}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="mg-card p-5 sm:p-6">
          <h2 className="text-[17px] font-bold text-foreground">Refill status</h2>
          <p className="text-[13px] text-muted-foreground">Based on the refill date recorded for each medicine.</p>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {dueSoon.map((m) => {
                const urgent = m.due !== null && m.due <= 7;
                return (
                  <div key={m.id} className={`rounded-2xl border p-3.5 ${urgent ? 'border-amber-200 bg-amber-50/50' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-foreground">{m.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {m.dosage} · {m.frequency}
                          {m.refill_date ? ` · refill ${shortDate(m.refill_date)}` : ' · no refill date set'}
                        </p>
                      </div>
                      <button onClick={() => { setTarget(m); setError(''); }} className="mg-btn-primary h-9 shrink-0 px-3 text-[12.5px]">
                        <Plus className="h-3.5 w-3.5" /> Refill
                      </button>
                    </div>
                    {m.due !== null ? (
                      <p className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${urgent ? 'text-amber-800' : 'text-muted-foreground'}`}>
                        {urgent ? <AlertTriangle className="h-3 w-3" /> : null}
                        {m.due <= 0 ? 'Refill overdue' : `Refill due in ${m.due} day${m.due === 1 ? '' : 's'}`}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {dueSoon.length === 0 ? <EmptyState icon={Pill} title="No active medicines" description="Add medicines to your schedule first." compact /> : null}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="mg-card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground"><Store className="h-4 w-4 text-primary" /> Partner pharmacies</h3>
            <div className="mt-2.5 space-y-2">
              {PHARMACIES.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                  <span className="text-[13px] font-medium text-foreground">{p}</span>
                  <span className="mg-chip bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">Verified</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Medicines are dispensed only against a valid prescription. MedGuard never substitutes a medicine or completes a purchase without your confirmation.
            </p>
          </div>

          <div className="mg-card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground"><Truck className="h-4 w-4 text-primary" /> Your orders</h3>
            <div className="mt-2.5 space-y-3">
              {orders.map((o) => {
                const stepIndex = STEPS.indexOf(o.status);
                return (
                  <div key={o.id} className="rounded-2xl border border-border/70 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground">{o.medication_name}</p>
                        <p className="text-[11.5px] text-muted-foreground">{o.pharmacy} · {o.quantity}</p>
                      </div>
                      <span className={`mg-chip ${STATUS_TONE[o.status]}`}>{o.status}</span>
                    </div>
                    {o.status !== 'cancelled' ? (
                      <div className="mt-3 flex items-center gap-1">
                        {STEPS.map((s, i) => (
                          <div key={s} className="flex flex-1 items-center gap-1">
                            <span className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-[hsl(var(--mint))]' : 'bg-muted'}`} />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Requested {shortDate(o.requested_at)}{o.tracking_no ? ` · ${o.tracking_no}` : ''}</span>
                      {o.status === 'requested' ? (
                        <button onClick={() => cancelOrder(o)} className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline">
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 ? <p className="text-[13px] text-muted-foreground">No refill requests yet.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">Request a refill</DialogTitle>
            <DialogDescription>{target?.name} · {target?.dosage}</DialogDescription>
          </DialogHeader>
          <form onSubmit={request} className="space-y-3.5">
            <div>
              <label className="mg-label">Pharmacy</label>
              <select value={form.pharmacy} onChange={(e) => setForm({ ...form, pharmacy: e.target.value })} className="mg-input">
                {PHARMACIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mg-label">Quantity</label>
              <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mg-input" />
            </div>
            <div>
              <label className="mg-label">Upload prescription (if the pharmacy asks)</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border px-3.5 py-3 text-[12.5px] text-muted-foreground hover:border-primary/40">
                <Upload className="h-4 w-4" />
                {form.file ? form.file.name : 'Choose a PDF or photo · stored privately'}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </label>
            </div>
            <div>
              <label className="mg-label">Note for the pharmacy</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mg-input h-auto py-3" placeholder="Deliver before 6 pm…" />
            </div>
            {error ? <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setTarget(null)} className="mg-btn-ghost h-10 text-sm">Cancel</button>
              <button type="submit" disabled={busy} className="mg-btn-primary h-10 text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                {busy ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}