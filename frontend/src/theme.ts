import { createTheme, PaletteMode } from '@mui/material/styles';

// ─── Design tokens ──────────────────────────────────────────────────────────
// Light values are taken verbatim from design_handoff_itam/DESIGN-TOKENS.md —
// treat that file as the source of truth and don't hand-tune these.
//
// The handoff only specifies light mode (plus a dark palette for the ops-room
// floor plan). Dark mode is a real, separately-tested feature of this app, so
// it stays: every dark accent below is lifted from the handoff's own dark
// floor-plan palette (#22d3ee / #60a5fa / #a78bfa / #34d399 / #fbbf24 /
// #f87171) and the surfaces are derived from its #071120 → #0b1524 pair, so
// dark reads as the same visual family rather than a separate guess.
const tokens = {
  light: {
    bg: '#f4f7fc',
    // Full app background from the handoff. `bg` above is the flat fallback
    // (the gradient's outer stop) for anywhere a solid color is required.
    bgGradient: 'radial-gradient(1200px 700px at 60% -10%, #eef3fb 0%, #f4f7fc 60%)',
    surface: '#ffffff',
    surface2: '#f8fafc', // surface-sunken — inputs, sub-rows, in-card panels
    surface3: '#f4f7fb', // surface-alt — sub-table headers, icon boxes
    border: '#e3e9f2',
    borderStrong: '#dde5f0',
    borderInput: '#d6dfec',
    divider: '#edf1f7',
    borderDashed: '#cfd9e8',
    text: '#15243c',
    textStrong: '#1f3350',
    textBody: '#31435c',
    textMute: '#68788e',
    textMute2: '#54637a',
    textSubtle: '#7a889c',
    textFaint: '#a3b0c2',
    textDisabled: '#c9d4e3',
    accent: '#0891b2',
    accentDark: '#0e7490',
    accentSoft: 'rgba(8,145,178,.1)',
    accentBg: '#f0fbfe',
    accent2: '#2563eb', // info blue — second stop of the primary gradient
    available: '#059669',
    availableDark: '#047857',
    availableSoft: 'rgba(5,150,105,.1)',
    availableBg: '#f0fdf4',
    maintenance: '#c2820a',
    maintenanceDark: '#b45309',
    maintenanceSoft: 'rgba(194,130,10,.1)',
    maintenanceBg: '#fffaf5',
    danger: '#dc2626',
    dangerDark: '#b91c1c',
    dangerSoft: 'rgba(220,38,38,.1)',
    dangerBg: '#fff5f5',
    purple: '#7c3aed', // company scope / borrow
    purpleDark: '#6d28d9',
    purpleSoft: 'rgba(124,58,237,.1)',
    purpleBg: '#faf7ff',
    retired: '#54637a',
    retiredSoft: 'rgba(107,120,140,.1)',
    retiredBg: '#f8fafc',
  },
  dark: {
    bg: '#071120',
    bgGradient: 'radial-gradient(1200px 700px at 60% -10%, #0b1524 0%, #071120 60%)',
    surface: '#0b1524',
    surface2: '#101d31',
    surface3: '#16263d',
    border: '#1c2f49',
    borderStrong: '#294060',
    borderInput: '#294060',
    divider: '#16263d',
    borderDashed: '#294060',
    text: '#eaf6ff',
    textStrong: '#ffffff',
    textBody: '#d3e3f5',
    textMute: '#9fb3cc',
    textMute2: '#b3c5da',
    textSubtle: '#8298b3',
    textFaint: '#6b8099',
    textDisabled: '#44586f',
    accent: '#22d3ee',
    accentDark: '#67e8f9',
    accentSoft: 'rgba(34,211,238,.15)',
    accentBg: 'rgba(34,211,238,.08)',
    accent2: '#60a5fa',
    available: '#34d399',
    availableDark: '#6ee7b7',
    availableSoft: 'rgba(52,211,153,.15)',
    availableBg: 'rgba(52,211,153,.08)',
    maintenance: '#fbbf24',
    maintenanceDark: '#fcd34d',
    maintenanceSoft: 'rgba(251,191,36,.15)',
    maintenanceBg: 'rgba(251,191,36,.08)',
    danger: '#f87171',
    dangerDark: '#fca5a5',
    dangerSoft: 'rgba(248,113,113,.15)',
    dangerBg: 'rgba(248,113,113,.08)',
    purple: '#a78bfa',
    purpleDark: '#c4b5fd',
    purpleSoft: 'rgba(167,139,250,.15)',
    purpleBg: 'rgba(167,139,250,.08)',
    retired: '#94a3b8',
    retiredSoft: 'rgba(148,163,184,.14)',
    retiredBg: 'rgba(148,163,184,.08)',
  },
};

export const getAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';
  const t = isDark ? tokens.dark : tokens.light;
  const gradient = `linear-gradient(120deg, ${t.accent}, ${t.accent2})`;

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
        light: t.accentSoft,
        dark: t.accentDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: t.purple,
        light: t.purpleSoft,
        dark: t.purpleDark,
        contrastText: '#ffffff',
      },
      success: {
        main: t.available,
        light: t.availableSoft,
        dark: t.availableDark,
      },
      error: {
        main: t.danger,
        light: t.dangerSoft,
        dark: t.dangerDark,
      },
      info: {
        main: t.accent2,
        light: isDark ? 'rgba(96,165,250,.15)' : 'rgba(37,99,235,.1)',
        dark: isDark ? '#93c5fd' : '#1d4ed8',
      },
      warning: {
        main: t.maintenance,
        light: t.maintenanceSoft,
        dark: t.maintenanceDark,
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

    // Base radius = inputs/buttons (11–12px). Larger surfaces set their own:
    // cards 20px, KPI cards 18px, tabs 10px, icon buttons 8–9px, chips 999px.
    shape: { borderRadius: 12 },

    typography: {
      // Thai-first pairing from the handoff. `numeric` below is exported for
      // figures/codes/IDs, which the handoff pins to the Latin cut so digits
      // stay tabular.
      fontFamily: '"IBM Plex Sans Thai", "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      h1: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 },
      // Page title — 24px/700
      h4: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em', lineHeight: 1.3, color: t.text },
      h5: { fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0', lineHeight: 1.35 },
      // Card title — 15px/600
      h6: { fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '0', lineHeight: 1.35 },
      // Body / table text — 13px
      body1: { fontSize: '0.8125rem', lineHeight: 1.5, color: t.text },
      // Descriptions — 12.5px
      body2: { fontSize: '0.78125rem', lineHeight: 1.45, color: t.textMute },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em', fontSize: '0.84375rem' },
      // Sub-headings — 14px / 13.5px
      subtitle1: { fontWeight: 600, color: t.text, fontSize: '0.875rem' },
      subtitle2: { fontWeight: 600, color: t.textMute, fontSize: '0.84375rem' },
      caption: { fontSize: '0.75rem', fontWeight: 400, color: t.textMute },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': { boxSizing: 'border-box' },
          'img, video, svg': { maxWidth: '100%', height: 'auto' },
          body: {
            backgroundColor: t.bg,
            backgroundImage: t.bgGradient,
            backgroundAttachment: 'fixed',
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
        // Handoff "กล่องข้อความเตือน": padding 12/14, radius 13–14, 12.5px.
        // Text color is pinned per severity — MUI's own computed color for the
        // standard variant resolved to a near-transparent tint here, which
        // made alert text unreadable against the soft background.
        styleOverrides: {
          root: { borderRadius: 14, borderWidth: '1px', borderStyle: 'solid', padding: '12px 14px', fontSize: '0.78125rem' },
          standardSuccess: { backgroundColor: t.availableBg, borderColor: 'rgba(5,150,105,.3)', color: isDark ? t.text : t.availableDark },
          standardError: { backgroundColor: t.dangerBg, borderColor: 'rgba(220,38,38,.26)', color: isDark ? t.text : t.dangerDark },
          standardWarning: { backgroundColor: t.maintenanceBg, borderColor: 'rgba(194,130,10,.3)', color: isDark ? t.text : '#92400e' },
          standardInfo: { backgroundColor: t.accentBg, borderColor: 'rgba(8,145,178,.3)', color: isDark ? t.text : t.accentDark },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: t.border, borderWidth: '0.5px' } },
      },
      // Handoff "สวิตช์เปิด/ปิด": 30×17 track, 13×13 thumb, 2px inset.
      MuiSwitch: {
        styleOverrides: {
          root: { width: 30, height: 17, padding: 0, display: 'flex' },
          switchBase: {
            padding: 2,
            color: '#ffffff',
            '&.Mui-checked': {
              transform: 'translateX(13px)',
              color: '#ffffff',
              '& + .MuiSwitch-track': { backgroundColor: t.accent, opacity: 1 },
            },
          },
          thumb: { width: 13, height: 13, boxShadow: 'none' },
          track: { borderRadius: 999, backgroundColor: t.border, opacity: 1 },
        },
      },
      // Handoff "แถบความคืบหน้า": 6–9px rail, fully rounded.
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 6, borderRadius: 99, backgroundColor: isDark ? t.surface3 : '#eef2f7' },
          bar: { borderRadius: 99 },
        },
      },
      // Handoff "Avatar": 2-letter initials in the Latin cut, tinted disc.
      MuiAvatar: {
        styleOverrides: {
          root: {
            width: 28,
            height: 28,
            fontSize: '0.65625rem',
            fontWeight: 700,
            fontFamily: numericFontFamily,
          },
        },
      },
    },
  });
};

/**
 * Figures, codes, serials and IDs use the Latin cut so digits stay tabular —
 * the Thai family's digits are proportional and misalign in tables.
 * Apply as `sx={{ fontFamily: numericFontFamily }}`.
 */
export const numericFontFamily = '"IBM Plex Sans", system-ui, sans-serif';

/** Raw design tokens, for the rare spot that needs a value the theme doesn't expose. */
export const designTokens = tokens;

export default getAppTheme;
