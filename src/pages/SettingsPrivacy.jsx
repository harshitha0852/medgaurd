import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Settings, ShieldCheck, Video, Share2, UserPlus, Trash2, Loader2, Check, Lock, LogOut, Bell, FileText,
} from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { notify } from '@/lib/notify';
import { shortDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';

export default function SettingsPrivacy() {
  const { account, activePatient, refreshPatients, signOut } = useSession();
  const email = activePatient?.account_email;
  const [links, setLinks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState({ email: '', name: '', relation: 'Family member', can_view_videos: true });
  const [message, setMessage] = useState('');

  const loadLinks = async () => {
    if (!email) return;
    const res = await base44.entities.CaregiverLink.filter({ patient_email: email });
    setLinks(res || []);
  };

  useEffect(() => { loadLinks(); /* eslint-disable-next-line */ }, [email]);

  const toggleConsent = async (field) => {
    if (!activePatient) return;
    setBusy(true);
    try {
      await base44.entities.PatientProfile.update(activePatient.id, { [field]: !activePatient[field] });
      await refreshPatients();
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(invite.email)) {
      setMessage('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await base44.entities.CaregiverLink.create({
        patient_email: email,
        caregiver_email: invite.email.trim().toLowerCase(),
        caregiver_name: invite.name || invite.email.split('@')[0],
        relation: invite.relation,
        status: 'pending',
        can_view_records: true,
        can_view_videos: invite.can_view_videos,
        can_manage_meds: false,
        invited_at: new Date().toISOString(),
      });
      await notify({
        recipient_email: invite.email.trim().toLowerCase(),
        patient_email: email,
        type: 'access',
        title: `${activePatient?.full_name || 'A patient'} invited you as a caregiver`,
        message: 'Open Settings & privacy to review the access you have been granted.',
        link: '/settings',
        severity: 'info',
      });
      setInvite({ email: '', name: '', relation: 'Family member', can_view_videos: true });
      setMessage('Invitation created. The person can now view this patient once they sign in.');
      await loadLinks();
    } finally {
      setBusy(false);
    }
  };

  const updateLink = async (link, patch) => {
    await base44.entities.CaregiverLink.update(link.id, patch);
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, ...patch } : l)));
  };

  const removeLink = async (link) => {
    await base44.entities.CaregiverLink.update(link.id, { status: 'revoked' });
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, status: 'revoked' } : l)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Privacy controls"
        title="Settings & privacy"
        subtitle="Decide what is recorded, who can see it, and revoke access at any time."
        icon={Settings}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="mg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Consent</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">These switches control the patient-controlled parts of MedGuard.</p>

          <div className="mt-4 space-y-3">
            {[
              { field: 'video_consent', icon: Video, title: 'Medication verification videos', desc: 'Allow the camera to be opened (by the patient, each time) to record a dose for caregiver review.' },
              { field: 'share_consent', icon: Share2, title: 'Share records with the care team', desc: 'Let authorised caregivers and clinicians open the uploaded prescriptions and reports.' },
            ].map((c) => (
              <div key={c.field} className="flex items-start gap-3 rounded-2xl border border-border p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><c.icon className="h-4 w-4" /></span>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold text-foreground">{c.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{c.desc}</p>
                </div>
                <button
                  onClick={() => toggleConsent(c.field)}
                  disabled={busy}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${activePatient?.[c.field] ? 'bg-[hsl(var(--mint))]' : 'bg-muted'}`}
                  aria-label={c.title}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${activePatient?.[c.field] ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-muted/50 p-3.5">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Camera access is requested each time and recording runs only while the patient holds the button.
              No facial recognition is used, and a video is never treated as proof that medicine was swallowed.
            </p>
          </div>
        </div>

        <div className="mg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground"><UserPlus className="h-4 w-4 text-primary" /> Caregiver access</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Add the people who help with medicines, and choose what they can see.</p>

          <form onSubmit={sendInvite} className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className="mg-input sm:col-span-2" placeholder="caregiver@example.com" />
            <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} className="mg-input" placeholder="Their name" />
            <select value={invite.relation} onChange={(e) => setInvite({ ...invite, relation: e.target.value })} className="mg-input">
              {['Daughter', 'Son', 'Spouse', 'Sibling', 'Nurse', 'Family member', 'Geriatrician'].map((r) => <option key={r}>{r}</option>)}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted-foreground sm:col-span-2">
              <input type="checkbox" checked={invite.can_view_videos} onChange={(e) => setInvite({ ...invite, can_view_videos: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              Allow this person to review medication verification videos
            </label>
            <button type="submit" disabled={busy} className="mg-btn-primary h-11 text-sm sm:col-span-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Invite caregiver
            </button>
          </form>
          {message ? <p className="mt-2 rounded-xl bg-[hsl(var(--mint))]/8 p-2.5 text-[12px] text-[hsl(var(--mint))]">{message}</p> : null}

          <div className="mt-4 space-y-2">
            {links.map((l) => (
              <div key={l.id} className="rounded-2xl border border-border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{l.caregiver_name}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">{l.relation} · {l.caregiver_email}</p>
                    {l.invited_at ? <p className="text-[11px] text-muted-foreground/80">Added {shortDate(l.invited_at)}</p> : null}
                  </div>
                  <span className={`mg-chip shrink-0 ${l.status === 'active' ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : l.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>
                    {l.status}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px]">
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input type="checkbox" checked={!!l.can_view_videos} onChange={(e) => updateLink(l, { can_view_videos: e.target.checked })} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
                    Videos
                  </label>
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input type="checkbox" checked={!!l.can_view_records} onChange={(e) => updateLink(l, { can_view_records: e.target.checked })} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
                    Records
                  </label>
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input type="checkbox" checked={!!l.can_manage_meds} onChange={(e) => updateLink(l, { can_manage_meds: e.target.checked })} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
                    Manage medicines
                  </label>
                  {l.status !== 'revoked' ? (
                    <button onClick={() => removeLink(l)} className="ml-auto inline-flex items-center gap-1 font-semibold text-red-600 hover:underline">
                      <Trash2 className="h-3 w-3" /> Revoke
                    </button>
                  ) : (
                    <button onClick={() => updateLink(l, { status: 'active' })} className="ml-auto font-semibold text-primary hover:underline">Restore access</button>
                  )}
                </div>
              </div>
            ))}
            {links.length === 0 ? <p className="text-[13px] text-muted-foreground">No caregiver access yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="mg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground"><Bell className="h-4 w-4 text-primary" /> Notifications</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Medication reminders, missed-dose reports, interaction alerts, new videos and refill updates are all delivered to the
            notification centre for the signed-in account. Caregivers get their own copy of the events they are allowed to see.
          </p>
          <div className="mt-3 rounded-2xl bg-muted/50 p-3.5 text-[12px] leading-relaxed text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{account.email}</span> · role{' '}
            <span className="font-semibold text-foreground">{account.role}</span>.
          </div>
        </div>

        <div className="mg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground"><FileText className="h-4 w-4 text-primary" /> Your data</h2>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>• Records and videos are stored privately and opened only through short-lived secure links.</li>
            <li>• Caregivers see only what is shared with them; revoking access takes effect immediately.</li>
            <li>• Demonstration accounts contain clearly labelled sample data.</li>
            <li>• MedGuard does not diagnose, prescribe, or sell your information.</li>
          </ul>
          <button onClick={signOut} className="mg-btn-ghost mt-4 h-11 w-full text-sm text-red-600">
            <LogOut className="h-4 w-4" /> Sign out of this device
          </button>
        </div>
      </div>
    </div>
  );
}