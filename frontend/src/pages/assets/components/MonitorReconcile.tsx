import React, { useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, Chip, CircularProgress, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { assetAPI } from '../../../services/api';

/**
 * Reconciling agent-reported external monitors against the registry.
 *
 * Shared by two places on purpose, because they answer different questions:
 * the asset detail spec tab answers "are this machine's monitors right", which
 * is useful while you already have the machine open; the fleet tab on the
 * agent-drift page answers "which monitors anywhere need attention", which is
 * where the work actually gets done — the problems are a handful spread across
 * a dozen-odd machines, and finding them one asset page at a time is not a job
 * anyone would finish.
 *
 * Neither is a new page or a new menu entry.
 */

export interface MonitorField {
  key: string;
  label: string;
  current: string | null;
  incoming: string;
  state: 'fill' | 'diff' | 'same';
  note?: string;
}

export interface MonitorRow {
  bucket: 'FIX' | 'OK' | 'CREATE' | 'MANUAL';
  host: string;
  hostUser: string | null;
  hostAssetId: number | null;
  hostAssetCode: string | null;
  hostAssetName: string | null;
  monitor: { name: string | null; manufacturer: string | null; serial: string | null; port: string | null; year: number | null };
  assetId: number | null;
  assetCode: string | null;
  assetName: string | null;
  fields: MonitorField[];
  linkable: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US');

export function bucketColors(theme: any) {
  const dark = theme.palette.mode === 'dark';
  return {
    FIX: dark ? theme.palette.warning.main : theme.palette.warning.dark,
    CREATE: theme.palette.info.main,
    OK: dark ? theme.palette.success.main : theme.palette.success.dark,
    MANUAL: dark ? '#94a3b8' : '#54637a',
    LINK: theme.palette.primary.main,
  };
}

/** One monitor: its header line plus the field-by-field comparison. */
export function MonitorCard({ row, onDone, onCreate, compact }: {
  row: MonitorRow;
  onDone: () => void;
  onCreate?: (row: MonitorRow) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  const colors = bucketColors(theme);
  const color = colors[row.bucket];

  // Blanks start ticked because filling one cannot destroy anything.
  // Disagreements start unticked — those need a person to decide.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(row.fields.filter(f => f.state === 'fill').map(f => f.key)),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const actionable = row.fields.filter(f => f.state !== 'same' && f.incoming);

  const apply = async () => {
    if (!row.assetId || !picked.size) return;
    setSaving(true);
    try {
      const fields: Record<string, string> = {};
      row.fields.forEach(f => { if (picked.has(f.key) && f.incoming) fields[f.key] = f.incoming; });
      const res = await assetAPI.monitorSync(row.assetId, fields);
      setMsg(res.data?.message || 'บันทึกแล้ว');
      onDone();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  };

  const head = (
    <Box sx={{
      display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1.3fr) minmax(0,1fr) auto' },
      alignItems: 'center', gap: 1.25, p: '8px 11px',
      bgcolor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}`,
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.monitor.name || 'ไม่ทราบรุ่น'}
        <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled', fontSize: 10.5, ml: 0.75 }}>
          {row.monitor.serial ? `S/N ${row.monitor.serial}` : 'ไม่มี S/N'}
        </Box>
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {compact ? '' : `ต่อกับ ${row.host} · `}{row.hostUser || '-'}
        {row.monitor.port ? ` · ${row.monitor.port}` : ''}{row.monitor.year ? ` · ปี ${row.monitor.year}` : ''}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
        {row.bucket === 'FIX' && (
          <Button size="small" variant="contained" disabled={saving || !picked.size}
            onClick={apply}
            sx={{ fontSize: 10.5, py: 0.2, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(1.08)' } }}>
            {saving ? <CircularProgress size={13} /> : `รับค่าที่ติ๊ก (${picked.size})`}
          </Button>
        )}
        {row.bucket === 'CREATE' && onCreate && (
          <Button size="small" variant="contained" onClick={() => onCreate(row)}
            sx={{ fontSize: 10.5, py: 0.2, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(1.08)' } }}>
            เปิดฟอร์มสร้าง
          </Button>
        )}
        {row.bucket === 'OK' && (
          <Chip size="small" label="ข้อมูลตรง" sx={{ height: 19, fontSize: 9.5, fontWeight: 700, bgcolor: alpha(color, 0.14), color }} />
        )}
        {row.bucket === 'MANUAL' && (
          <Chip size="small" label="ไม่มี S/N" sx={{ height: 19, fontSize: 9.5, fontWeight: 700, bgcolor: alpha(color, 0.14), color }} />
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', overflow: 'hidden', mb: 1 }}>
      {head}
      {actionable.length > 0 && (
        <Box sx={{ px: 1.4, py: 0.4 }}>
          {row.fields.filter(f => f.incoming || f.note).map(f => {
            const st = f.state;
            const c = st === 'same' ? colors.OK : st === 'fill' ? colors.CREATE : colors.FIX;
            const editable = st !== 'same' && !!f.incoming;
            return (
              <Box key={f.key} sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '104px minmax(0,1fr) 18px minmax(0,1fr) 96px' },
                alignItems: 'center', gap: 1.1, py: 0.6,
                borderBottom: `1px solid ${theme.palette.divider}`, '&:last-of-type': { borderBottom: 0 },
              }}>
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled' }}>{f.label}</Typography>
                <Typography sx={{
                  fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: f.current ? 'text.primary' : 'text.disabled',
                  fontStyle: f.current ? 'normal' : 'italic',
                }}>{f.current || '(ว่าง)'}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center' }}>→</Typography>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: c, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.incoming || '— ต้องกรอกเอง —'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                  <Chip size="small" label={st === 'same' ? 'ตรงกัน' : st === 'fill' ? 'เติมช่องว่าง' : 'ไม่ตรง'}
                    sx={{ height: 17, fontSize: 9, fontWeight: 700, bgcolor: alpha(c, 0.14), color: c }} />
                  {editable && (
                    <Checkbox size="small" checked={picked.has(f.key)}
                      onChange={() => setPicked(prev => {
                        const n = new Set(prev);
                        n.has(f.key) ? n.delete(f.key) : n.add(f.key);
                        return n;
                      })}
                      sx={{ p: 0.3, color, '&.Mui-checked': { color } }} />
                  )}
                </Box>
                {f.note && (
                  <Typography sx={{ fontSize: 9.5, color: colors.FIX, gridColumn: { sm: '2 / 6' } }}>{f.note}</Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}
      {msg && <Typography sx={{ fontSize: 10.5, color: 'success.main', px: 1.4, pb: 0.9 }}>{msg}</Typography>}
    </Box>
  );
}

/** Link picker — AssetLink has existed unused; the agent knows every pairing. */
export function MonitorLinkList({ rows, onDone }: { rows: MonitorRow[]; onDone: () => void }) {
  const theme = useTheme();
  const color = theme.palette.primary.main;
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const pairs = useMemo(
    () => rows.filter(r => r.linkable && r.assetId && r.hostAssetId), [rows],
  );

  if (!pairs.length) {
    return <Typography sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 11.5 }}>
      ไม่มีคู่ที่ผูกได้
    </Typography>;
  }

  const link = async () => {
    setSaving(true);
    try {
      await assetAPI.monitorLink(
        pairs.filter(r => picked.has(r.assetId!)).map(r => ({ parentId: r.hostAssetId!, childId: r.assetId! })),
      );
      setPicked(new Set());
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <>
      {pairs.map(r => (
        <Box key={r.assetId} sx={{
          display: 'grid', gridTemplateColumns: '26px minmax(0,1fr) 18px minmax(0,1fr)',
          alignItems: 'center', gap: 1.1, py: 0.7,
          borderBottom: `1px solid ${theme.palette.divider}`, '&:last-of-type': { borderBottom: 0 },
        }}>
          <Checkbox size="small" checked={picked.has(r.assetId!)}
            onChange={() => setPicked(prev => {
              const n = new Set(prev);
              n.has(r.assetId!) ? n.delete(r.assetId!) : n.add(r.assetId!);
              return n;
            })}
            sx={{ p: 0.4, color, '&.Mui-checked': { color } }} />
          <Typography sx={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.assetCode || r.assetName || '(ไม่มีรหัส)'}
            <Box component="span" sx={{ color: 'text.disabled', ml: 0.75 }}>{r.monitor.name}</Box>
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center' }}>↔</Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.hostAssetCode || r.host} <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled' }}>{r.hostAssetName}</Box>
          </Typography>
        </Box>
      ))}
      {picked.size > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, mt: 1.25, p: '9px 11px',
          bgcolor: alpha(color, 0.1), border: `1px solid ${color}`, borderRadius: '9px',
        }}>
          <Typography sx={{ flex: 1, fontSize: 11.5 }}>
            เลือกผูก <b style={{ color }}>{fmt(picked.size)}</b> คู่
          </Typography>
          <Button size="small" onClick={() => setPicked(new Set())} sx={{ fontSize: 10.5 }}>ล้าง</Button>
          <Button size="small" variant="contained" disabled={saving} onClick={link} sx={{ fontSize: 10.5 }}>
            {saving ? <CircularProgress size={13} /> : 'ผูกทั้งหมด'}
          </Button>
        </Box>
      )}
      <Typography sx={{
        mt: 1.25, fontSize: 10.5, color: 'text.secondary', p: '7px 10px',
        bgcolor: theme.palette.action.hover, borderRadius: '7px', borderLeft: `2px solid ${color}`,
      }}>
        ผูกแล้วจะไปแสดงในแท็บ <b>อุปกรณ์ที่เชื่อมโยง</b> ของเครื่องนั้น —
        ตอนพนักงานคืนเครื่อง ระบบจะบอกได้ว่ายังมีจอค้างอยู่ที่โต๊ะกี่ตัว
      </Typography>
    </>
  );
}
