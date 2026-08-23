import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';

export default function AnalyticsChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
          contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border) / 0.5)', background: 'hsl(var(--card))', boxShadow: 'var(--elevate-2)' }}
        />
        <Bar 
          dataKey="interactions" 
          fill="hsl(var(--primary))" 
          radius={[8, 8, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
