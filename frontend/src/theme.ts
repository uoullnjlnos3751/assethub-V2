import { createTheme, PaletteMode } from '@mui/material/styles';

export const getAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main:          '#0071e3', // Apple Blue
        light:         '#4796e6',
        dark:          '#005bb5',
        contrastText:  '#ffffff',
      },
      secondary: {
        main:          '#86868b', // Apple Gray
        light:         '#a1a1a6',
        dark:          '#6e6e73',
        contrastText:  '#ffffff',
      },
      success: { 
        main: '#34c759', // iOS Green
        light: isDark ? '#083a15' : '#e6f9eb', 
        dark: '#289a42' 
      },
      error: { 
        main: '#ff3b30', // iOS Red
        light: isDark ? '#4c0f0b' : '#ffebeb', 
        dark: '#d62f26' 
      },
      info: { 
        main: '#0071e3', 
        light: isDark ? '#0b3c6f' : '#e6f1fc', 
        dark: '#005bb5' 
      },
      warning: { 
        main: '#ff9500', // iOS Orange
        light: isDark ? '#4c2d00' : '#fff5e6', 
        dark: '#cc7700' 
      },
      background: {
        default: isDark ? '#000000' : '#f5f5f7', // Pure black in dark, clean light gray in light
        paper:   isDark ? '#1d1d1f' : '#ffffff', // Dark charcoal in dark, pure white in light
      },
      text: {
        primary:   isDark ? '#f5f5f7' : '#1d1d1f', // Off-white in dark, charcoal in light
        secondary: isDark ? '#86868b' : '#6e6e73',
      },
      divider: isDark ? '#2d2d2f' : '#d2d2d7',
    },

    shape: { borderRadius: 12 }, // More rounded, Apple-like corners

    typography: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif, "Sarabun"',
      fontSize: 13,
      h1: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h4: { fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.35 },
      h5: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
      h6: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
      body1: { fontSize: '0.875rem', lineHeight: 1.55, color: isDark ? '#e8e8ed' : '#1d1d1f' },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55, color: isDark ? '#86868b' : '#6e6e73' },
      button: { fontWeight: 500, textTransform: 'none', letterSpacing: '0.005em', fontSize: '0.8125rem' },
      subtitle1: { fontWeight: 500, color: isDark ? '#f5f5f7' : '#1d1d1f', fontSize: '0.875rem' },
      subtitle2: { fontWeight: 500, color: isDark ? '#86868b' : '#6e6e73', fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', color: isDark ? '#86868b' : '#86868b' },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#000000' : '#f5f5f7',
            minHeight: '100vh',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#4b5563 #000000' : '#d1d5db #f5f5f7',
            '&::-webkit-scrollbar': { width: '5px', height: '5px' },
            '&::-webkit-scrollbar-track': { background: isDark ? '#000000' : '#f5f5f7' },
            '&::-webkit-scrollbar-thumb': { background: isDark ? '#424245' : '#d2d2d7', borderRadius: '3px' },
            '&::-webkit-scrollbar-thumb:hover': { background: isDark ? '#6e6e73' : '#a1a1a6' },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { 
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
          },
          containedPrimary: {
            background: '#0071e3',
            color: '#ffffff',
            '&:hover': { 
              background: '#005bb5', 
              boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
            },
          },
          outlinedPrimary: {
            border: `1px solid ${isDark ? '#2d2d2f' : '#e2e8f0'}`,
            backgroundColor: isDark ? 'transparent' : '#ffffff',
            color: isDark ? '#f5f5f7' : '#1d1d1f',
            '&:hover': { 
              backgroundColor: isDark ? 'rgba(0,113,227,0.08)' : '#f5f9ff', 
              borderColor: '#0071e3',
              color: '#0071e3',
              boxShadow: '0 2px 8px rgba(0, 113, 227, 0.08)',
            },
          },
          text: {
            color: isDark ? '#4796e6' : '#0071e3',
            '&:hover': { backgroundColor: 'rgba(0,113,227,0.06)' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? '#1d1d1f' : '#ffffff',
            border: `1px solid ${isDark ? '#2d2d2f' : '#f1f5f9'}`,
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.01)',
            backgroundImage: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { 
              boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 24px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
              borderColor: isDark ? '#424245' : '#e2e8f0',
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
            backgroundColor: isDark ? '#1d1d1f' : '#ffffff',
            border: `1px solid ${isDark ? '#2d2d2f' : '#f1f5f9'}`,
            boxShadow: 'none',
          },
          rounded: { borderRadius: 12 },
          elevation1: { boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.02)' },
          elevation2: { boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 20px rgba(0,0,0,0.04)' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(29,29,31,0.8)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none',
            borderBottom: `1px solid ${isDark ? '#2d2d2f' : '#d2d2d7'}`,
            color: isDark ? '#f5f5f7' : '#1d1d1f',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1d1d1f' : '#ffffff',
            borderRight: `1px solid ${isDark ? '#2d2d2f' : '#d2d2d7'}`,
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
              backgroundColor: isDark ? '#000000' : '#f5f5f7',
              borderRadius: 8,
              fontSize: '0.8125rem',
              transition: 'all 0.15s ease',
              '& fieldset': { borderColor: isDark ? '#2d2d2f' : '#d2d2d7', borderWidth: '1px' },
              '&:hover fieldset': { borderColor: '#0071e3' },
              '&.Mui-focused': { backgroundColor: isDark ? '#1d1d1f' : '#ffffff' },
              '&.Mui-focused fieldset': {
                borderColor: '#0071e3',
                borderWidth: '1.5px',
                boxShadow: '0 0 0 3px rgba(0,113,227,0.15)',
              },
            },
            '& .MuiInputLabel-root': { color: isDark ? '#86868b' : '#6e6e73', fontSize: '0.8125rem' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#0071e3' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, fontSize: '0.7rem', borderRadius: '6px', height: '22px' }, // Apple uses slightly square chips for lists
          filled: { border: 'none' },
          outlined: { borderWidth: '1px' },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            '& .MuiTableHead-root .MuiTableCell-head': {
              backgroundColor: isDark ? '#2d2d2f' : '#f5f5f7',
              color: isDark ? '#86868b' : '#6e6e73',
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.03em',
              textTransform: 'none',
              borderBottom: `1px solid ${isDark ? '#424245' : '#d2d2d7'}`,
              padding: '8px 12px',
            },
            '& .MuiTableRow-root .MuiTableCell-body': {
              borderBottom: `1px solid ${isDark ? '#2d2d2f' : '#f5f5f7'}`,
              color: isDark ? '#f5f5f7' : '#1d1d1f',
              padding: '10px 12px',
              fontSize: '0.8125rem',
            },
            '& .MuiTableRow-root:hover .MuiTableCell-body': {
              backgroundColor: isDark ? '#2d2d2f' : '#fafafa',
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
            backgroundColor: isDark ? '#424245' : '#1d1d1f',
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
            backgroundColor: isDark ? '#1d1d1f' : '#ffffff',
            border: isDark ? '1px solid #2d2d2f' : 'none',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            borderRadius: 14,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: '18px 20px 12px', borderBottom: `1px solid ${isDark ? '#2d2d2f' : '#f5f5f7'}`, fontSize: '0.9rem', fontWeight: 600 },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: '16px 20px' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 20px 16px', borderTop: `1px solid ${isDark ? '#2d2d2f' : '#f5f5f7'}` } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1d1d1f' : '#ffffff',
            border: `1px solid ${isDark ? '#2d2d2f' : '#e5e7eb'}`,
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
            '&:hover': { backgroundColor: isDark ? '#2d2d2f' : '#f5f5f7' },
            '&.Mui-selected': { 
              backgroundColor: isDark ? 'rgba(0,113,227,0.15)' : '#e6f1fc', 
              color: isDark ? '#4796e6' : '#0071e3',
              fontWeight: 500,
            },
            '&.Mui-selected:hover': { backgroundColor: isDark ? 'rgba(0,113,227,0.25)' : '#d0e5fc' },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '7px 12px',
            margin: '1px 8px',
            fontSize: '0.8125rem',
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(0,113,227,0.15)' : '#e6f1fc',
              color: isDark ? '#4796e6' : '#0071e3',
              fontWeight: 500,
              '&:hover': { backgroundColor: isDark ? 'rgba(0,113,227,0.25)' : '#d0e5fc' },
            },
            '&:hover': { backgroundColor: isDark ? '#2d2d2f' : '#f5f5f7' },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 34, color: isDark ? '#86868b' : '#6e6e73' } },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#000000' : '#f5f5f7',
            borderRadius: 8,
            fontSize: '0.8125rem',
            '&:hover': { backgroundColor: isDark ? '#1d1d1f' : '#e8e8ed' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: '2px', borderRadius: '2px 2px 0 0', backgroundColor: '#0071e3' },
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
            color: isDark ? '#86868b' : '#6e6e73',
            '&.Mui-selected': { color: isDark ? '#4796e6' : '#0071e3', fontWeight: 600 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, borderWidth: '1px', fontSize: '0.8125rem' },
          standardSuccess: { backgroundColor: isDark ? '#083a15' : '#f0fdf4', borderColor: isDark ? '#15803d' : '#bbf7d0', color: isDark ? '#e6f9eb' : undefined },
          standardError:   { backgroundColor: isDark ? '#4c0f0b' : '#fef2f2', borderColor: isDark ? '#b91c1c' : '#fecaca', color: isDark ? '#ffebeb' : undefined },
          standardWarning: { backgroundColor: isDark ? '#4c2d00' : '#fffbeb', borderColor: isDark ? '#b45309' : '#fde68a', color: isDark ? '#fff5e6' : undefined },
          standardInfo:    { backgroundColor: isDark ? '#0b3c6f' : '#eff6ff', borderColor: isDark ? '#1d4ed8' : '#bfdbfe', color: isDark ? '#e6f1fc' : undefined },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: isDark ? '#2d2d2f' : '#d2d2d7', borderWidth: '0.5px' } },
      },
    },
  });
};

export default getAppTheme;
