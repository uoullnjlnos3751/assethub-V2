import { createTheme, PaletteMode } from '@mui/material/styles';

export const getAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main:          '#f59e0b',
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
      success: { main: '#10B981', light: isDark ? '#064e3b' : '#D1FAE5', dark: '#059669' },
      error:   { main: '#EF4444', light: isDark ? '#7f1d1d' : '#FEE2E2', dark: '#DC2626' },
      info:    { main: '#3B82F6', light: isDark ? '#1e3a8a' : '#DBEAFE', dark: '#2563EB' },
      warning: { main: '#f59e0b', light: isDark ? '#78350f' : '#FEF3C7', dark: '#d97706' },
      background: {
        default: isDark ? '#111827' : '#f5f6fa',
        paper:   isDark ? '#1f2937' : '#ffffff',
      },
      text: {
        primary:   isDark ? '#f9fafb' : '#111827',
        secondary: isDark ? '#9ca3af' : '#6b7280',
      },
      divider: isDark ? '#374151' : '#e5e7eb',
    },

    shape: { borderRadius: 8 },

    typography: {
      fontFamily: '"Sarabun", system-ui, -apple-system, sans-serif',
      fontSize: 13,
      h1: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h4: { fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.35 },
      h5: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
      h6: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
      body1: { fontSize: '0.875rem', lineHeight: 1.55, color: isDark ? '#d1d5db' : '#374151' },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55, color: isDark ? '#9ca3af' : '#4b5563' },
      button: { fontWeight: 500, textTransform: 'none', letterSpacing: '0.005em', fontSize: '0.8125rem' },
      subtitle1: { fontWeight: 500, color: isDark ? '#f9fafb' : '#111827', fontSize: '0.875rem' },
      subtitle2: { fontWeight: 500, color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#111827' : '#f5f6fa',
            minHeight: '100vh',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#4b5563 #111827' : '#d1d5db #f5f6fa',
            '&::-webkit-scrollbar': { width: '5px', height: '5px' },
            '&::-webkit-scrollbar-track': { background: isDark ? '#111827' : '#f5f6fa' },
            '&::-webkit-scrollbar-thumb': { background: isDark ? '#4b5563' : '#d1d5db', borderRadius: '3px' },
            '&::-webkit-scrollbar-thumb:hover': { background: isDark ? '#6b7280' : '#9ca3af' },
          },
        },
      },
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
          outlinedPrimary: {
            border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
            backgroundColor: isDark ? 'transparent' : '#ffffff',
            '&:hover': { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fff7ed', borderColor: '#f59e0b' },
          },
          text: {
            '&:hover': { backgroundColor: 'rgba(245,158,11,0.06)' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `0.5px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            boxShadow: 'none',
            backgroundImage: 'none',
            transition: 'border-color 0.15s',
            '&:hover': { boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.07)' },
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
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `0.5px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            boxShadow: 'none',
          },
          rounded: { borderRadius: 10 },
          elevation1: { boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.06)' },
          elevation2: { boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            boxShadow: 'none',
            borderBottom: `0.5px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            color: isDark ? '#f9fafb' : '#111827',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderRight: `0.5px solid ${isDark ? '#374151' : '#e5e7eb'}`,
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
              backgroundColor: isDark ? '#111827' : '#f9fafb',
              borderRadius: 7,
              fontSize: '0.8125rem',
              transition: 'all 0.15s ease',
              '& fieldset': { borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: '1px' },
              '&:hover fieldset': { borderColor: '#f59e0b' },
              '&.Mui-focused': { backgroundColor: isDark ? '#1f2937' : '#ffffff' },
              '&.Mui-focused fieldset': {
                borderColor: '#f59e0b',
                borderWidth: '1.5px',
                boxShadow: '0 0 0 3px rgba(245,158,11,0.1)',
              },
            },
            '& .MuiInputLabel-root': { color: isDark ? '#9ca3af' : '#6b7280', fontSize: '0.8125rem' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#f59e0b' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, fontSize: '0.7rem', borderRadius: '999px', height: '22px' },
          filled: { border: 'none' },
          outlined: { borderWidth: '1px' },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            '& .MuiTableHead-root .MuiTableCell-head': {
              backgroundColor: isDark ? '#374151' : '#f9fafb',
              color: isDark ? '#d1d5db' : '#6b7280',
              fontWeight: 500,
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              borderBottom: `0.5px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
              padding: '8px 12px',
            },
            '& .MuiTableRow-root .MuiTableCell-body': {
              borderBottom: `0.5px solid ${isDark ? '#374151' : '#f3f4f6'}`,
              color: isDark ? '#e5e7eb' : '#374151',
              padding: '10px 12px',
              fontSize: '0.8125rem',
            },
            '& .MuiTableRow-root:hover .MuiTableCell-body': {
              backgroundColor: isDark ? '#1f2937' : '#fafafa',
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
            backgroundColor: isDark ? '#374151' : '#111827',
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
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: isDark ? '1px solid #374151' : 'none',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            borderRadius: 12,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: '18px 20px 12px', borderBottom: `0.5px solid ${isDark ? '#374151' : '#f3f4f6'}`, fontSize: '0.9rem', fontWeight: 600 },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: '16px 20px' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 20px 16px', borderTop: `0.5px solid ${isDark ? '#374151' : '#f3f4f6'}` } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `0.5px solid ${isDark ? '#374151' : '#e5e7eb'}`,
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
            '&:hover': { backgroundColor: isDark ? '#374151' : '#fff7ed' },
            '&.Mui-selected': { backgroundColor: isDark ? '#374151' : '#fff7ed', color: isDark ? '#fbbf24' : '#b45309' },
            '&.Mui-selected:hover': { backgroundColor: isDark ? '#4b5563' : '#fef3c7' },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            padding: '7px 12px',
            margin: '1px 8px',
            fontSize: '0.8125rem',
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
              color: isDark ? '#fbbf24' : '#b45309',
              fontWeight: 500,
              '&:hover': { backgroundColor: isDark ? 'rgba(245,158,11,0.25)' : '#fde68a' },
            },
            '&:hover': { backgroundColor: isDark ? '#374151' : '#f9fafb' },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 34, color: isDark ? '#9ca3af' : '#6b7280' } },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#111827' : '#f9fafb',
            borderRadius: 7,
            fontSize: '0.8125rem',
            '&:hover': { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
          },
        },
      },
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
            color: isDark ? '#9ca3af' : '#6b7280',
            '&.Mui-selected': { color: isDark ? '#fbbf24' : '#b45309', fontWeight: 500 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, borderWidth: '1px', fontSize: '0.8125rem' },
          standardSuccess: { backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderColor: isDark ? '#047857' : '#bbf7d0', color: isDark ? '#ecfdf5' : undefined },
          standardError:   { backgroundColor: isDark ? '#7f1d1d' : '#fef2f2', borderColor: isDark ? '#b91c1c' : '#fecaca', color: isDark ? '#fef2f2' : undefined },
          standardWarning: { backgroundColor: isDark ? '#78350f' : '#fffbeb', borderColor: isDark ? '#b45309' : '#fde68a', color: isDark ? '#fffbeb' : undefined },
          standardInfo:    { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff', borderColor: isDark ? '#1d4ed8' : '#bfdbfe', color: isDark ? '#eff6ff' : undefined },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: '0.5px' } },
      },
    },
  });
};

export default getAppTheme;
