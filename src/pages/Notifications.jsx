import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCheck, ShieldAlert, Video, Pill, FileText, Truck, Loader2, BellRing } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

const ICON = {
  interaction: ShieldAlert,
  verification: Video,
  medication: Pill,
  record: FileText,
  refill: Truck,
};

const TONE = {
  critical: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-700',
  success: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]',
  info: 'bg-primary/8 text-primary',
};

export default function Notifications() {
  const { account, refreshUnread } = useSession();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Notification.filter({ recipient_email: account.email }, { sort: '-created_date', limit: 80 });
      setItems(Array.isArray(res) ? res : res.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [account.email]);

  const shown = useMemo(() => {
    if (tab === 'unread') return items.filter((n) => !n.read);
    if (tab === 'alerts') return items.filter((n) => ['critical', 'warning'].includes(n.severity));
    return items;
  }, [items, tab]);

  const open = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await refreshUnread();
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    setBusy(true);
    try {
      const unread = items.filter((n) => !n.read);
      await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { read: true })));
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      await refreshUnread();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notification centre"
        title="Notifications"
        subtitle="Medication reminders, safety alerts, submitted videos and refill updates for the people you care for."
        icon={Bell}
        actions={
          <button onClick={markAll} disabled={busy || !items.some((n) => !n.read)} className="mg-btn-ghost h-11 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Mark all read
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: `All (${items.length})` },
          { id: 'unread', label: `Unread (${items.filter((n) => !n.read).length})` },
          { id: 'alerts', label: 'Alerts' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${tab === t.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading notifications…</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={BellRing} title="Nothing here right now" description="Reminders and care updates will appear as they happen." />
      ) : (
        <div className="space-y-2.5">
          {shown.map((n) => {
            const Icon = ICON[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`mg-card mg-card-hover flex w-full items-start gap-3.5 p-4 text-left sm:p-5 ${n.read ? '' : 'border-primary/25'}`}
              >
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE[n.severity] || TONE.info}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-[14.5px] ${n.read ? 'font-semibold text-foreground/80' : 'font-bold text-foreground'}`}>{n.title}</p>
                    {!n.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{n.message}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">{formatDate(n.created_date, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}