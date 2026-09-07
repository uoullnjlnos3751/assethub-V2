import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { Cable } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

interface OtherAsset {
  id: number;
  assetCode: string | null;
  assetName: string | null;
  type: string | null;
}

interface LinkHistoryEntry {
  id: number;
  linkType: string;
  connectedAt: string;
  disconnectedAt: string | null;
  note: string | null;
  otherAsset: OtherAsset;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * ประวัติการเชื่อมต่อ Notebook↔Monitor ของทรัพย์สินนี้ — ทั้งช่วงที่เคยต่อในอดีต
 * และช่วงที่ยังต่ออยู่ตอนนี้ ("ยังเชื่อมต่ออยู่" เมื่อ disconnectedAt ยังว่าง)
 * เรียงใหม่สุดก่อน เหมือน AssetTimeline
 */
export function AssetConnectionHistoryCard({ loading, history = [] }: { loading?: boolean; history?: LinkHistoryEntry[] }) {
  const theme = useTheme();

  return (
    <SectionCard title="ประวัติการเชื่อมต่ออุปกรณ์" icon={Cable}>
      {loading ? (
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.disabled, py: 2, textAlign: 'center' }}>
          กำลังโหลด...
        </Typography>
      ) : history.length === 0 ? (
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.disabled, py: 2, textAlign: 'center' }}>
          ยังไม่มีประวัติการเชื่อมต่อของทรัพย์สินนี้
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
          {history.map((h) => {
            const open = !h.disconnectedAt;
            const tone = open ? theme.palette.success.main : alpha(theme.palette.text.disabled, 0.6);
            const otherLabel = [h.otherAsset?.assetCode, h.otherAsset?.assetName].filter(Boolean).join(' — ') || 'ไม่ทราบอุปกรณ์';
            return (
              <Box key={h.id} sx={{ display: 'flex', gap: 1.4 }}>
                <Box sx={{
                  width: 9, height: 9, borderRadius: '50%', mt: '5px', flex: 'none',
                  bgcolor: tone,
                }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: '0.79rem', color: theme.palette.text.primary, lineHeight: 1.45 }}>
                      {otherLabel}
                    </Typography>
                    {open && (
                      <Chip
                        label="เชื่อมต่ออยู่"
                        size="small"
                        sx={{
                          height: 18, fontSize: '0.63rem', fontWeight: 700,
                          bgcolor: alpha(theme.palette.success.main, 0.14),
                          color: theme.palette.success.main,
                        }}
                      />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: '0.71rem', color: theme.palette.text.disabled }}>
                    {fmt(h.connectedAt)} — {open ? 'ปัจจุบัน' : fmt(h.disconnectedAt as string)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </SectionCard>
  );
}
