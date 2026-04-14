import Chip from '@mui/material/Chip';
import type { AuditEvent } from '../../types';

const CONFIG: Record<AuditEvent['sensitivityCode'], { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Low',      color: '#166534', bg: '#dcfce7' },
  MEDIUM:   { label: 'Medium',   color: '#92400e', bg: '#fef3c7' },
  HIGH:     { label: 'High',     color: '#9a3412', bg: '#ffedd5' },
  CRITICAL: { label: 'Critical', color: '#991b1b', bg: '#fee2e2' },
};

export default function SensitivityBadge({ code }: { code: AuditEvent['sensitivityCode'] }) {
  const c = CONFIG[code] ?? CONFIG.LOW;
  return (
    <Chip
      label={c.label}
      size="small"
      sx={{
        backgroundColor: c.bg,
        color: c.color,
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 22,
        borderRadius: '4px',
      }}
    />
  );
}
