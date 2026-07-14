import { createTheme, type Theme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

export const BRAND_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #a855f7 100%)';
export const CHART_PRIMARY = '#6366f1';

export function makeTheme(mode: ColorMode): Theme {
  const light = mode === 'light';
  return createTheme({
    palette: {
      mode,
      primary: light
        ? { main: '#4f46e5', light: '#6366f1', dark: '#3730a3' }
        : { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1' },
      secondary: { main: '#06b6d4' },
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      background: light
        ? { default: '#eef1f6', paper: '#ffffff' }
        : { default: '#0b1120', paper: '#111a2e' },
      divider: light ? '#e2e8f0' : 'rgba(148, 163, 184, 0.16)',
      text: light
        ? { primary: '#0f172a', secondary: '#64748b' }
        : { primary: '#e2e8f0', secondary: '#94a3b8' },
    },
    typography: {
      fontFamily:
        '"Inter", "Segoe UI Variable", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.03em' },
      h5: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      caption: { letterSpacing: '0.02em' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: light
              ? 'radial-gradient(1000px 500px at 85% -10%, rgba(99,102,241,0.10), transparent 60%), radial-gradient(800px 400px at -10% 0%, rgba(6,182,212,0.08), transparent 55%)'
              : 'radial-gradient(1000px 500px at 85% -10%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(800px 400px at -10% 0%, rgba(6,182,212,0.10), transparent 55%)',
            backgroundAttachment: 'fixed',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${light ? '#e2e8f0' : 'rgba(148,163,184,0.16)'}`,
            borderRadius: 16,
            transition: 'box-shadow .2s ease, transform .2s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, boxShadow: 'none' },
        },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              background: BRAND_GRADIENT,
              '&:hover': { boxShadow: '0 8px 20px -6px rgba(99,102,241,0.55)' },
            },
          },
        ],
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: light ? '#eef1f6' : 'rgba(148,163,184,0.10)' },
          head: {
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            backgroundColor: light ? '#1e1b4b' : '#0f172a',
            color: '#c7d2fe',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 99 }, bar: { borderRadius: 99 } },
      },
      MuiTabs: {
        styleOverrides: { indicator: { height: 3, borderRadius: 3 } },
      },
      MuiTab: {
        styleOverrides: { root: { minHeight: 48 } },
      },
    },
  });
}
