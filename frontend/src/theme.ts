import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B00',
      light: '#FF8C00',
      dark: '#E65100',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#ffffff',
    },
    success: { main: '#10B981', light: '#D1FAE5', dark: '#059669' },
    error: { main: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
    info: { main: '#3B82F6', light: '#DBEAFE', dark: '#2563EB' },
    warning: { main: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Sarabun", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 },
    h2: { fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 },
    h3: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.3 },
    h4: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.35 },
    h5: { fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 1.4 },
    h6: { fontWeight: 600, letterSpacing: '0', lineHeight: 1.4 },
    body1: { lineHeight: 1.6, color: '#334155' },
    body2: { lineHeight: 1.6, color: '#475569' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    subtitle1: { fontWeight: 600, color: '#0F172A' },
    subtitle2: { fontWeight: 600, color: '#475569' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F8FAFC',
          minHeight: '100vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 #F1F5F9',
          '&::-webkit-scrollbar': { width: '8px', height: '8px' },
          '&::-webkit-scrollbar-track': { background: '#F1F5F9', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: '#94A3B8' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: 10,
          padding: '8px 20px',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #E65100 0%, #FF6B00 100%)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
        },
        outlinedPrimary: {
          border: '2px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          '&:hover': { backgroundColor: '#FFF7ED', borderColor: '#FF6B00', borderWidth: '2px' },
        },
        text: {
          '&:hover': { backgroundColor: 'rgba(255,107,0,0.06)' },
        },
        sizeSmall: { padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 },
        sizeLarge: { padding: '12px 28px', fontSize: '1rem', borderRadius: 12 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          backgroundImage: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { boxShadow: '0 10px 25px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': { paddingBottom: '24px' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
        },
        rounded: { borderRadius: 16 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderBottom: '1px solid #E2E8F0',
          color: '#0F172A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#F8FAFC',
            borderRadius: 10,
            transition: 'all 0.2s ease',
            '& fieldset': { borderColor: '#E2E8F0', borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: '#FF6B00' },
            '&.Mui-focused': { backgroundColor: '#FFFFFF' },
            '&.Mui-focused fieldset': { borderColor: '#FF6B00', borderWidth: '2px', boxShadow: '0 0 0 3px rgba(255,107,0,0.1)' },
          },
          '& .MuiInputLabel-root': { color: '#64748B' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#FF6B00' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem', borderRadius: '8px' },
        filled: { border: 'none' },
        outlined: { borderWidth: '1.5px' },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableHead-root .MuiTableCell-head': {
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderBottom: '2px solid #E2E8F0',
            padding: '12px 16px',
          },
          '& .MuiTableRow-root .MuiTableCell-body': {
            borderBottom: '1px solid #F1F5F9',
            color: '#334155',
            padding: '14px 16px',
          },
          '& .MuiTableRow-root:hover .MuiTableCell-body': { backgroundColor: '#F8FAFC' },
          '& .MuiTableRow-root:last-child .MuiTableCell-body': { borderBottom: 'none' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: '8px',
          padding: '8px 12px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          border: 'none',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          borderRadius: 20,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '24px 24px 16px',
          borderBottom: '1px solid #F1F5F9',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '24px' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '16px 24px 24px', borderTop: '1px solid #F1F5F9' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: '8px',
        },
        list: { padding: 0 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 14px',
          margin: '2px 0',
          '&:hover': { backgroundColor: '#FFF7ED' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 16px',
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: '#FFF7ED',
            color: '#E65100',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#FFF3E0' },
          },
          '&:hover': { backgroundColor: '#F8FAFC' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#F8FAFC',
          borderRadius: 10,
          '&:hover': { backgroundColor: '#F1F5F9' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: '3px', borderRadius: '3px 3px 0 0' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          minHeight: '48px',
          '&.Mui-selected': { color: '#FF6B00' },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 600, fontSize: '0.7rem' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, borderWidth: '1.5px' },
        standardSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
        standardError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
        standardWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
        standardInfo: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.9rem',
          border: '2px solid #FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default theme;
