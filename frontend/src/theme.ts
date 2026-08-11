import { createTheme, PaletteMode } from '@mui/material/styles';

// ─── Design tokens — "blue hi-tech" direction ───────────────────────────────
// Light values map 1:1 to the approved design concept's CSS custom properties
// (--bg/--surface/--accent/etc). Dark values are a derived companion palette —
// the concept itself pins identical tokens for light/dark ("single visual
// world by request"), but this app's dark mode is a real, separately-tested
// feature, so dark keeps its own contrast-checked variant of the same accents
// rather than being dropped. `accent` dark value (#7db6ff) is lifted directly
// from the concept's own dark-context highlight color (used on its bulk-action
// bar) so it stays a deliberate reference point, not a guess.
const tokens = {
  light: {
    bg: '#f3f6fc',
    surface: '#ffffff',
    surface2: '#eef2f9',
    surface3: '#e3e9f3',
    border: '#e5eaf3',
    borderStrong: '#cfd8e8',
    text: '#101828',
    textMute: '#64748b',
    textFaint: '#98a2b8',
    accent: '#2563eb',
    accentSoft: 'rgba(37,99,235,.08)',
    accent2: '#06b6d4',
    available: '#16a34a',
    availableSoft: 'rgba(22,163,74,.1)',
    maintenance: '#d97706',
    maintenanceSoft: 'rgba(217,119,6,.1)',
    danger: '#dc2626',
    dangerSoft: 'rgba(220,38,38,.09)',
    retired: '#64748b',
    retiredSoft: 'rgba(100,116,139,.1)',
  },
  dark: {
    bg: '#0f172a',
    surface: '#1a2332',
    surface2: '#212c40',
    surface3: '#29354c',
    border: '#2b3852',
    borderStrong: '#3c4a68',
    text: '#eef2f9',
    textMute: '#94a3b8',
    textFaint: '#64748b',
    accent: '#7db6ff',
    accentSoft: 'rgba(125,182,255,.15)',
    accent2: '#22d3ee',
    available: '#4ade80',
    availableSoft: 'rgba(74,222,128,.14)',
    maintenance: '#fb923c',
    maintenanceSoft: 'rgba(251,146,60,.14)',
    danger: '#f87171',
    dangerSoft: 'rgba(248,113,113,.14)',
    retired: '#94a3b8',
    retiredSoft: 'rgba(148,163,184,.14)',
  },
};

export const getAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';
  const t = isDark ? tokens.dark : tokens.light;
  const gradient = `linear-gradient(150deg, ${t.accent}, ${t.accent2})`;

  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
      },
    },
    palette: {
      mode,
      primary: {
        main: t.accent,
        light: isDark ? '#a8d1ff' : '#4d7ff0',
        dark: isDark ? '#4d7ff0' : '#1d4ed8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: t.accent2,
        light: isDark ? '#67e3f5' : '#22d3ee',
        dark: isDark ? '#0891b2' : '#0e7490',
        contrastText: isDark ? '#001b21' : '#ffffff',
      },
      success: {
        main: t.available,
        light: t.availableSoft,
        dark: isDark ? '#16a34a' : '#15803d',
      },
      error: {
        main: t.danger,
        light: t.dangerSoft,
        dark: isDark ? '#dc2626' : '#b91c1c',
      },
      info: {
        main: t.accent,
        light: isDark ? '#a8d1ff' : '#4d7ff0',
        dark: isDark ? '#4d7ff0' : '#1d4ed8',
      },
      warning: {
        main: t.maintenance,
        light: t.maintenanceSoft,
        dark: isDark ? '#d97706' : '#b45309',
      },
      background: {
        default: t.bg,
        paper: t.surface,
      },
      text: {
        primary: t.text,
        secondary: t.textMute,
      },
      divider: t.border,
    },

    shape: { borderRadius: 14 },

    typography: {
      fontFamily: 'Inter, "Sarabun", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      fontSize: 14,
      h1: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h4: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, color: t.text },
      h5: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.35 },
      h6: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.35 },
      body1: { fontSize: '1rem', lineHeight: 1.5, color: t.text },
      body2: { fontSize: '0.875rem', lineHeight: 1.45, color: t.textMute },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em', fontSize: '0.875rem' },
      subtitle1: { fontWeight: 600, color: t.text, fontSize: '0.875rem' },
      subtitle2: { fontWeight: 600, color: t.textMute, fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', fontWeight: 500, color: t.textMute },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': { boxSizing: 'border-box' },
          'img, video, svg': { maxWidth: '100%', height: 'auto' },
          body: {
            backgroundColor: t.bg,
            minHeight: '100vh',
            margin: 0,
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.borderStrong} ${t.bg}`,
            '&::-webkit-scrollbar': { width: '5px', height: '5px' },
            '&::-webkit-scrollbar-track': { background: t.bg },
            '&::-webkit-scrollbar-thumb': { background: t.borderStrong, borderRadius: '3px' },
            '&::-webkit-scrollbar-thumb:hover': { background: t.textFaint },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderRadius: 10,
            padding: '7px 16px',
            minHeight: 44,
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '@media (min-width:768px)': {
              minHeight: 36,
            },
            '&:hover': {
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
          },
          containedPrimary: {
            background: gradient,
            color: '#ffffff',
            '&:hover': {
              background: gradient,
              filter: 'brightness(1.08)',
              boxShadow: `0 10px 22px -10px ${t.accent}`,
            },
          },
          outlinedPrimary: {
            border: `1px solid ${t.borderStrong}`,
            backgroundColor: isDark ? 'transparent' : t.surface,
            color: t.text,
            '&:hover': {
              backgroundColor: t.accentSoft,
              borderColor: t.accent,
              color: t.accent,
              boxShadow: `0 2px 8px ${t.accentSoft}`,
            },
          },
          text: {
            color: t.accent,
            '&:hover': { backgroundColor: t.accentSoft },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: t.surface,
            backgroundImage: isDark
              ? 'none'
              : `linear-gradient(180deg, ${t.surface}, ${t.surface} 60%, ${t.surface2})`,
            border: `1px solid ${t.border}`,
            boxShadow: isDark ? '0 10px 28px -12px rgba(0,0,0,0.5)' : '0 10px 28px -12px rgba(16,24,40,.12)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isDark ? '0 14px 34px -12px rgba(0,0,0,0.6)' : '0 14px 34px -14px rgba(16,24,40,.18)',
              borderColor: t.borderStrong,
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: '16px', '&:last-child': { paddingBottom: '16px' } },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            boxShadow: 'none',
          },
          rounded: { borderRadius: 14 },
          elevation1: { boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.4)' : '0 6px 18px rgba(16,24,40,.08)' },
          elevation2: { boxShadow: isDark ? '0 10px 28px -12px rgba(0,0,0,0.5)' : '0 10px 28px -12px rgba(16,24,40,.12)' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(26,35,50,0.78)' : 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none',
            borderBottom: `1px solid ${t.border}`,
            color: t.text,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.surface,
            borderRight: `1px solid ${t.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: { minHeight: '50px !important', '@media (min-width: 600px)': { minHeight: '50px !important' } },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: t.surface2,
              borderRadius: 10,
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              '& fieldset': { borderColor: t.border, borderWidth: '1px' },
              '&:hover fieldset': { borderColor: t.accent },
              '&.Mui-focused': { backgroundColor: t.surface },
              '&.Mui-focused fieldset': {
                borderColor: t.accent,
                borderWidth: '1.5px',
                boxShadow: `0 0 0 3px ${t.accentSoft}`,
              },
              '&.Mui-error fieldset': {
                borderColor: t.danger,
              },
              '&.Mui-error.Mui-focused fieldset': {
                boxShadow: `0 0 0 3px ${t.dangerSoft}`,
              },
            },
            '& .MuiInputLabel-root': { color: t.textMute, fontSize: '0.875rem' },
            '& .MuiInputLabel-root.Mui-focused': { color: t.accent },
            '& .MuiInputLabel-root.Mui-error': { color: t.danger },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: '0.7rem',
            fontWeight: 500,
            marginLeft: 4,
            marginTop: 4,
            '&.Mui-error': {
              color: t.danger,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.7rem', borderRadius: '8px', height: '22px' },
          filled: { border: 'none' },
          outlined: { borderWidth: '1px' },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            '& .MuiTableHead-root .MuiTableCell-head': {
              backgroundColor: t.surface2,
              color: t.textFaint,
              fontWeight: 700,
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${t.border}`,
              padding: '12px 16px',
            },
            '& .MuiTableRow-root .MuiTableCell-body': {
              borderBottom: `1px solid ${t.border}`,
              color: t.text,
              padding: '12px 16px',
              fontSize: '0.875rem',
            },
            '& .MuiTableRow-root:hover .MuiTableCell-body': {
              backgroundColor: t.surface2,
            },
            '& .MuiTableRow-root:last-child .MuiTableCell-body': {
              borderBottom: 'none',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? t.surface3 : t.text,
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.725rem',
            fontWeight: 500,
            borderRadius: '6px',
            padding: '6px 10px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: t.surface,
            border: isDark ? `1px solid ${t.border}` : 'none',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            borderRadius: 16,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: '18px 20px 12px', borderBottom: `1px solid ${t.border}`, fontSize: '1rem', fontWeight: 600 },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: '16px 20px' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 20px 16px', borderTop: `1px solid ${t.border}` } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            borderRadius: 10,
            padding: '4px',
          },
          list: { padding: 0 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 12px',
            margin: '1px 0',
            minHeight: 44,
            '@media (min-width:768px)': { minHeight: 32 },
            fontSize: '0.8125rem',
            '&:hover': { backgroundColor: t.surface2 },
            '&.Mui-selected': {
              backgroundColor: t.accentSoft,
              color: t.accent,
              fontWeight: 600,
            },
            '&.Mui-selected:hover': { backgroundColor: t.accentSoft },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 9,
            padding: '7px 12px',
            margin: '1px 8px',
            minHeight: 44,
            '@media (min-width:768px)': { minHeight: 36 },
            fontSize: '0.8125rem',
            '&.Mui-selected': {
              backgroundColor: t.accentSoft,
              color: t.accent,
              fontWeight: 700,
              '&:hover': { backgroundColor: t.accentSoft },
            },
            '&:hover': { backgroundColor: t.surface2 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            minWidth: 44,
            '@media (min-width:768px)': { minHeight: 36, minWidth: 36 },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 34, color: t.textMute } },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface2,
            borderRadius: 10,
            fontSize: '0.8125rem',
            '&:hover': { backgroundColor: t.surface3 },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: '2px', borderRadius: '2px 2px 0 0', backgroundColor: t.accent },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            minHeight: '40px',
            padding: '6px 14px',
            color: t.textMute,
            '&.Mui-selected': { color: t.accent, fontWeight: 600 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, borderWidth: '1px', fontSize: '0.8125rem' },
          // Light mode: MUI's built-in standard-variant text color for these
          // severities was resolving to a near-transparent tint (alpha ~0.1),
          // making the text unreadable against the soft background. Pin an
          // explicit solid, dark shade per severity instead of relying on
          // MUI's default computation.
          standardSuccess: { backgroundColor: t.availableSoft, borderColor: t.available, color: isDark ? t.text : '#065f46' },
          standardError: { backgroundColor: t.dangerSoft, borderColor: t.danger, color: isDark ? t.text : '#7f1d1d' },
          standardWarning: { backgroundColor: t.maintenanceSoft, borderColor: t.maintenance, color: isDark ? t.text : '#78350f' },
          standardInfo: { backgroundColor: t.accentSoft, borderColor: t.accent, color: isDark ? t.text : '#1e3a8a' },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: t.border, borderWidth: '0.5px' } },
      },
    },
  });
};

export default getAppTheme;
