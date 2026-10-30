const TONES = {
  brand: 'bg-primary/10 text-primary',
  mint: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-600',
};

export default function StatCard({ label, value, hint, icon: Icon, tone = 'brand', suffix }) {
  return (
    <div className="mg-card mg-card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone] || TONES.brand}`}>
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[28px] font-extrabold leading-none text-foreground">{value}</span>
        {suffix ? <span className="text-sm font-medium text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <p className="mt-2 text-[13px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
