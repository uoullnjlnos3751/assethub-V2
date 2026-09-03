import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Wallet } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { AssetFinanceCard } from '../components/AssetFinanceCard';

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtBaht = (n?: number | null) => n != null ? `฿${Number(n).toLocaleString('th-TH')}` : '—';

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline',
      py: 0.7, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
      '&:last-of-type': { borderBottom: 'none' },
    }}>
      <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 'none' }}>{label}</Typography>
      <Typography sx={{
        fontSize: '0.78rem', fontWeight: 600, color: value ? theme.palette.text.primary : theme.palette.text.disabled,
        textAlign: 'right', minWidth: 0, wordBreak: 'break-word', fontFamily: mono ? 'monospace' : undefined,
      }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

/** Purchase / vendor / depreciation, gathered into its own tab — matching the
 *  reference ITAM's "Financials" tab. AssetFinanceCard (warranty + depreciation
 *  meters) already exists on the Home tab; it's reused here rather than
 *  rebuilt, alongside the procurement fields that otherwise only lived in the
 *  "สเปก & ซอฟต์แวร์" tab's accordion. */
export function FinancialsTab({ asset }: { asset: any }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 1.5, alignItems: 'start' }}>
      <SectionCard title="การจัดซื้อ" icon={Wallet}>
        <Box>
          <Row label="ผู้ขาย" value={asset.vendor} />
          <Row label="เลขที่ใบสั่งซื้อ (PO)" value={asset.poNumber} mono />
          <Row label="เลขที่ใบขอซื้อ (PR)" value={asset.prNumber} mono />
          <Row label="วันที่ PO" value={fmtDate(asset.poDate)} />
          <Row label="วันที่ซื้อ" value={fmtDate(asset.purchaseDate)} />
          <Row label="วันที่รับของจริง" value={fmtDate(asset.receivedDate)} />
          <Row label="ราคาซื้อ" value={fmtBaht(asset.purchasePrice)} mono />
          <Row label="รหัสงบประมาณ" value={asset.budgetCode || asset.budget} />
          <Row label="ผู้ขอจัดซื้อ" value={asset.requesterName} />
        </Box>
      </SectionCard>

      <AssetFinanceCard asset={asset} />
    </Box>
  );
}
