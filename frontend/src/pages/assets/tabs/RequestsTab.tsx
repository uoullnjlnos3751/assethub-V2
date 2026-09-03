import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, useTheme } from '@mui/material';
import { ClipboardList } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import StatusChip from '../../../components/StatusChip';

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Borrow requests that have ever included this asset — real data
 *  (BorrowRequestItem.assetId) that previously only showed up on the
 *  requester's own "my requests" list, never from the asset's own side. */
export function RequestsTab({ asset }: { asset: any }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const items: any[] = asset.borrowRequestItems || [];

  if (items.length === 0) {
    return (
      <SectionCard title="คำขอที่เกี่ยวข้อง" icon={ClipboardList}>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.82rem', color: theme.palette.text.disabled }}>
            ทรัพย์สินนี้ยังไม่เคยอยู่ในคำขอยืมใด ๆ
          </Typography>
        </Box>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`คำขอที่เกี่ยวข้อง (${items.length})`} icon={ClipboardList} action={() => navigate('/borrow/history')} actionLabel="ดูประวัติการยืมทั้งหมด">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((it: any) => (
          <Box key={it.id} sx={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5,
            p: 1.5, borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                {it.request?.requestNo || `#${it.requestId}`}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>
                {it.request?.requester?.displayName || 'ไม่ทราบผู้ขอ'}
                {it.request?.purpose ? ` · ${it.request.purpose}` : ''}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.disabled }}>
                {it.borrowDate ? `ยืม ${fmtDate(it.borrowDate)}` : 'ยังไม่ระบุวันยืม'}
                {it.dueDate ? ` · ครบกำหนด ${fmtDate(it.dueDate)}` : ''}
              </Typography>
            </Box>
            <StatusChip status={it.itemStatus} />
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}
