import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { EventNote as EventNoteIcon, Storage as StorageIcon, Business as BusinessIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { AuditEvent } from '../../types';

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.min(Math.round(eased * target), target));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

const ICON_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #8b5cf6, #a855f7)',
  'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  delay: string;
  isNumeric: boolean;
}

function StatCard({ label, value, icon, gradient, delay, isNumeric }: StatCardProps) {
  const animated = useCountUp(isNumeric ? (value as number) : 0);

  return (
    <Card
      elevation={0}
      className={`card-hover anim-fade-up ${delay}`}
      sx={{
        border: '1px solid rgba(226,232,240,0.8)',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: '20px !important' }}>
        <Box className="flex items-start justify-between">
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.6px' }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.1, mt: 0.5, fontSize: { xs: '1.6rem', md: '2rem' } }}
            >
              {isNumeric ? animated : value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface Props { events: AuditEvent[] }

export default function StatsBar({ events }: Props) {
  const totalEvents = events.length;
  const uniqueDataFields = new Set(events.flatMap((e) => e.dataFields)).size;
  const uniqueTenants = new Set(events.map((e) => e.tenantId)).size;
  const sorted = [...events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const lastActivity = sorted[0] ? formatDistanceToNow(new Date(sorted[0].occurredAt), { addSuffix: true }) : '—';

  const stats = [
    { label: 'Total Access Events', value: totalEvents,      icon: <EventNoteIcon fontSize="small" />, gradient: ICON_GRADIENTS[0], isNumeric: true },
    { label: 'Data Types Accessed', value: uniqueDataFields, icon: <StorageIcon fontSize="small" />,   gradient: ICON_GRADIENTS[1], isNumeric: true },
    { label: 'Apps Connected',      value: uniqueTenants,    icon: <BusinessIcon fontSize="small" />,  gradient: ICON_GRADIENTS[2], isNumeric: true },
    { label: 'Last Activity',       value: lastActivity,     icon: <AccessTimeIcon fontSize="small" />, gradient: ICON_GRADIENTS[3], isNumeric: false },
  ];

  const delays = ['delay-0', 'delay-1', 'delay-2', 'delay-3'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <StatCard key={s.label} {...s} delay={delays[i]} />
      ))}
    </div>
  );
}
