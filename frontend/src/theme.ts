import { createTheme, PaletteMode } from '@mui/material/styles';

export const getAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

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
        main: isDark ? '#aac7ff' : '#005ab4',
        light: isDark ? '#d6e3ff' : '#0a73e0',
        dark: isDark ? '#00458d' : '#00458d',
        contrastText: isDark ? '#001b3e' : '#ffffff',
      },
      secondary: {
        main: isDark ? '#aec7f7' : '#465f88',
        light: isDark ? '#d6e3ff' : '#b6d0ff',
        dark: isDark ? '#2d476f' : '#3f5881',
        contrastText: isDark ? '#001b3d' : '#ffffff',
      },
      success: { 
        main: '#2e7d32',
        light: isDark ? '#0b4b20' : '#e7f6ea',
        dark: '#1b5e20',
      },
      error: { 
        main: '#ba1a1a',
        light: isDark ? '#93000a' : '#ffdad6',
        dark: '#93000a',
      },
      info: { 
        main: isDark ? '#aac7ff' : '#005ab4',
        light: isDark ? '#d6e3ff' : '#0a73e0',
        dark: '#00458d',
      },
      warning: { 
        main: isDark ? '#ffb68c' : '#964400',
        light: isDark ? '#ffdbc9' : '#bd5700',
        dark: isDark ? '#763400' : '#763400',
      },
      background: {
        default: isDark ? '#181c22' : '#f9f9ff',
        paper: isDark ? '#2d3037' : '#ffffff',
      },
      text: {
        primary: isDark ? '#eef0fa' : '#181c22',
        secondary: isDark ? '#c1c6d5' : '#414753',
      },
      divider: isDark ? '#414753' : '#c1c6d5',
    },

    shape: { borderRadius: 8 },

    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif, "Sarabun"',
      fontSize: 14,
      h1: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h4: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, color: isDark ? '#eef0fa' : '#181c22' },
      h5: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.35 },
      h6: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.35 },
      body1: { fontSize: '1rem', lineHeight: 1.5, color: isDark ? '#eef0fa' : '#181c22' },
      body2: { fontSize: '0.875rem', lineHeight: 1.45, color: isDark ? '#c1c6d5' : '#414753' },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em', fontSize: '0.875rem' },
      subtitle1: { fontWeight: 600, color: isDark ? '#eef0fa' : '#181c22', fontSize: '0.875rem' },
      subtitle2: { fontWeight: 600, color: isDark ? '#c1c6d5' : '#414753', fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', fontWeight: 500, color: isDark ? '#c1c6d5' : '#414753' },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': { boxSizing: 'border-box' },
          'img, video, svg': { maxWidth: '100%', height: 'auto' },
          body: {
            backgroundColor: isDark ? '#181c22' : '#f9f9ff',
            minHeight: '100vh',
            margin: 0,
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#717785 #181c22' : '#c1c6d5 #f9f9ff',
            '&::-webkit-scrollbar': { width: '5px', height: '5px' },
            '&::-webkit-scrollbar-track': { background: isDark ? '#181c22' : '#f9f9ff' },
            '&::-webkit-scrollbar-thumb': { background: isDark ? '#717785' : '#c1c6d5', borderRadius: '3px' },
            '&::-webkit-scrollbar-thumb:hover': { background: isDark ? '#c1c6d5' : '#717785' },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderRadius: 8,
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
            background: isDark ? '#aac7ff' : '#005ab4',
            color: isDark ? '#001b3e' : '#ffffff',
            '&:hover': { 
              background: isDark ? '#d6e3ff' : '#00458d',
              boxShadow: isDark ? '0 4px 12px rgba(170, 199, 255, 0.25)' : '0 4px 12px rgba(0, 90, 180, 0.22)',
            },
          },
          outlinedPrimary: {
            border: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
            backgroundColor: isDark ? 'transparent' : '#ffffff',
            color: isDark ? '#eef0fa' : '#181c22',
            '&:hover': { 
              backgroundColor: isDark ? 'rgba(170,199,255,0.08)' : '#f1f3fc',
              borderColor: isDark ? '#aac7ff' : '#005ab4',
              color: isDark ? '#aac7ff' : '#005ab4',
              boxShadow: '0 2px 8px rgba(0, 90, 180, 0.08)',
            },
          },
          text: {
            color: isDark ? '#aac7ff' : '#005ab4',
            '&:hover': { backgroundColor: isDark ? 'rgba(170,199,255,0.06)' : 'rgba(0,90,180,0.06)' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundColor: isDark ? '#2d3037' : '#ffffff',
            border: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(24, 28, 34, 0.06)',
            backgroundImage: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { 
              boxShadow: isDark ? '0 14px 36px rgba(0,0,0,0.5)' : '0 14px 36px rgba(24, 28, 34, 0.09)',
              borderColor: isDark ? '#717785' : '#717785',
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
            backgroundColor: isDark ? '#2d3037' : '#ffffff',
            border: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
            boxShadow: 'none',
          },
          rounded: { borderRadius: 16 },
          elevation1: { boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.4)' : '0 6px 18px rgba(24, 28, 34, 0.06)' },
          elevation2: { boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(24, 28, 34, 0.08)' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(45,48,55,0.78)' : 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none',
            borderBottom: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
            color: isDark ? '#eef0fa' : '#181c22',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#2d3037' : '#ffffff',
            borderRight: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
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
              backgroundColor: isDark ? '#181c22' : '#f1f3fc',
              borderRadius: 8,
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              '& fieldset': { borderColor: isDark ? '#414753' : '#c1c6d5', borderWidth: '1px' },
              '&:hover fieldset': { borderColor: isDark ? '#aac7ff' : '#005ab4' },
              '&.Mui-focused': { backgroundColor: isDark ? '#2d3037' : '#ffffff' },
              '&.Mui-focused fieldset': {
                borderColor: isDark ? '#aac7ff' : '#005ab4',
                borderWidth: '1.5px',
                boxShadow: isDark ? '0 0 0 3px rgba(170,199,255,0.18)' : '0 0 0 3px rgba(0,90,180,0.15)',
              },
              '&.Mui-error fieldset': {
                borderColor: '#ba1a1a',
              },
              '&.Mui-error.Mui-focused fieldset': {
                boxShadow: isDark ? '0 0 0 3px rgba(255,218,214,0.18)' : '0 0 0 3px rgba(186,26,26,0.14)',
              },
            },
            '& .MuiInputLabel-root': { color: isDark ? '#c1c6d5' : '#414753', fontSize: '0.875rem' },
            '& .MuiInputLabel-root.Mui-focused': { color: isDark ? '#aac7ff' : '#005ab4' },
            '& .MuiInputLabel-root.Mui-error': { color: '#ba1a1a' },
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
              color: '#ba1a1a',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.7rem', borderRadius: '6px', height: '22px' },
          filled: { border: 'none' },
          outlined: { borderWidth: '1px' },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            '& .MuiTableHead-root .MuiTableCell-head': {
              backgroundColor: isDark ? '#2d3037' : '#f1f3fc',
              color: isDark ? '#c1c6d5' : '#414753',
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.03em',
              textTransform: 'none',
              borderBottom: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
              padding: '12px 16px',
            },
            '& .MuiTableRow-root .MuiTableCell-body': {
              borderBottom: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
              color: isDark ? '#eef0fa' : '#181c22',
              padding: '12px 16px',
              fontSize: '0.875rem',
            },
            '& .MuiTableRow-root:hover .MuiTableCell-body': {
              backgroundColor: isDark ? '#2d3037' : '#f1f3fc',
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
            backgroundColor: isDark ? '#414753' : '#181c22',
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
            backgroundColor: isDark ? '#2d3037' : '#ffffff',
            border: isDark ? '1px solid #414753' : 'none',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            borderRadius: 24,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: '18px 20px 12px', borderBottom: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`, fontSize: '1rem', fontWeight: 600 },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: '16px 20px' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 20px 16px', borderTop: `1px solid ${isDark ? '#414753' : '#c1c6d5'}` } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#2d3037' : '#ffffff',
            border: `1px solid ${isDark ? '#414753' : '#c1c6d5'}`,
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
            minHeight: 44,
            '@media (min-width:768px)': { minHeight: 32 },
            fontSize: '0.8125rem',
            '&:hover': { backgroundColor: isDark ? '#181c22' : '#f1f3fc' },
            '&.Mui-selected': { 
              backgroundColor: isDark ? 'rgba(170,199,255,0.15)' : '#d6e3ff',
              color: isDark ? '#aac7ff' : '#005ab4',
              fontWeight: 500,
            },
            '&.Mui-selected:hover': { backgroundColor: isDark ? 'rgba(170,199,255,0.25)' : '#aac7ff' },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '7px 12px',
            margin: '1px 8px',
            minHeight: 44,
            '@media (min-width:768px)': { minHeight: 36 },
            fontSize: '0.8125rem',
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(170,199,255,0.15)' : '#d6e3ff',
              color: isDark ? '#aac7ff' : '#005ab4',
              fontWeight: 500,
              '&:hover': { backgroundColor: isDark ? 'rgba(170,199,255,0.25)' : '#aac7ff' },
            },
            '&:hover': { backgroundColor: isDark ? '#181c22' : '#f1f3fc' },
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
        styleOverrides: { root: { minWidth: 34, color: isDark ? '#c1c6d5' : '#414753' } },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#181c22' : '#f1f3fc',
            borderRadius: 8,
            fontSize: '0.8125rem',
            '&:hover': { backgroundColor: isDark ? '#2d3037' : '#ebedf7' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: '2px', borderRadius: '2px 2px 0 0', backgroundColor: isDark ? '#aac7ff' : '#005ab4' },
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
            color: isDark ? '#c1c6d5' : '#414753',
            '&.Mui-selected': { color: isDark ? '#aac7ff' : '#005ab4', fontWeight: 600 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, borderWidth: '1px', fontSize: '0.8125rem' },
          standardSuccess: { backgroundColor: isDark ? '#0b4b20' : '#e7f6ea', borderColor: isDark ? '#2e7d32' : '#2e7d32', color: isDark ? '#eef0fa' : undefined },
          standardError: { backgroundColor: isDark ? '#3b1111' : '#ffdad6', borderColor: isDark ? '#ba1a1a' : '#ba1a1a', color: isDark ? '#eef0fa' : undefined },
          standardWarning: { backgroundColor: isDark ? '#3a1d0c' : '#ffdbc9', borderColor: isDark ? '#ffb68c' : '#964400', color: isDark ? '#eef0fa' : undefined },
          standardInfo: { backgroundColor: isDark ? '#001b3e' : '#d6e3ff', borderColor: isDark ? '#aac7ff' : '#005ab4', color: isDark ? '#eef0fa' : undefined },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: isDark ? '#414753' : '#c1c6d5', borderWidth: '0.5px' } },
      },
    },
  });
};

export default getAppTheme;
