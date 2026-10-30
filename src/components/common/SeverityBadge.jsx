import { SEVERITY_META } from '@/lib/drugData';

export default function SeverityBadge({ severity, size = 'sm' }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.moderate;
  return (
    <span className={`mg-chip border ${meta.tone} ${size === 'lg' ? 'px-3.5 py-1.5 text-[13px]' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
