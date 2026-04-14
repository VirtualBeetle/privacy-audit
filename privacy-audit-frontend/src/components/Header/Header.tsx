import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import LogoutIcon from '@mui/icons-material/Logout';
import LinkIcon from '@mui/icons-material/Link';
import WebhookIcon from '@mui/icons-material/Webhook';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Shield as ShieldIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const displayName =
    user?.displayName ??
    (user?.tenantUserId ? `User ${user.tenantUserId.slice(0, 8)}` : 'Guest');

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        backgroundSize: '200% 200%',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 4 }, minHeight: '64px !important' }}>
        {/* Logo */}
        <Box
          className="flex items-center gap-2 flex-1"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(56,189,248,0.4)',
            }}
          >
            <ShieldIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px', lineHeight: 1, fontSize: '1.1rem' }}
            >
              DataGuard
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Privacy Dashboard
            </Typography>
          </Box>
        </Box>

        {/* Right section */}
        <Box className="flex items-center gap-3">
          {/* Session type badge */}
          {isAuthenticated && user && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: '20px',
                background: user.type === 'google_session'
                  ? 'rgba(56,189,248,0.15)'
                  : 'rgba(129,140,248,0.15)',
                border: `1px solid ${user.type === 'google_session' ? 'rgba(56,189,248,0.3)' : 'rgba(129,140,248,0.3)'}`,
              }}
            >
              <Typography sx={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 600 }}>
                {user.type === 'google_session' ? 'Google' : 'Tenant session'}
              </Typography>
            </Box>
          )}

          {/* Live indicator */}
          <Box className="flex items-center gap-1.5">
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 6px #22c55e',
                animation: 'pulseRing 2s ease-out infinite',
              }}
            />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>Live</Typography>
          </Box>

          <Box sx={{ width: '1px', height: 20, backgroundColor: 'rgba(255,255,255,0.1)' }} />

          {isAuthenticated ? (
            <>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                {displayName}
              </Typography>
              <Avatar
                src={user?.avatarUrl ?? undefined}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(56,189,248,0.35)',
                  cursor: 'pointer',
                }}
              >
                {initials}
              </Avatar>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1,
                      borderRadius: 2,
                      minWidth: 180,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      border: '1px solid #e2e8f0',
                    },
                  },
                } as any}
              >
                {user?.type === 'dashboard_session' && (
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null);
                      navigate('/dashboard');
                    }}
                  >
                    <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
                    Link Google account
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => { setAnchorEl(null); navigate('/webhooks'); }}
                >
                  <ListItemIcon><WebhookIcon fontSize="small" /></ListItemIcon>
                  Webhooks
                </MenuItem>
                <MenuItem
                  onClick={() => { setAnchorEl(null); navigate('/onboard'); }}
                >
                  <ListItemIcon><PersonAddIcon fontSize="small" /></ListItemIcon>
                  Onboard new tenant
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('/login')}
            >
              Sign in
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
