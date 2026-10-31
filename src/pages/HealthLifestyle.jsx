import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Droplets, Activity, HeartPulse, Scale, Plus, Trash2, Loader2, Utensils, Footprints, Moon, Sparkles,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSession } from '@/lib/SessionContext';
import { todayKey, shortDate } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { Link } from 'react-router-dom';

const GOAL_WATER = 2000;
const DIET_OPTIONS = ['Vegetarian', 'Low salt', 'Diabetic-friendly', 'Low fat', 'High fibre', 'Soft foods'];

export default function HealthLifestyle() {
  const { activePatient } = useSession();
  const email = activePatient?.account_email;
  const [tab, setTab] = useState('water');
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState([]);
  const [form, setForm] = useState({ type: 'weight', value: '', value2: '', note: '' });

  useEffect(() => {
    try {
      setPrefs(JSON.parse(localStorage.getItem('mg_diet_prefs') || '[]'));
    } catch { setPrefs([]); }
  }, []);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await base44.entities.HealthMetric.filter({ patient_email: email }, { sort: '-recorded_date', limit: 200 });
      setMetrics(Array.isArray(res) ? res : res.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [email]);

  const today = todayKey();
  const waterToday = metrics.filter((m) => m.type === 'water' && (m.recorded_date || '').startsWith(today));
  const waterTotal = waterToday.reduce((s, m) => s + (m.value || 0), 0);

  const addWater = async (ml) => {
    setBusy(true);
    try {
      await base44.entities.HealthMetric.create({
        patient_email: email, type: 'water', value: ml, unit: 'ml', recorded_date: new Date().toISOString(),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeMetric = async (m) => {
    await base44.entities.HealthMetric.delete(m.id);
    setMetrics((prev) => prev.filter((x) => x.id !== m.id));
  };

  const togglePref = (p) => {
    const next = prefs.includes(p) ? prefs.filter((x) => x !== p) : [...prefs, p];
    setPrefs(next);
    localStorage.setItem('mg_diet_prefs', JSON.stringify(next));
  };

  const addMeasurement = async (e) => {
    e.preventDefault();
    const value = Number(form.value);
    if (!value) return;
    setBusy(true);
    try {
      await base44.entities.HealthMetric.create({
        patient_email: email,
        type: form.type,
        value,
        value2: form.type === 'bp' ? Number(form.value2) || undefined : undefined,
        unit: form.type === 'bp' ? 'mmHg' : form.type === 'weight' ? 'kg' : form.type === 'glucose' ? 'mg/dL' : 'bpm',
        recorded_date: new Date().toISOString(),
        note: form.note,
      });
      setForm({ type: form.type, value: '', value2: '', note: '' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const series = useMemo(() => {
    const build = (type) =>
      metrics
        .filter((m) => m.type === type)
        .slice(0, 14)
        .reverse()
        .map((m) => ({ day: shortDate(m.recorded_date), value: m.value, value2: m.value2 }));
    return { weight: build('weight'), bp: build('bp'), glucose: build('glucose'), sleep: build('sleep') };
  }, [metrics]);

  const activities = metrics.filter((m) => m.type === 'activity');
  const steps = metrics.filter((m) => m.type === 'steps');
  const latestWeight = series.weight[series.weight.length - 1]?.value;
  const latestBp = series.bp[series.bp.length - 1];

  const dietTips = prefs.length
    ? [
        prefs.includes('Low salt') && 'Keep added salt under one level teaspoon a day — use lemon, pepper and herbs instead.',
        prefs.includes('Diabetic-friendly') && 'Choose whole grains, dal and vegetables; keep fruit portions small and avoid sweet drinks.',
        prefs.includes('Vegetarian') && 'Combine dal, beans and paneer across the day so protein is spread out.',
        prefs.includes('Low fat') && 'Steam or grill instead of deep frying; use a teaspoon of oil per person.',
        prefs.includes('High fibre') && 'Add one bowl of salad and a fistful of nuts daily, with enough water.',
        prefs.includes('Soft foods') && 'Moong dal khichdi, mashed vegetables and curd are easy to chew and gentle on the stomach.',
      ].filter(Boolean)
    : ['Eat three balanced meals with protein at each — dal, eggs, paneer or fish.', 'Sip water through the day rather than large amounts at once.', 'Limit very salty snacks and pickles if blood pressure is high.'];

  const TABS = [
    { id: 'water', label: 'Water', icon: Droplets },
    { id: 'diet', label: 'Food & diet', icon: Utensils },
    { id: 'activity', label: 'Activity', icon: Footprints },
    { id: 'monitor', label: 'Measurements', icon: HeartPulse },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${activePatient?.full_name || 'Patient'} · wellbeing`}
        title="Health & lifestyle"
        subtitle="Water, food, movement and measurements in one place — shared with the caregivers you authorise."
        icon={HeartPulse}
        actions={<Link to="/assistant" className="mg-btn-ghost h-11 text-sm"><Sparkles className="h-4 w-4" /> Ask about diet</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Water today" value={`${waterTotal} ml`} hint={`Goal ${GOAL_WATER} ml`} icon={Droplets} tone="brand" />
        <StatCard label="Latest weight" value={latestWeight ? `${latestWeight} kg` : '—'} hint="From your own entries" icon={Scale} tone="violet" />
        <StatCard label="Latest blood pressure" value={latestBp ? `${latestBp.value}/${latestBp.value2 || '—'}` : '—'} hint={latestBp ? `Recorded ${latestBp.day}` : 'No reading yet'} icon={HeartPulse} tone="red" />
        <StatCard label="Activities logged" value={activities.length} hint="Walks, yoga, physiotherapy" icon={Activity} tone="mint" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${tab === t.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading your health data…</div>
      ) : null}

      {tab === 'water' && !loading ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="mg-card p-6">
            <h2 className="text-[17px] font-bold text-foreground">Water intake</h2>
            <p className="text-[13px] text-muted-foreground">Small sips through the day are easier than large amounts at once.</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-[40px] font-extrabold leading-none text-foreground">{waterTotal}</span>
              <span className="pb-1 text-[14px] font-medium text-muted-foreground">/ {GOAL_WATER} ml</span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${Math.min(100, (waterTotal / GOAL_WATER) * 100)}%` }} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[150, 250, 500].map((ml) => (
                <button key={ml} onClick={() => addWater(ml)} disabled={busy} className="mg-btn-ghost h-11 text-sm">
                  <Plus className="h-4 w-4" /> {ml} ml
                </button>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-sky-50 p-3 text-[12.5px] leading-relaxed text-sky-800">
              Aim for about 8 glasses a day unless your doctor has limited fluids for your heart or kidneys.
            </p>
          </div>
          <div className="mg-card p-6">
            <h2 className="text-[17px] font-bold text-foreground">Today’s glasses</h2>
            <div className="mt-3 space-y-2">
              {waterToday.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                  <span className="text-[13px] font-medium text-foreground">{m.value} ml</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11.5px] text-muted-foreground">
                      {new Date(m.recorded_date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <button onClick={() => removeMetric(m)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              {waterToday.length === 0 ? <p className="text-[13px] text-muted-foreground">No water logged today yet.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'diet' && !loading ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="mg-card p-6">
            <h2 className="text-[17px] font-bold text-foreground">Your food preferences</h2>
            <p className="text-[13px] text-muted-foreground">Choose what applies — guidance adapts to your choices.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIET_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePref(p)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${prefs.includes(p) ? 'border-primary bg-primary/8 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="mg-card p-6">
            <h2 className="text-[17px] font-bold text-foreground">General guidance</h2>
            <div className="mt-3 space-y-2.5">
              {dietTips.map((t) => (
                <p key={t} className="rounded-xl bg-muted/50 p-3 text-[13px] leading-relaxed text-foreground">{t}</p>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
              General information only. Your doctor or dietitian’s advice always takes precedence — MedGuard does not create a medical diet plan.
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'activity' && !loading ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="mg-card p-6">
            <h2 className="text-[17px] font-bold text-foreground">Log movement</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[10, 20, 30, 45].map((min) => (
                <button
                  key={min}
                  onClick={async () => {
                    await base44.entities.HealthMetric.create({
                      patient_email: email, type: 'activity', value: min, unit: 'minutes',
                      recorded_date: new Date().toISOString(), note: 'Walk',
                    });
                    await load();
                  }}
                  className="mg-btn-ghost h-11 text-sm"
                >
                  <Plus className="h-4 w-4" /> {min} min walk
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {activities.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{a.note || 'Activity'} · {a.value} min</p>
                    <p className="text-[11px] text-muted-foreground">{shortDate(a.recorded_date)}</p>
                  </div>
                  <button onClick={() => removeMetric(a)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {activities.length === 0 ? <p className="text-[13px] text-muted-foreground">No activity logged yet.</p> : null}
            </div>
            {steps.length ? (
              <div className="mt-4 rounded-xl bg-muted/50 p-3">
                <p className="text-[12.5px] font-semibold text-foreground">Recent step counts</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{steps.slice(0, 5).map((s) => `${shortDate(s.recorded_date)}: ${s.value}`).join(' · ')}</p>
              </div>
            ) : null}
          </div>
          <div className="mg-card p-6">
            <h2 className="text-[17px] font-bold text-foreground">Gentle suggestions</h2>
            <div className="mt-3 space-y-2.5">
              {[
                { icon: Footprints, t: 'Short daily walk', d: '10–20 minutes at a comfortable pace, ideally with someone nearby.' },
                { icon: Activity, t: 'Chair exercises', d: 'Seated leg lifts and ankle circles help circulation without strain.' },
                { icon: Moon, t: 'Rest and sleep', d: 'Aim for 7–8 hours; keep the room dim and cool.' },
              ].map((s) => (
                <div key={s.t} className="flex gap-3 rounded-xl bg-muted/40 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary"><s.icon className="h-4 w-4" /></span>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{s.t}</p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] text-muted-foreground">Stop if you feel dizzy or breathless and tell your doctor.</p>
          </div>
        </div>
      ) : null}

      {tab === 'monitor' && !loading ? (
        <div className="space-y-5">
          <div className="mg-card p-5 sm:p-6">
            <h2 className="text-[17px] font-bold text-foreground">Record a measurement</h2>
            <form onSubmit={addMeasurement} className="mt-3 grid gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label className="mg-label">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mg-input">
                  <option value="weight">Weight (kg)</option>
                  <option value="bp">Blood pressure</option>
                  <option value="glucose">Blood sugar (mg/dL)</option>
                  <option value="heart_rate">Heart rate (bpm)</option>
                  <option value="sleep">Sleep (hours)</option>
                </select>
              </div>
              <div>
                <label className="mg-label">{form.type === 'bp' ? 'Systolic' : 'Value'}</label>
                <input type="number" step="0.1" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mg-input" placeholder="120" />
              </div>
              {form.type === 'bp' ? (
                <div>
                  <label className="mg-label">Diastolic</label>
                  <input type="number" value={form.value2} onChange={(e) => setForm({ ...form, value2: e.target.value })} className="mg-input" placeholder="80" />
                </div>
              ) : null}
              <div className="flex items-end">
                <button type="submit" disabled={busy} className="mg-btn-primary h-12 w-full text-sm">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {[
              { key: 'weight', title: 'Weight (kg)', color: 'hsl(211 76% 45%)' },
              { key: 'bp', title: 'Blood pressure (systolic / diastolic)', color: 'hsl(0 72% 55%)' },
              { key: 'glucose', title: 'Blood sugar (mg/dL)', color: 'hsl(158 52% 42%)' },
              { key: 'sleep', title: 'Sleep (hours)', color: 'hsl(262 60% 60%)' },
            ].map((chart) => (
              <div key={chart.key} className="mg-card p-5">
                <h3 className="text-[14.5px] font-bold text-foreground">{chart.title}</h3>
                {series[chart.key].length === 0 ? (
                  <p className="mt-4 text-[13px] text-muted-foreground">No readings yet.</p>
                ) : (
                  <div className="mt-2 h-[180px]">
                    <ResponsiveContainer>
                      <LineChart data={series[chart.key]} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(209 28% 92%)" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(214 16% 45%)' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(214 16% 45%)' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid hsl(209 28% 90%)' }} />
                        <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2.5} dot={{ r: 3 }} />
                        {chart.key === 'bp' ? <Line type="monotone" dataKey="value2" stroke="hsl(211 76% 70%)" strokeWidth={2} dot={{ r: 2 }} /> : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}