import { createTheme } from '@mui/material/styles';

// ── ITSM Dashboard UI theme ────────────────────────────────────────────────
// Accent: Amber #f59e0b (matches itsm_dashboard_ui.html)
// Background: #f5f6fa (light grey, not pure white)
// Border: 0.5–1px soft grey lines
// Radius: 8px (compact, not rounded-xl)
// Typography: Sarabun, slightly smaller/tighter than before

const theme = createTheme({
  palette: {
    primary: {
      main:          '#f59e0b',   // amber — matches HTML's #f59e0b
      light:         '#fbbf24',
      dark:          '#d97706',
      contrastText:  '#ffffff',
    },
    secondary: {
      main:          '#6366F1',
      light:         '#818CF8',
      dark:          '#4F46E5',
      contrastText:  '#ffffff',
    },
    success: { main: '#10B981', light: '#D1FAE5', dark: '#059669' },
    error:   { main: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
    info:    { main: '#3B82F6', light: '#DBEAFE', dark: '#2563EB' },
    warning: { main: '#f59e0b', light: '#FEF3C7', dark: '#d97706' },
    background: {
      default: '#f5f6fa',   // subtle off-white — like HTML body
      paper:   '#ffffff',
    },
    text: {
      primary:   '#111827',   // near-black
      secondary: '#6b7280',   // medium grey
    },
    divider: '#e5e7eb',       // thin grey border
  },

  shape: { borderRadius: 8 },  // compact — matches HTML's var(--border-radius-md)

  typography: {
    fontFamily: '"Sarabun", system-ui, -apple-system, sans-serif',
    fontSize: 13,              // base 13px like HTML
    h1: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
    h3: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
    h4: { fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.35 },
    h5: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
    h6: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
    body1: { fontSize: '0.875rem', lineHeight: 1.55, color: '#374151' },
    body2: { fontSize: '0.8125rem', lineHeight: 1.55, color: '#4b5563' },
    button: { fontWeight: 500, textTransform: 'none', letterSpacing: '0.005em', fontSize: '0.8125rem' },
    subtitle1: { fontWeight: 500, color: '#111827', fontSize: '0.875rem' },
    subtitle2: { fontWeight: 500, color: '#4b5563', fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem', color: '#6b7280' },
  },

  components: {
    // ── Global CSS Reset ───────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f5f6fa',
          minHeight: '100vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f5f6fa',
          '&::-webkit-scrollbar': { width: '5px', height: '5px' },
          '&::-webkit-scrollbar-track': { background: '#f5f6fa' },
          '&::-webkit-scrollbar-thumb': { background: '#d1d5db', borderRadius: '3px' },
          '&::-webkit-scrollbar-thumb:hover': { background: '#9ca3af' },
        },
      },
    },

    // ── Buttons ────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: 6,
          padding: '7px 16px',
          fontSize: '0.8125rem',
          fontWeight: 500,
          '&:hover': { boxShadow: 'none', transform: 'none' },
          '&:active': { transform: 'none' },
          transition: 'background 0.15s, border-color 0.15s',
        },
        containedPrimary: {
          background: '#f59e0b',
          '&:hover': { background: '#d97706', boxShadow: 'none' },
        },
        containedSecondary: {
          background: '#6366F1',
          '&:hover': { background: '#4F46E5', boxShadow: 'none' },
        },
        outlinedPrimary: {
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          '&:hover': { backgroundColor: '#fff7ed', borderColor: '#f59e0b' },
        },
        text: {
          '&:hover': { backgroundColor: 'rgba(245,158,11,0.06)' },
        },
        sizeSmall: { padding: '5px 12px', fontSize: '0.75rem', borderRadius: 6 },
        sizeLarge: { padding: '10px 22px', fontSize: '0.9rem', borderRadius: 8 },
      },
    },

    // ── Card ───────────────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          border: '0.5px solid #e5e7eb',
          boxShadow: 'none',
          backgroundImage: 'none',
          transition: 'border-color 0.15s',
          '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.07)', transform: 'none' },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': { paddingBottom: '16px' },
        },
      },
    },

    // ── Paper ─────────────────────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
          border: '0.5px solid #e5e7eb',
          boxShadow: 'none',
        },
        rounded: { borderRadius: 10 },
        elevation1: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
        elevation2: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      },
    },

    // ── AppBar / Topbar ────────────────────────────────────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: 'none',
          borderBottom: '0.5px solid #e5e7eb',
          color: '#111827',
        },
      },
    },

    // ── Drawer / Sidebar ──────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '0.5px solid #e5e7eb',
          boxShadow: 'none',
        },
      },
    },

    // ── Toolbar ────────────────────────────────────────────────────────────
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '50px !important',
          '@media (min-width: 600px)': { minHeight: '50px !important' },
        },
      },
    },

    // ── Input / TextField ─────────────────────────────────────────────────
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#f9fafb',
            borderRadius: 7,
            fontSize: '0.8125rem',
            transition: 'all 0.15s ease',
            '& fieldset': { borderColor: '#e5e7eb', borderWidth: '1px' },
            '&:hover fieldset': { borderColor: '#f59e0b' },
            '&.Mui-focused': { backgroundColor: '#ffffff' },
            '&.Mui-focused fieldset': {
              borderColor: '#f59e0b',
              borderWidth: '1.5px',
              boxShadow: '0 0 0 3px rgba(245,158,11,0.1)',
            },
          },
          '& .MuiInputLabel-root': { color: '#6b7280', fontSize: '0.8125rem' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#f59e0b' },
        },
      },
    },

    // ── Chip ──────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.7rem',
          borderRadius: '999px',
          height: '22px',
        },
        filled: { border: 'none' },
        outlined: { borderWidth: '1px' },
      },
    },

    // ── Table ─────────────────────────────────────────────────────────────
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableHead-root .MuiTableCell-head': {
            backgroundColor: '#f9fafb',
            color: '#6b7280',
            fontWeight: 500,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderBottom: '0.5px solid #e5e7eb',
            padding: '8px 12px',
          },
          '& .MuiTableRow-root .MuiTableCell-body': {
            borderBottom: '0.5px solid #f3f4f6',
            color: '#374151',
            padding: '10px 12px',
            fontSize: '0.8125rem',
          },
          '& .MuiTableRow-root:hover .MuiTableCell-body': {
            backgroundColor: '#fafafa',
          },
          '& .MuiTableRow-root:last-child .MuiTableCell-body': {
            borderBottom: 'none',
          },
        },
      },
    },

    // ── Tooltip ───────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#111827',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.725rem',
          fontWeight: 500,
          borderRadius: '6px',
          padding: '6px 10px',
        },
      },
    },

    // ── Dialog ────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          border: 'none',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          borderRadius: 12,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { padding: '18px 20px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: '0.9rem', fontWeight: 600 },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '16px 20px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 20px 16px', borderTop: '0.5px solid #f3f4f6' } },
    },

    // ── Menu / Dropdown ───────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          border: '0.5px solid #e5e7eb',
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          borderRadius: 8,
          padding: '4px',
        },
        list: { padding: 0 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 12px',
          margin: '1px 0',
          fontSize: '0.8125rem',
          '&:hover': { backgroundColor: '#fff7ed' },
          '&.Mui-selected': { backgroundColor: '#fff7ed', color: '#b45309' },
          '&.Mui-selected:hover': { backgroundColor: '#fef3c7' },
        },
      },
    },

    // ── Nav / ListItemButton ──────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          padding: '7px 12px',
          margin: '1px 8px',
          fontSize: '0.8125rem',
          '&.Mui-selected': {
            backgroundColor: '#fef3c7',   // soft amber — matches HTML .sb-item.active
            color: '#b45309',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#fde68a' },
          },
          '&:hover': { backgroundColor: '#f9fafb' },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 34, color: '#6b7280' },
      },
    },

    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.8125rem' },
      },
    },

    // ── Select ────────────────────────────────────────────────────────────
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#f9fafb',
          borderRadius: 7,
          fontSize: '0.8125rem',
          '&:hover': { backgroundColor: '#f3f4f6' },
        },
      },
    },

    // ── Tabs ──────────────────────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        indicator: { height: '2px', borderRadius: '2px 2px 0 0', backgroundColor: '#f59e0b' },
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
          color: '#6b7280',
          '&.Mui-selected': { color: '#b45309', fontWeight: 500 },
        },
      },
    },

    // ── Misc ───────────────────────────────────────────────────────────────
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          fontSize: '0.65rem',
          backgroundColor: '#ef4444',
          color: '#fff',
          minWidth: '18px',
          height: '18px',
          borderRadius: '999px',
          padding: '0 5px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, borderWidth: '1px', fontSize: '0.8125rem' },
        standardSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
        standardError:   { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
        standardWarning: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
        standardInfo:    { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
      },
    },
    MuiSkeleton: {
      styleOverrides: { root: { borderRadius: 6 } },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.8rem',
          border: '1.5px solid #ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#e5e7eb', borderWidth: '0.5px' },
      },
    },
  },
});

export default theme;
