import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const dayKey = (d) => d.toISOString().slice(0, 10);

export default function AdherenceChart({ logs = [], days = 7, height = 240 }) {
  const data = useMemo(() => {
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const dayLogs = logs.filter((l) => (l.scheduled_date || '').slice(0, 10) === key);
      const taken = dayLogs.filter((l) => ['reviewed', 'video_submitted', 'awaiting_review'].includes(l.status)).length;
      const missed = dayLogs.filter((l) => l.status === 'missed').length;
      const unverified = dayLogs.filter((l) => l.status === 'not_verified').length;
      out.push({
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        Taken: taken,
        Missed: missed,
        Unverified: unverified,
      });
    }
    return out;
  }, [logs, days]);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} barGap={3} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(209 28% 92%)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(214 16% 45%)' }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(214 16% 45%)' }} />
          <Tooltip
            contentStyle={{ borderRadius: 14, border: '1px solid hsl(209 28% 90%)', fontSize: 12, boxShadow: '0 12px 30px -18px rgba(15,34,55,0.4)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Taken" stackId="a" fill="hsl(158 52% 42%)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Unverified" stackId="a" fill="hsl(38 92% 62%)" />
          <Bar dataKey="Missed" stackId="a" fill="hsl(0 72% 58%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
