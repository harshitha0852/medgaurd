import { LOG_STATUS } from '@/lib/interactionEngine';

export default function LogStatusPill({ status }) {
  const meta = LOG_STATUS[status] || LOG_STATUS.scheduled;
  return <span className={`mg-chip ${meta.tone}`}>{meta.label}</span>;
}