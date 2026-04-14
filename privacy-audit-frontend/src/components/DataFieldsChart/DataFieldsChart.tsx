import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { AuditEvent } from '../../types';

const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#f97316', '#ec4899'];

interface Props { events: AuditEvent[] }

export default function DataFieldsChart({ events }: Props) {
  const counts: Record<string, number> = {};
  events.forEach((e) => e.dataFields.forEach((f) => { counts[f] = (counts[f] ?? 0) + 1; }));

  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([field, count]) => ({
      field: field.replace(/_/g, ' '),
      count,
    }));

  return (
    <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
          Most Accessed Data Fields
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
          Top 8 data fields accessed across all events
        </Typography>
        <Box sx={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey="field"
                tick={{ fontSize: 11, fill: '#374151' }}
                width={110}
              />
              <Tooltip
                formatter={(v: number) => [`${v} times`, 'Accessed']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
