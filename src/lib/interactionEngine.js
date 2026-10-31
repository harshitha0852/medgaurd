import { DRUG_CATALOG, INTERACTIONS, ALLERGY_TERMS, SEVERITY_META } from './drugData';

function norm(s) {
  return String(s || '').toLowerCase().trim();
}

/** Resolve a free-text medicine name to catalog knowledge. */
export function resolveDrug(name) {
  const n = norm(name);
  if (!n) return null;
  let best = null;
  for (const entry of DRUG_CATALOG) {
    const hit = entry.aliases.some((a) => n === a || n.includes(a) || a.includes(n));
    if (hit) {
      const exact = entry.aliases.some((a) => n === a);
      if (exact) return entry;
      if (!best) best = entry;
    }
  }
  return best;
}

/**
 * Deterministic clinical analysis of a medication list.
 * Results come only from the curated reference dataset — never from an LLM.
 */
export function analyzeMedications(medications = [], patient = null) {
  const active = medications.filter((m) => m.active !== false);
  const resolved = active.map((m) => ({
    med: m,
    info: resolveDrug(m.generic_name || m.name),
    generic: norm(resolveDrug(m.generic_name || m.name)?.generic) || norm(m.generic_name || m.name),
  }));

  const alerts = [];
  const push = (a) => alerts.push({ id: `${a.type}-${alerts.length}-${Date.now()}`, ...a });

  // 1. Duplicate active ingredients across brands
  const byGeneric = {};
  resolved.forEach((r) => {
    if (!r.generic) return;
    byGeneric[r.generic] = byGeneric[r.generic] || [];
    byGeneric[r.generic].push(r.med.name);
  });
  Object.entries(byGeneric).forEach(([generic, names]) => {
    if (names.length > 1) {
      push({
        type: 'duplicate',
        severity: 'high',
        title: 'Same active ingredient from two brands',
        medicines: names,
        effect: `Both contain ${generic}`,
        explanation: `"${names.join('" and "')}" contain the same active ingredient (${generic}). Taking both means you may receive a double dose without knowing it.`,
        recommendation: 'Ask your doctor or pharmacist which single brand to continue.',
        source: 'MedGuard duplicate-ingredient check (active ingredient mapping)',
      });
    }
  });

  // 2. Pairwise interactions
  const seen = new Set();
  for (let i = 0; i < resolved.length; i += 1) {
    for (let j = i + 1; j < resolved.length; j += 1) {
      const g1 = resolved[i].generic;
      const g2 = resolved[j].generic;
      if (!g1 || !g2) continue;
      const pairKey = [g1, g2].sort().join('|');
      if (seen.has(pairKey)) continue;
      const found = INTERACTIONS.find(
        (x) => (x.a === g1 && x.b === g2) || (x.a === g2 && x.b === g1)
      );
      if (found) {
        seen.add(pairKey);
        push({
          type: 'interaction',
          severity: found.severity,
          title: found.effect,
          medicines: [resolved[i].med.name, resolved[j].med.name],
          effect: found.effect,
          explanation: found.explanation,
          recommendation: found.recommendation,
          source: found.source,
        });
      }
    }
  }

  // 3. Allergy cross-check
  (patient?.allergies || []).forEach((allergy) => {
    const a = norm(allergy);
    const term = ALLERGY_TERMS.find((t) => a.includes(t.term) || t.term.includes(a));
    resolved.forEach((r) => {
      if (!r.info) return;
      const generic = norm(r.info.generic);
      const cls = norm(r.info.drugClass);
      const genericsHit = term ? term.generics.some((g) => g === generic) : false;
      const classHit = term ? term.classes.some((c) => cls.includes(norm(c))) : false;
      const rawHit = a.length > 2 && (generic.includes(a) || cls.includes(a));
      if (genericsHit || classHit || rawHit) {
        push({
          type: 'allergy',
          severity: 'high',
          title: 'Recorded allergy may match this medicine',
          medicines: [r.med.name],
          effect: `Allergy record: ${allergy}`,
          explanation: `Your profile lists an allergy to ${allergy}. ${r.med.name} is in the ${r.info.drugClass} group, which may cause a reaction for you.`,
          recommendation: 'Contact your prescriber before taking this medicine and confirm the allergy record is correct.',
          source: 'Patient allergy record cross-checked against drug class database',
        });
      }
    });
  });

  const severityRank = { high: 0, moderate: 1, low: 2 };
  alerts.sort((x, y) => (SEVERITY_META[x.severity]?.order ?? 9) - (SEVERITY_META[y.severity]?.order ?? 9) || 0);
  alerts.sort((x, y) => (severityRank[x.severity] ?? 9) - (severityRank[y.severity] ?? 9));

  const counts = { high: 0, moderate: 0, low: 0 };
  alerts.forEach((a) => { counts[a.severity] = (counts[a.severity] || 0) + 1; });

  return {
    alerts,
    counts,
    total: alerts.length,
    checkedAt: new Date().toISOString(),
    medicineCount: active.length,
    unmatched: resolved.filter((r) => !r.info).map((r) => r.med.name),
  };
}

/** Adherence summary for a set of logs. */
export function adherenceSummary(logs = []) {
  const taken = logs.filter((l) => ['reviewed', 'video_submitted', 'awaiting_review'].includes(l.status)).length;
  const missed = logs.filter((l) => l.status === 'missed').length;
  const unverified = logs.filter((l) => l.status === 'not_verified').length;
  const pending = logs.filter((l) => ['scheduled', 'reminder_sent'].includes(l.status)).length;
  const considered = taken + missed + unverified;
  return {
    taken,
    missed,
    unverified,
    pending,
    total: logs.length,
    adherence: considered ? Math.round((taken / considered) * 100) : 0,
  };
}

export const LOG_STATUS = {
  scheduled: { label: 'Scheduled', tone: 'bg-slate-100 text-slate-600' },
  reminder_sent: { label: 'Reminder sent', tone: 'bg-sky-50 text-sky-700' },
  video_submitted: { label: 'Video submitted', tone: 'bg-indigo-50 text-indigo-700' },
  awaiting_review: { label: 'Awaiting caregiver review', tone: 'bg-amber-50 text-amber-800' },
  reviewed: { label: 'Reviewed', tone: 'bg-emerald-50 text-emerald-700' },
  not_verified: { label: 'Not verified', tone: 'bg-orange-50 text-orange-700' },
  missed: { label: 'Reported as missed', tone: 'bg-red-50 text-red-700' },
};