import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Favorite as FavoriteIcon, People as PeopleIcon } from '@mui/icons-material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';

interface AppOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  url: string;
}

const APPS: AppOption[] = [
  {
    id: 'health',
    label: 'HealthTrack',
    description: 'Healthcare platform — medical records, appointments, prescriptions',
    icon: <FavoriteIcon sx={{ fontSize: 28 }} />,
    color: '#ef4444',
    bg: '#fef2f2',
    url: 'http://health.local',
  },
  {
    id: 'social',
    label: 'ConnectSocial',
    description: 'Social media platform — posts, check-ins, ad targeting data',
    icon: <PeopleIcon sx={{ fontSize: 28 }} />,
    color: '#0ea5e9',
    bg: '#f0f9ff',
    url: 'http://social.local',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ConnectAppModal({ open, onClose }: Props) {
  const [selected, setSelected] = useState<AppOption | null>(null);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          },
        },
      } as any}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          fontWeight: 800,
          color: '#0f172a',
        }}
      >
        <Box>
          {selected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ mr: 0.5 }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              Connect {selected.label}
            </Box>
          ) : (
            'Connect an application'
          )}
        </Box>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {!selected ? (
          /* Step 1: choose app */
          <Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Connect an app to start seeing how it uses your personal data — all in one place.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {APPS.map((app) => (
                <Paper
                  key={app.id}
                  elevation={0}
                  onClick={() => setSelected(app)}
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    border: '1.5px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.18s ease',
                    '&:hover': {
                      borderColor: app.color,
                      backgroundColor: app.bg,
                      transform: 'translateY(-1px)',
                      boxShadow: `0 4px 16px ${app.color}25`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      backgroundColor: app.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: app.color,
                      flexShrink: 0,
                    }}
                  >
                    {app.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      {app.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
                      {app.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          /* Step 2: instructions */
          <Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Follow these steps to link your {selected.label} account to your Google identity.
            </Typography>

            {[
              {
                step: 1,
                text: `Open ${selected.label} and sign in with your account.`,
              },
              {
                step: 2,
                text: 'Go to your profile or settings.',
              },
              {
                step: 3,
                text: 'Click "View my privacy dashboard" — you\'ll be redirected here automatically.',
              },
              {
                step: 4,
                text: 'Confirm the link when prompted, and your data will appear here.',
              },
            ].map(({ step, text }) => (
              <Box key={step} sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: selected.color,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.1,
                  }}
                >
                  {step}
                </Box>
                <Typography variant="body2" sx={{ color: '#374151', pt: 0.4, lineHeight: 1.6 }}>
                  {text}
                </Typography>
              </Box>
            ))}

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mt: 1,
              }}
            >
              <CheckCircleOutlineIcon sx={{ color: '#22c55e', fontSize: 20, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: '#475569' }}>
                Your privacy data from {selected.label} will appear on this dashboard within seconds of linking.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b' }}>
          Cancel
        </Button>
        {selected && (
          <Button
            variant="contained"
            endIcon={<OpenInNewIcon />}
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              backgroundColor: selected.color,
              boxShadow: `0 4px 14px ${selected.color}40`,
              '&:hover': {
                backgroundColor: selected.color,
                filter: 'brightness(0.9)',
              },
            }}
          >
            Open {selected.label}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
