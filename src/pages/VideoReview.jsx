import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, Loader2, Check, Flag, Clock, Play, UserRound, FileWarning } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { timeLabel, shortDate } from '@/lib/format';
import { notify } from '@/lib/notify';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function VideoReview() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null);
  const [note, setNote] = useState('');
  const [flagTarget, setFlagTarget] = useState(null);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await base44.entities.VerificationVideo.filter({ patient_email: email }, { sort: '-submitted_at', limit: 60 });
      setVideos(Array.isArray(res) ? res : res.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [email]);

  const shown = useMemo(() => {
    if (tab === 'pending') return videos.filter((v) => v.review_status === 'pending');
    if (tab === 'reviewed') return videos.filter((v) => v.review_status === 'reviewed');
    return videos;
  }, [videos, tab]);

  const loadVideo = async (v) => {
    if (!v.video_uri || urls[v.id]) return;
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: v.video_uri, expires_in: 3600 });
    setUrls((prev) => ({ ...prev, [v.id]: signed_url }));
  };

  const markReviewed = async (v) => {
    setBusy(v.id);
    try {
      await base44.entities.VerificationVideo.update(v.id, {
        review_status: 'reviewed',
        reviewed_by: account.full_name,
        reviewed_at: new Date().toISOString(),
        reviewer_note: note || '',
      });
      if (v.log_id) {
        await base44.entities.MedicationLog.update(v.log_id, {
          status: 'reviewed',
          reviewed_by: account.full_name,
          reviewed_at: new Date().toISOString(),
        });
      }
      await notify({
        recipient_email: v.patient_email,
        patient_email: v.patient_email,
        type: 'verification',
        title: 'Your medicine video was reviewed',
        message: `${account.full_name} reviewed your ${v.medication_name} video${note ? `: “${note}”` : '.'}`,
        link: '/verification',
        severity: 'success',
      });
      setNoteTarget(null);
      setNote('');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const raiseConcern = async (v) => {
    setBusy(v.id);
    try {
      await base44.entities.VerificationVideo.update(v.id, {
        review_status: 'flagged',
        reviewed_by: account.full_name,
        reviewed_at: new Date().toISOString(),
        reviewer_note: note || 'Concern raised during review',
      });
      if (v.log_id) {
        await base44.entities.MedicationLog.update(v.log_id, {
          status: 'not_verified',
          reviewed_by: account.full_name,
          reviewed_at: new Date().toISOString(),
        });
      }
      await notify({
        recipient_email: v.patient_email,
        patient_email: v.patient_email,
        type: 'verification',
        title: 'A caregiver raised a concern about a medicine video',
        message: `${account.full_name} reviewed your ${v.medication_name} video and added a note: “${note || 'Concern raised'}”.`,
        link: '/verification',
        severity: 'warning',
      });
      setFlagTarget(null);
      setNote('');
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${activePatient?.full_name || 'Patient'} · caregiver review`}
        title="Video review"
        subtitle="Watch the recorded clips and confirm what you observed. A review records human judgement, not proof that medicine was swallowed."
        icon={Video}
      />

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'pending', label: `Awaiting review (${videos.filter((v) => v.review_status === 'pending').length})` },
          { id: 'reviewed', label: 'Reviewed' },
          { id: 'all', label: 'All videos' },
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
        <div className="py-16 text-center text-sm text-muted-foreground">Loading videos…</div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Video}
          title={tab === 'pending' ? 'Nothing waiting for review' : 'No videos here yet'}
          description="When the patient records a dose, the clip appears here with its medicine and scheduled time."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((v) => (
            <div key={v.id} className="mg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15.5px] font-bold text-foreground">{v.medication_name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {shortDate(v.scheduled_date)} · {timeLabel(v.scheduled_time)}
                    <span className="text-border">|</span>
                    <UserRound className="h-3.5 w-3.5" /> {v.patient_name || v.patient_email}
                  </p>
                </div>
                <span className={`mg-chip shrink-0 ${v.review_status === 'reviewed' ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : v.review_status === 'flagged' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                  {v.review_status === 'reviewed' ? 'Reviewed' : v.review_status === 'flagged' ? 'Concern raised' : 'Awaiting review'}
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl bg-foreground/90" style={{ aspectRatio: '16 / 10' }}>
                {v.video_uri ? (
                  urls[v.id] ? (
                    <video src={urls[v.id]} controls playsInline className="h-full w-full object-contain" />
                  ) : (
                    <button onClick={() => loadVideo(v)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/90">
                      <Play className="h-9 w-9" />
                      <span className="text-[12.5px] font-semibold">Load video securely</span>
                    </button>
                  )
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center text-white/80">
                    <FileWarning className="h-7 w-7" />
                    <p className="text-[12.5px] font-semibold">Demonstration entry — no video file attached</p>
                    <p className="text-[11px] text-white/60">Real recordings from a patient will play here.</p>
                  </div>
                )}
              </div>

              {v.reviewer_note ? (
                <p className="mt-3 rounded-xl bg-muted/60 p-3 text-[12.5px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Note:</span> {v.reviewer_note}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {v.review_status === 'pending' ? (
                  <>
                    <button onClick={() => { setNoteTarget(v); setNote(''); }} disabled={busy === v.id} className="mg-btn-mint h-10 text-[13px]">
                      {busy === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark reviewed
                    </button>
                    <button onClick={() => { setFlagTarget(v); setNote(''); }} className="mg-btn-ghost h-10 text-[13px]">
                      <Flag className="h-4 w-4" /> Raise a concern
                    </button>
                  </>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">
                    {v.reviewed_by ? `Reviewed by ${v.reviewed_by} · ${shortDate(v.reviewed_at)}` : 'Recorded review'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!noteTarget} onOpenChange={(v) => !v && setNoteTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">Mark as reviewed</DialogTitle>
            <DialogDescription>{noteTarget?.medication_name} · {shortDate(noteTarget?.scheduled_date)}</DialogDescription>
          </DialogHeader>
          <div>
            <label className="mg-label">Observation note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mg-input h-auto py-3" placeholder="Took the tablet with water, looked well." />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setNoteTarget(null)} className="mg-btn-ghost h-10 text-sm">Cancel</button>
            <button onClick={() => markReviewed(noteTarget)} className="mg-btn-mint h-10 text-sm"><Check className="h-4 w-4" /> Confirm review</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!flagTarget} onOpenChange={(v) => !v && setFlagTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">Raise a concern</DialogTitle>
            <DialogDescription>The dose will be marked not verified and the patient will be told why.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="mg-label">What did you notice?</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mg-input h-auto py-3" placeholder="Video unclear, wrong tablet visible…" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setFlagTarget(null)} className="mg-btn-ghost h-10 text-sm">Cancel</button>
            <button onClick={() => raiseConcern(flagTarget)} className="mg-btn h-10 bg-red-600 text-sm text-white"><Flag className="h-4 w-4" /> Raise concern</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}