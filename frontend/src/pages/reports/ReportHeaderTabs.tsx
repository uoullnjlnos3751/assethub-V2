import React from 'react';
import { Box, Tabs, Tab, Paper, alpha } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

export default function ReportHeaderTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/reports/assets')) return 0;
    if (path.startsWith('/reports/borrow')) return 1;
    if (path.startsWith('/reports/pm')) return 2;
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
      default:
        break;
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3.5,
        borderRadius: '12px',
        bgcolor: '#ffffff',
        border: '1px solid rgba(229, 231, 235, 0.7)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(229, 231, 235, 0.5)', px: 2, pt: 1 }}>
        <Tabs
          value={getActiveTab()}
          onChange={handleTabChange}
          aria-label="รายงานระบบ"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: '#b45309', // Match primary theme text/accent
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
            sx={{
              fontWeight: getActiveTab() === 0 ? 700 : 500,
              fontSize: '0.85rem',
              minHeight: 48,
              py: 1.5,
              color: '#4b5563',
              '&.Mui-selected': {
                color: '#b45309',
              },
              '&:hover': {
                color: '#b45309',
                bgcolor: alpha('#f59e0b', 0.04),
              },
              transition: 'all 0.2s',
            }}
          />
          <Tab
            icon={<SwapHorizIcon sx={{ fontSize: '18px' }} />}
            iconPosition="start"
            label="รายงานการยืม-คืน"
            id="report-tab-borrow"
            sx={{
              fontWeight: getActiveTab() === 1 ? 700 : 500,
              fontSize: '0.85rem',
              minHeight: 48,
              py: 1.5,
              color: '#4b5563',
              '&.Mui-selected': {
                color: '#b45309',
              },
              '&:hover': {
                color: '#b45309',
                bgcolor: alpha('#f59e0b', 0.04),
              },
              transition: 'all 0.2s',
            }}
          />
          <Tab
            icon={<BuildCircleIcon sx={{ fontSize: '18px' }} />}
            iconPosition="start"
            label="รายงาน PM ตรวจนับประจำปี"
            id="report-tab-pm"
            sx={{
              fontWeight: getActiveTab() === 2 ? 700 : 500,
              fontSize: '0.85rem',
              minHeight: 48,
              py: 1.5,
              color: '#4b5563',
              '&.Mui-selected': {
                color: '#b45309',
              },
              '&:hover': {
                color: '#b45309',
                bgcolor: alpha('#f59e0b', 0.04),
              },
              transition: 'all 0.2s',
            }}
          />
        </Tabs>
      </Box>
    </Paper>
  );
}
