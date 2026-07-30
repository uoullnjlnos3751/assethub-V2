import React from 'react';
import { Box, Typography, Breadcrumbs as MuiBreadcrumbs, useTheme, alpha } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  dashboard: 'แดชบอร์ด',
  assets: 'ทรัพย์สิน',
  'device-types': 'ประเภทอุปกรณ์',
  locations: 'สถานที่ตั้ง',
  vendors: 'ผู้จำหน่าย',
  statuses: 'สถานะอุปกรณ์',
  'import-export': 'นำเข้า/ส่งออก',
  new: 'เพิ่มใหม่',
  edit: 'แก้ไข',
  borrow: 'ยืม-คืน',
  'my-requests': 'คำขอของฉัน',
  'my-items': 'รายการที่ยืม',
  'my-history': 'ประวัติการยืม',
  'my-extensions': 'คำขอขยายวัน',
  'approval-queue': 'รออนุมัติ',
  checkout: 'ส่งมอบ',
  return: 'รับคืน',
  history: 'ประวัติทั้งหมด',
  extensions: 'ขยายวัน',
  overdue: 'เกินกำหนด',
  pm: 'PM ตรวจนับ',
  plans: 'แผน PM',
  runs: 'ดำเนินการ PM',
  templates: 'เทมเพลต PM',
  reports: 'รายงาน',
  admin: 'จัดการระบบ',
  users: 'ผู้ใช้งาน',
  settings: 'ตั้งค่า',
  'notification-logs': 'ประวัติแจ้งเตือน',
  'audit-log': 'Audit Log',
  inventory: 'คลังพัสดุ',
  categories: 'หมวดหมู่',
  donations: 'บริจาค',
};

export default function Breadcrumbs() {
  const theme = useTheme();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0) return null;

  return (
    <MuiBreadcrumbs
      separator={<ChevronRight size={16} color={theme.palette.text.secondary} />}
      sx={{ mb: { xs: 2, md: 3 } }}
    >
      <RouterLink
        to="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          textDecoration: 'none',
          color: theme.palette.text.secondary,
          fontWeight: 500,
          fontSize: '0.8125rem',
        }}
      >
        <Home size={14} />
        หน้าหลัก
      </RouterLink>
      {pathnames.map((segment, index) => {
        const isLast = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        
        let label = routeLabels[segment] || segment;
        if (/^\d+$/.test(segment)) {
          label = 'รายละเอียด';
        }

        if (isLast) {
          return (
            <Typography
              key={to}
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                fontSize: '0.8125rem',
              }}
            >
              {label}
            </Typography>
          );
        }

        return (
          <RouterLink
            key={to}
            to={to}
            style={{
              textDecoration: 'none',
              color: theme.palette.text.secondary,
              fontWeight: 500,
              fontSize: '0.85rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.palette.primary.main)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.palette.text.secondary)}
          >
            {label}
          </RouterLink>
        );
      })}
    </MuiBreadcrumbs>
  );
}
