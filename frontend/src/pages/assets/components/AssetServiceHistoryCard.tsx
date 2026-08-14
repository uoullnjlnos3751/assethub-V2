import React, { useMemo } from 'react';
import {
  Box, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  alpha, useTheme,
} from '@mui/material';
import { Wrench } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { fmtBaht } from './assetFinance';

type Kind = 'pm' | 'repair';

interface Row {
  key: string;
  ref: string;
  kind: Kind;
  kindLabel: string;
  detail: string;
  actor: string;
  at: number;
  cost: number | null;
  statusLabel?: string;
  statusTone?: 'success' | 'warning' | 'error';
}

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The handoff's "ประวัติงานซ่อม & PM ของทรัพย์สินนี้" table: repair tickets and
 * PM runs interleaved by date, so the service story reads in one place instead
 * of requiring a hop between the ประวัติการซ่อม and PM tabs. Both of those tabs
 * still exist for the full detail (parts, images, per-item answers) — this is
 * the summary view.
 */
export function AssetServiceHistoryCard({ asset, maintenance = [], onSeeAll }: {
  asset: any; maintenance?: any[]; onSeeAll?: () => void;
}) {
  const theme = useTheme();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];

    for (const m of maintenance) {
      const at = new Date(m.startedAt).getTime();
      if (Number.isNaN(at)) continue;
      const closed = !!m.completedAt;
      out.push({
        key: `m-${m.id}`,
        ref: m.ticketNo || `MNT-${m.id}`,
        kind: 'repair',
        kindLabel: m.repairType || 'ซ่อม',
        detail: m.reportedProblem || '—',
        actor: m.vendorName || m.technician?.displayName || '—',
        at,
        cost: Number(m.totalCost) || 0,
        statusLabel: closed ? 'ปิดงานแล้ว' : 'กำลังดำเนินการ',
        statusTone: closed ? 'success' : 'warning',
      });
    }

    for (const run of asset.pmRuns || []) {
      const when = run.completedAt || run.performedAt;
      if (!when) continue;
      const at = new Date(when).getTime();
      if (Number.isNaN(at)) continue;
      const total = run.answers?.length ?? 0;
      const answered = (run.answers || []).filter((a: any) => a.value !== null && a.value !== '').length;
      out.push({
        key: `p-${run.id}`,
        ref: `PM-${run.year || ''}-${String(run.id).padStart(4, '0')}`,
        kind: 'pm',
        kindLabel: `PM ปี ${run.year || '—'}`,
        detail: total > 0 ? `ตรวจ ${answered}/${total} ข้อ` : 'บันทึกผลแล้ว',
        actor: run.performer?.displayName || '—',
        at,
        cost: null,
        statusLabel: run.status === 'COMPLETED' ? 'เสร็จสิ้น' : 'ค้างอยู่',
        statusTone: run.status === 'COMPLETED' ? 'success' : 'warning',
      });
    }

    return out.sort((a, b) => b.at - a.at);
  }, [asset.pmRuns, maintenance]);

  const totalCost = rows.reduce((s, r) => s + (r.cost || 0), 0);
  const repairCount = rows.filter(r => r.kind === 'repair').length;

  const toneColor = (t?: 'success' | 'warning' | 'error') =>
    t === 'success' ? theme.palette.success.main
      : t === 'warning' ? theme.palette.warning.main
        : t === 'error' ? theme.palette.error.main
          : theme.palette.text.disabled;

  return (
    <SectionCard
      title="ประวัติงานซ่อม & PM ของทรัพย์สินนี้"
      icon={Wrench}
      action={onSeeAll}
      actionLabel={onSeeAll ? 'ดูทั้งหมด' : undefined}
    >
      <Typography sx={{ fontSize: '0.73rem', color: theme.palette.text.secondary, mb: 1.25 }}>
        รวม {rows.length} รายการ · ซ่อม {repairCount} ครั้ง · ค่าใช้จ่ายสะสม {fmtBaht(totalCost)}
      </Typography>

      {rows.length === 0 ? (
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.disabled, py: 3, textAlign: 'center' }}>
          ยังไม่มีประวัติงานซ่อมหรือ PM ของทรัพย์สินนี้
        </Typography>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow>
                {['เลขที่', 'ประเภท', 'รายละเอียด', 'ผู้ดำเนินการ', 'วันที่', 'ค่าใช้จ่าย', 'สถานะ'].map((h, i) => (
                  <TableCell
                    key={h}
                    align={i === 5 ? 'right' : 'left'}
                    sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.palette.text.secondary, whiteSpace: 'nowrap', py: 1 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.key} hover>
                  <TableCell sx={{ fontSize: '0.73rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{r.ref}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.kindLabel}
                      size="small"
                      sx={{
                        height: 20, fontSize: '0.68rem', fontWeight: 700,
                        bgcolor: alpha(r.kind === 'pm' ? theme.palette.success.main : theme.palette.warning.main, 0.14),
                        color: r.kind === 'pm' ? theme.palette.success.main : theme.palette.warning.main,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', maxWidth: 220 }}>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.detail}>
                      {r.detail}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{r.actor}</TableCell>
                  <TableCell sx={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>{fmtDate(r.at)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {r.cost === null ? '—' : (r.cost > 0 ? fmtBaht(r.cost) : '฿0')}
                  </TableCell>
                  <TableCell>
                    {r.statusLabel && (
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: toneColor(r.statusTone), whiteSpace: 'nowrap' }}>
                        {r.statusLabel}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
}
