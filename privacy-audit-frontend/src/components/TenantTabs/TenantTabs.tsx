import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Apps as AppsIcon, Favorite as FavoriteIcon, People as PeopleIcon } from '@mui/icons-material';
import type { TenantFilter } from '../../types';

interface TabDef {
  value: TenantFilter;
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bg: string;
}

interface Props {
  value: TenantFilter;
  onChange: (v: TenantFilter) => void;
  counts: { all: number; health: number; social: number };
}

export default function TenantTabs({ value, onChange, counts }: Props) {
  const tabs: TabDef[] = [
    { value: 'all',    label: 'All Apps',      icon: <AppsIcon sx={{ fontSize: 16 }} />,     count: counts.all,    color: '#6366f1', bg: '#eef2ff' },
    { value: 'health', label: 'HealthTrack',   icon: <FavoriteIcon sx={{ fontSize: 16 }} />,  count: counts.health, color: '#ef4444', bg: '#fef2f2' },
    { value: 'social', label: 'ConnectSocial', icon: <PeopleIcon sx={{ fontSize: 16 }} />,    count: counts.social, color: '#0ea5e9', bg: '#f0f9ff' },
  ];

  return (
    <Box
      sx={{
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        px: { xs: 2, md: 4 },
        py: 1.5,
      }}
    >
      <Box className="flex gap-2">
        {tabs.map((tab) => {
          const active = value === tab.value;
          return (
            <Box
              key={tab.value}
              onClick={() => onChange(tab.value)}
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
    </Box>
  );
}
