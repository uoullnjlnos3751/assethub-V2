import React from 'react';
import { Box, Tabs, Tab, Paper, alpha, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import HandymanIcon from '@mui/icons-material/Handyman';

export default function ReportHeaderTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/reports/assets')) return 0;
    if (path.startsWith('/reports/borrow')) return 1;
    if (path.startsWith('/reports/pm')) return 2;
    if (path.startsWith('/reports/maintenance')) return 3;
    return 0;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/reports/assets');
        break;
      case 1:
        navigate('/reports/borrow');
        break;
      case 2:
        navigate('/reports/pm');
        break;
      case 3:
        navigate('/reports/maintenance');
        break;
      default:
        break;
    }
  };

  const tabSx = {
    fontSize: '0.85rem',
    minHeight: 48,
    py: 1.5,
    color: 'text.secondary',
    '&.Mui-selected': {
      color: 'primary.main',
    },
    '&:hover': {
      color: 'primary.main',
      bgcolor: alpha(theme.palette.primary.main, 0.04),
    },
    transition: 'all 0.2s',
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3.5,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
        <Tabs
          value={getActiveTab()}
          onChange={handleTabChange}
          aria-label="รายงานระบบ"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            icon={<BarChartIcon sx={{ fontSize: '18px' }} />}
            iconPosition="start"
            label="รายงานทะเบียนทรัพย์สิน"
            id="report-tab-assets"
            sx={{ ...tabSx, fontWeight: getActiveTab() === 0 ? 700 : 500 }}
          />
          <Tab
            icon={<SwapHorizIcon sx={{ fontSize: '18px' }} />}
            iconPosition="start"
            label="รายงานการยืม-คืน"
            id="report-tab-borrow"
            sx={{ ...tabSx, fontWeight: getActiveTab() === 1 ? 700 : 500 }}
          />
          <Tab
            icon={<BuildCircleIcon sx={{ fontSize: '18px' }} />}
            iconPosition="start"
            label="รายงาน PM ตรวจนับประจำปี"
            id="report-tab-pm"
            sx={{ ...tabSx, fontWeight: getActiveTab() === 2 ? 700 : 500 }}
          />
          <Tab
            icon={<HandymanIcon sx={{ fontSize: '18px' }} />}
            iconPosition="start"
            label="รายงานประวัติการซ่อมบำรุง"
            id="report-tab-maintenance"
            sx={{ ...tabSx, fontWeight: getActiveTab() === 3 ? 700 : 500 }}
          />
        </Tabs>
      </Box>
    </Paper>
  );
}
