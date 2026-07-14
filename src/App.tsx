import { useMemo, useState } from 'react';
import { HashRouter, Route, Routes, Link as RouterLink } from 'react-router-dom';
import { AppBar, Box, Container, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { makeTheme, BRAND_GRADIENT, type ColorMode } from './theme';
import AssessmentListPage from './pages/AssessmentListPage';
import AssessmentPage from './pages/AssessmentPage';

export default function App() {
  const [mode, setMode] = useState<ColorMode>(() => {
    try {
      return (localStorage.getItem('epa-color-mode') as ColorMode) || 'light';
    } catch {
      return 'light';
    }
  });
  const theme = useMemo(() => makeTheme(mode), [mode]);
  const toggleMode = () =>
    setMode((m) => {
      const next: ColorMode = m === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('epa-color-mode', next);
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <AppBar
          position="sticky"
          elevation={0}
          className="no-print"
          sx={{
            bgcolor: mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(11,17,32,0.82)',
            color: 'text.primary',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'inherit',
                flex: 1,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  background: BRAND_GRADIENT,
                  color: '#fff',
                  boxShadow: '0 8px 20px -8px rgba(99,102,241,0.7)',
                  flexShrink: 0,
                }}
              >
                <InsightsRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                  Enterprise Project Assessment
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                  Complexity Scoring &amp; Classification Framework
                </Typography>
              </Box>
            </Box>
            <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton onClick={toggleMode} sx={{ border: '1px solid', borderColor: 'divider' }}>
                {mode === 'light' ? (
                  <DarkModeRoundedIcon fontSize="small" />
                ) : (
                  <LightModeRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ py: 3.5 }}>
          <Routes>
            <Route path="/" element={<AssessmentListPage />} />
            <Route path="/assessment/:id" element={<AssessmentPage />} />
          </Routes>
        </Container>
      </HashRouter>
    </ThemeProvider>
  );
}
