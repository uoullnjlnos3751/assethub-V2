import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B00',
      light: '#FFF3E0',
      dark: '#E65100',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#FF6B00',
      light: '#FFF3E0',
      dark: '#E65100',
    },
    success: { main: '#10B981', light: '#D1FAE5', dark: '#059669' },
    error: { main: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
    info: { main: '#3B82F6', light: '#DBEAFE', dark: '#2563EB' },
    warning: { main: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
    background: { default: '#FFFFFF', paper: '#F9FAFB' },
    text: { primary: '#1A1A1A', secondary: '#6B7280' },
    divider: '#E5E7EB',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Sarabun", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em', color: '#1A1A1A' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    body1: { lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#FFFFFF', minHeight: '100vh' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none', borderRadius: 8,
          '&:hover': { boxShadow: '0 4px 12px rgba(255,107,0,0.25)', transform: 'translateY(-1px)' },
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          background: '#FF6B00',
          '&:hover': { background: '#FF8C00', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' },
        },
        outlinedPrimary: {
          border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
          '&:hover': { backgroundColor: '#FFF3E0', borderColor: '#FF6B00' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8, backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF', boxShadow: 'none',
          borderBottom: '1px solid #E5E7EB', color: '#1A1A1A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB', boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#F9FAFB',
            '& fieldset': { borderColor: '#E5E7EB' },
            '&:hover fieldset': { borderColor: '#FF6B00' },
            '&.Mui-focused fieldset': { borderColor: '#FF6B00' },
          },
          '& .MuiInputLabel-root': { color: '#6B7280' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem' },
        filled: { backgroundColor: '#FFF3E0', border: '1px solid #E5E7EB' },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableHead-root .MuiTableCell-head': {
            backgroundColor: '#F9FAFB', color: '#9CA3AF',
            fontWeight: 700, fontSize: '0.675rem',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            borderBottom: '1px solid #E5E7EB',
          },
          '& .MuiTableRow-root .MuiTableCell-body': {
            borderBottom: '1px solid #E5E7EB', color: '#374151',
          },
          '& .MuiTableRow-root:last-child .MuiTableCell-body': { borderBottom: 'none' },
          '& .MuiTableRow-root:hover .MuiTableCell-body': { backgroundColor: '#F9FAFB' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#FFFFFF', color: '#1A1A1A',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontSize: '0.75rem', fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderRadius: 12,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderRadius: 8,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: '#FFF3E0', color: '#E65100', fontWeight: 600,
            '&:hover': { backgroundColor: '#FFE0B2' },
          },
          '&:hover': { backgroundColor: '#F9FAFB' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { backgroundColor: '#F9FAFB' },
      },
    },
  },
});

export default theme;
