import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import AppsIcon from '@mui/icons-material/Apps';
import { Favorite as FavoriteIcon, People as PeopleIcon } from '@mui/icons-material';
import type { LinkedAccount } from '../../types';
import type { SessionType } from '../../contexts/AuthContext';

// ─── Known tenant metadata ────────────────────────────────────────────────────
export const HEALTH_TENANT_ID = '11111111-1111-1111-1111-111111111111';
export const SOCIAL_TENANT_ID = '22222222-2222-2222-2222-222222222222';

interface TenantMeta {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const TENANT_META: Record<string, TenantMeta> = {
  [HEALTH_TENANT_ID]: {
    label: 'HealthTrack',
    icon: <FavoriteIcon sx={{ fontSize: 16 }} />,
    color: '#ef4444',
    bg: '#fef2f2',
  },
  [SOCIAL_TENANT_ID]: {
    label: 'ConnectSocial',
    icon: <PeopleIcon sx={{ fontSize: 16 }} />,
    color: '#0ea5e9',
    bg: '#f0f9ff',
  },
};

const fallbackMeta = (tenantId: string): TenantMeta => ({
  label: `App ${tenantId.slice(0, 6)}`,
  icon: <AppsIcon sx={{ fontSize: 16 }} />,
  color: '#6366f1',
  bg: '#eef2ff',
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  sessionType: SessionType;
  linkedAccounts: LinkedAccount[];
  value: string;
  onChange: (v: string) => void;
  onConnect: () => void;
  eventCounts: Record<string, number>;
}

export default function TenantTabs({
  sessionType,
  linkedAccounts,
  value,
  onChange,
  onConnect,
  eventCounts,
}: Props) {
  // dashboard_session: no tabs — the header already says which app this is
  if (sessionType === 'dashboard_session') return null;

  // google_session with no linked accounts: no tabs (empty state is shown in Dashboard)
  if (linkedAccounts.length === 0) return null;

  const tabs = [
    {
      id: 'all',
      ...(TENANT_META['all'] ?? {
        label: 'All Apps',
        icon: <AppsIcon sx={{ fontSize: 16 }} />,
        color: '#6366f1',
        bg: '#eef2ff',
      }),
      count: eventCounts['all'] ?? 0,
    },
    ...linkedAccounts.map((acc) => ({
      id: acc.tenantId,
      ...(TENANT_META[acc.tenantId] ?? fallbackMeta(acc.tenantId)),
      count: eventCounts[acc.tenantId] ?? 0,
    })),
  ];

  // Override "all" entry with correct meta
  tabs[0] = {
    id: 'all',
    label: 'All Apps',
    icon: <AppsIcon sx={{ fontSize: 16 }} />,
    color: '#6366f1',
    bg: '#eef2ff',
    count: eventCounts['all'] ?? 0,
  };

  return (
    <Box
      sx={{
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        px: { xs: 2, md: 4 },
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Tabs */}
      <Box className="flex gap-2">
        {tabs.map((tab) => {
          const active = value === tab.id;
          return (
            <Box
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex items-center gap-2 cursor-pointer select-none"
              sx={{
                px: 2,
                py: 1,
                borderRadius: '10px',
                transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                backgroundColor: active ? tab.color : 'transparent',
                boxShadow: active ? `0 4px 12px ${tab.color}40` : 'none',
                transform: active ? 'scale(1.03)' : 'scale(1)',
                '&:hover': {
                  backgroundColor: active ? tab.color : tab.bg,
                  transform: 'scale(1.03)',
                },
              }}
            >
              <Box sx={{ color: active ? '#fff' : tab.color, display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  color: active ? '#fff' : '#374151',
                  transition: 'color 0.2s',
                }}
              >
                {tab.label}
              </Typography>
              <Box
                sx={{
                  px: 0.9,
                  py: 0.1,
                  borderRadius: '6px',
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : tab.bg,
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: active ? '#fff' : tab.color }}>
                  {tab.count}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Connect button */}
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onConnect}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.78rem',
          borderRadius: '10px',
          borderColor: '#6366f1',
          color: '#6366f1',
          px: 2,
          py: 0.75,
          '&:hover': {
            backgroundColor: '#eef2ff',
            borderColor: '#4f46e5',
          },
        }}
      >
        Connect application
      </Button>
    </Box>
  );
}
