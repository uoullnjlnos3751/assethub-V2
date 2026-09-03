import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { FileText, ArrowUpRight } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtBaht = (n?: number | null) => n != null ? `฿${Number(n).toLocaleString('th-TH')}` : '—';

const TYPE_LABEL: Record<string, string> = {
  WARRANTY: 'ประกัน', MA: 'บำรุงรักษา (MA)', LEASE: 'เช่า', INSURANCE: 'ประกันภัย', SUPPORT: 'ซัพพอร์ต',
};

/** Contracts (warranty / MA / lease / insurance / support) this asset is
 *  tied to via ContractAsset — real linkage the contracts module already
 *  maintains, just never surfaced from the asset's own page before. */
export function ContractsTab({ asset }: { asset: any }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const rows: any[] = (asset.contractAssets || []).map((ca: any) => ca.contract).filter(Boolean);

  if (rows.length === 0) {
    return (
      <SectionCard title="สัญญาที่เกี่ยวข้อง" icon={FileText}>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.82rem', color: theme.palette.text.disabled }}>
            ไม่มีสัญญาผูกกับทรัพย์สินนี้
          </Typography>
          <Typography
            onClick={() => navigate('/contracts')}
            sx={{ fontSize: '0.78rem', color: theme.palette.primary.main, fontWeight: 700, cursor: 'pointer', mt: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            ผูกได้จากโมดูลสัญญา <ArrowUpRight size={13} />
          </Typography>
        </Box>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`สัญญาที่เกี่ยวข้อง (${rows.length})`} icon={FileText} action={() => navigate('/contracts')} actionLabel="จัดการสัญญา">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map((c: any) => {
          const expired = c.endDate && new Date(c.endDate).getTime() < Date.now();
          return (
            <Box key={c.id} onClick={() => navigate('/contracts')} sx={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5,
              p: 1.5, borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
            }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{c.title}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>
                  {TYPE_LABEL[c.contractType] || c.contractType}
                  {c.contractNo ? ` · ${c.contractNo}` : ''}
                  {c.vendor ? ` · ${c.vendor}` : ''}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: !c.isActive || expired ? theme.palette.error.main : theme.palette.success.main }}>
                  {!c.isActive ? 'ปิดสัญญาแล้ว' : expired ? 'หมดอายุแล้ว' : 'มีผลบังคับ'}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.disabled }}>
                  {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                </Typography>
              </Box>
              {c.value != null && (
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', color: theme.palette.text.primary, minWidth: 80, textAlign: 'right' }}>
                  {fmtBaht(c.value)}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
