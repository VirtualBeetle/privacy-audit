import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import EventCard from './EventCard';
import type { AuditEvent } from '../../types';

type SensFilter = 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type ActionFilter = 'all' | 'READ' | 'EXPORT' | 'DELETE' | 'SHARE';

interface Props { events: AuditEvent[] }

export default function EventFeed({ events }: Props) {
  const [sens, setSens] = useState<SensFilter>('all');
  const [action, setAction] = useState<ActionFilter>('all');

  const filtered = events
    .filter((e) => sens === 'all' || e.sensitivityCode === sens)
    .filter((e) => action === 'all' || e.actionCode === action)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const btnSx = {
    textTransform: 'none',
    fontSize: '0.75rem',
    fontWeight: 600,
    px: 1.5,
    py: 0.5,
    border: '1px solid #e2e8f0 !important',
    '&.Mui-selected': { backgroundColor: '#0f172a', color: '#fff', borderColor: '#0f172a !important' },
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header + filters */}
        <Box className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Access Event Log
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} shown
            </Typography>
          </Box>

          <Box className="flex flex-wrap gap-2">
            <ToggleButtonGroup
              value={sens}
              exclusive
              onChange={(_, v) => v && setSens(v)}
              size="small"
            >
              {(['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SensFilter[]).map((v) => (
                <ToggleButton key={v} value={v} sx={btnSx}>
                  {v === 'all' ? 'All Severity' : v.charAt(0) + v.slice(1).toLowerCase()}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={action}
              exclusive
              onChange={(_, v) => v && setAction(v)}
              size="small"
            >
              {(['all', 'READ', 'EXPORT', 'DELETE', 'SHARE'] as ActionFilter[]).map((v) => (
                <ToggleButton key={v} value={v} sx={btnSx}>
                  {v === 'all' ? 'All Actions' : v.charAt(0) + v.slice(1).toLowerCase()}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Event list */}
        <Box className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>
              No events match the selected filters.
            </Typography>
          ) : (
            filtered.map((e, i) => (
              <EventCard
                key={e.id}
                event={e}
                delay={`delay-${Math.min(i, 5)}`}
              />
            ))
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
