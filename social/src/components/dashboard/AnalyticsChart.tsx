import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';

export default function AnalyticsChart({ data }: { data: Array<{ day: string; interactions: number }> }) {
  return (
    <>
    <table className="sr-only">
      <caption>Current interactions on loaded posts, grouped by publication day</caption>
      <thead><tr><th scope="col">Day</th><th scope="col">Interactions</th></tr></thead>
      <tbody>{data.map((entry, index) => <tr key={`${entry.day}-${index}`}><th scope="row">{entry.day}</th><td>{entry.interactions}</td></tr>)}</tbody>
    </table>
    <div aria-hidden="true" className="h-full w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart accessibilityLayer={false} data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
    </div>
    </>
  );
}
