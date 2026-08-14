import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { calcRepairRatio, REPAIR_VERDICT_LABEL, fmtBaht } from './assetFinance';

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Tile({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone?: 'default' | 'success' | 'warning' | 'error';
}) {
  const theme = useTheme();
  const accent = {
    default: theme.palette.text.primary,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  }[tone || 'default'];

  return (
    <Box sx={{
      flex: '1 1 200px', minWidth: 0,
      border: `1px solid ${tone && tone !== 'default' ? alpha(accent, 0.3) : theme.palette.divider}`,
      bgcolor: tone && tone !== 'default'
        ? alpha(accent, theme.palette.mode === 'dark' ? 0.1 : 0.06)
        : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.02),
      borderRadius: '13px', p: '12px 14px',
    }}>
      <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: accent, mt: '3px' }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled, mt: '1px' }}>{sub}</Typography>}
    </Box>
  );
}

/**
 * The four "so what?" numbers from the design handoff: PM cadence either side
 * of today, cumulative repair spend as a share of what the asset cost, and the
 * repair-or-replace read that follows from it.
 */
export function AssetInsightTiles({ asset, maintenance = [] }: { asset: any; maintenance?: any[] }) {
  const { lastPM, nextPM } = useMemo(() => {
    const runs = asset.pmRuns || [];
    const done = runs
      .filter((r: any) => r.status === 'COMPLETED' && (r.completedAt || r.performedAt))
      .sort((a: any, b: any) =>
        new Date(b.completedAt || b.performedAt).getTime() - new Date(a.completedAt || a.performedAt).getTime());
    const pending = runs
      .filter((r: any) => r.status !== 'COMPLETED')
      .sort((a: any, b: any) => (a.year || 0) - (b.year || 0));
    return { lastPM: done[0] || null, nextPM: pending[0] || null };
  }, [asset]);

  const repair = useMemo(
    () => calcRepairRatio(asset.purchasePrice, maintenance),
    [asset.purchasePrice, maintenance],
  );

  const verdictTone = repair
    ? ({ worth: 'success', watch: 'warning', replace: 'error' } as const)[repair.verdict]
    : 'default';

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
      <Tile
        label="รอบ PM ล่าสุด"
        value={lastPM ? fmtDate(lastPM.completedAt || lastPM.performedAt) : 'ยังไม่เคยทำ PM'}
        sub={lastPM ? `ปี ${lastPM.year || '—'}${lastPM.performer?.displayName ? ` · ${lastPM.performer.displayName}` : ''}` : undefined}
      />
      <Tile
        label="รอบ PM ถัดไป"
        value={nextPM ? `ปี ${nextPM.year}` : 'ยังไม่มีแผน'}
        sub={nextPM?.plan?.name || (nextPM ? 'รอดำเนินการ' : undefined)}
        tone={nextPM ? 'warning' : 'default'}
      />
      <Tile
        label="ค่าซ่อมเทียบราคาทุน"
        value={repair
          ? `${Math.round(repair.ratio * 100)}% ของ ${fmtBaht(repair.cost)}`
          : (maintenance.length > 0 ? 'ยังไม่ได้บันทึกราคาซื้อ' : 'ไม่มีประวัติซ่อม')}
        sub={repair ? `ซ่อม ${repair.repairCount} ครั้ง · รวม ${fmtBaht(repair.totalCost)}` : undefined}
        tone={verdictTone === 'success' ? 'default' : verdictTone}
      />
      <Tile
        label="คำแนะนำระบบ"
        value={repair ? REPAIR_VERDICT_LABEL[repair.verdict] : 'ข้อมูลไม่พอประเมิน'}
        sub={repair ? 'ประเมินจากค่าซ่อมสะสมเทียบราคาทุน' : 'ต้องมีราคาซื้อและประวัติซ่อม'}
        tone={verdictTone}
      />
    </Box>
  );
}
