import React from 'react';
import { Box, Chip, Typography, alpha, useTheme } from '@mui/material';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** ตัวเลขสรุปข้างคำอธิบาย เช่นจำนวนรายการที่กำลังแสดง */
  count?: number;
  countLabel?: string;
  /** ไอคอนกลมหน้าชื่อหน้า ใส่เมื่ออยากให้หน้านั้นจำง่ายขึ้น */
  icon?: React.ReactNode;
  /** ปุ่มการกระทำของหน้า วางชิดขวา ตกบรรทัดเองบนจอแคบ */
  actions?: React.ReactNode;
}

/**
 * หัวข้อหน้ามาตรฐาน
 *
 * ก่อนหน้านี้แต่ละหน้าเขียนหัวข้อเอง เลยได้ขนาดไม่ตรงกันสี่แบบพร้อมกัน —
 * variant h4 26 ไฟล์, h5 24, h6 16 และกำหนด fontSize เองอีก 25 เดินจากหน้าหนึ่ง
 * ไปอีกหน้าจึงรู้สึกเหมือนคนละระบบ และไม่มีที่เดียวให้แก้ตอนอยากเปลี่ยนทั้งระบบ
 *
 * ขนาดที่เลือกคือ h5/800 ตามหน้าตั้งค่าที่ปรับไปแล้ว จะได้ไม่ต้องมีมาตรฐานที่สาม
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title, subtitle, count, countLabel = 'รายการ', icon, actions,
}) => {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      mb: 3, gap: 2, flexWrap: 'wrap',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
        {icon && (
          <Box sx={{
            width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main,
          }}>
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {title}
          </Typography>
          {(subtitle || count !== undefined) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {subtitle}
                </Typography>
              )}
              {count !== undefined && (
                <Chip
                  label={`${count.toLocaleString('en-US')} ${countLabel}`}
                  size="small"
                  sx={{
                    height: 20, fontSize: '0.7rem', fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};
