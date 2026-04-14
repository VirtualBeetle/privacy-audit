import Chip from '@mui/material/Chip';
import type { AuditEvent } from '../../types';

const CONFIG: Record<AuditEvent['actorType'], { label: string; color: string; bg: string }> = {
  SYSTEM:      { label: 'System',      color: '#1e40af', bg: '#dbeafe' },
  EMPLOYEE:    { label: 'Employee',    color: '#5b21b6', bg: '#ede9fe' },
  THIRD_PARTY: { label: 'Third Party', color: '#c2410c', bg: '#ffedd5' },
  OTHER_USER:  { label: 'Other User',  color: '#374151', bg: '#f3f4f6' },
};

export default function ActorBadge({ type }: { type: AuditEvent['actorType'] }) {
  const c = CONFIG[type] ?? CONFIG.SYSTEM;
  return (
    <Chip
      label={c.label}
      size="small"
      sx={{
        backgroundColor: c.bg,
        color: c.color,
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 22,
        borderRadius: '4px',
      }}
    />
  );
}
