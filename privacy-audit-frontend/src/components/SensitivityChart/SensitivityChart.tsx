import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AuditEvent } from '../../types';

const COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
};

const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

interface Props { events: AuditEvent[] }

export default function SensitivityChart({ events }: Props) {
  const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  events.forEach((e) => { counts[e.sensitivityCode] = (counts[e.sensitivityCode] ?? 0) + 1; });

  const data = ORDER.filter((k) => counts[k] > 0).map((k) => ({
    name: k.charAt(0) + k.slice(1).toLowerCase(),
    value: counts[k],
    key: k,
  }));

  return (
    <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
          Sensitivity Breakdown
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
          Access events by data sensitivity level
        </Typography>
        <Box sx={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} events`, name]}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: '0.8rem', color: '#374151' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
