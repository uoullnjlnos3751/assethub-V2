import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Cpu } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

function Row({ label, value }: { label: string; value?: string | null }) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline',
      py: 0.7, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
      '&:last-of-type': { borderBottom: 'none' },
    }}>
      <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 'none' }}>
        {label}
      </Typography>
      <Typography
        title={value || undefined}
        sx={{
          fontSize: '0.78rem', fontWeight: 600, color: value ? theme.palette.text.primary : theme.palette.text.disabled,
          textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

/**
 * The handoff's compact "สเปกเครื่อง" card — the six specs worth seeing
 * without opening the สเปก tab. Stored asset columns win over the live GLPI
 * read (the asset row is the system of record); GLPI only fills the fields the
 * asset table has no column for, i.e. MAC and IP.
 */
export function AssetSpecMiniCard({ asset, glpiSpec }: { asset: any; glpiSpec?: any }) {
  const theme = useTheme();

  const storage = [asset.storage1, asset.storage2].filter(Boolean).join(' + ')
    || [glpiSpec?.storage1, glpiSpec?.storage2].filter(Boolean).join(' + ');

  const netParts = [glpiSpec?.macAddress, glpiSpec?.ipAddress].filter(Boolean);

  // The CPU/RAM/OS set only means anything for computers. A monitor or printer
  // rendered six dashes, so show that type's own detail row instead.
  const t = (asset.type || '').toLowerCase();
  const d = asset.detail || {};
  const isMonitor = t.includes('monitor') || t.includes('จอ');
  const isPrinter = t.includes('printer') || t.includes('พิมพ์');

  let rows: { label: string; value?: string | null }[];
  if (isMonitor) {
    rows = [
      { label: 'ขนาดจอ', value: d.screenSize },
      { label: 'ความละเอียด', value: d.resolution },
      { label: 'Panel Type', value: d.panelType },
      { label: 'Refresh Rate', value: d.refreshRate },
      { label: 'พอร์ตเชื่อมต่อ', value: d.ports },
      { label: 'ลำโพงในตัว', value: d.hasSpeaker == null ? null : (d.hasSpeaker ? 'มี' : 'ไม่มี') },
    ];
  } else if (isPrinter) {
    rows = [
      { label: 'ชนิดเครื่องพิมพ์', value: d.printerType },
      { label: 'พิมพ์สี', value: d.isColor == null ? null : (d.isColor ? 'ได้' : 'ขาวดำ') },
      { label: 'พิมพ์สองหน้า', value: d.duplexSupport == null ? null : (d.duplexSupport ? 'ได้' : 'ไม่ได้') },
      { label: 'ต่อเครือข่าย', value: d.networkReady == null ? null : (d.networkReady ? 'ได้' : 'ไม่ได้') },
      { label: 'IP Address', value: d.ipAddress },
      { label: 'MAC Address', value: d.macAddress },
    ];
  } else {
    rows = [
      { label: 'CPU', value: asset.cpu || glpiSpec?.cpu },
      { label: 'RAM', value: asset.ram || glpiSpec?.ram },
      { label: 'Storage', value: storage },
      { label: 'ระบบปฏิบัติการ', value: asset.osVersion || glpiSpec?.os },
      { label: 'Hostname', value: asset.snComputer || glpiSpec?.name },
      { label: 'MAC / IP ล่าสุด', value: netParts.length > 0 ? netParts.join(' · ') : null },
    ];
  }

  const hasAny = rows.some(r => r.value);

  // Real "last agent sync" — the newest GLPI_SYNC entry in the audit trail,
  // not a hardcoded timestamp.
  const lastSync = useMemo(() => {
    const hit = (asset.assetHistory || [])
      .filter((h: any) => h.actionType === 'GLPI_SYNC')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return hit ? new Date(hit.createdAt) : null;
  }, [asset.assetHistory]);

  return (
    <SectionCard title="สเปกเครื่อง" icon={Cpu}>
      {hasAny ? (
        <Box>
          {rows.map(r => <Row key={r.label} label={r.label} value={r.value} />)}
        </Box>
      ) : (
        <Typography sx={{ fontSize: '0.76rem', color: theme.palette.text.disabled, py: 1.5 }}>
          ยังไม่ได้บันทึกสเปกของอุปกรณ์ประเภทนี้ — เพิ่มได้ในหน้าแก้ไขข้อมูล
        </Typography>
      )}

      <Typography sx={{
        fontSize: '0.7rem', color: theme.palette.text.disabled, mt: 1.5,
        pt: 1.25, borderTop: `1px solid ${theme.palette.divider}`,
      }}>
        {lastSync
          ? `อัปเดตอัตโนมัติจาก GLPI Agent · ${lastSync.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} ${lastSync.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
          : 'กรอกด้วยตนเอง — อุปกรณ์นี้ไม่ได้ซิงก์กับ GLPI Agent'}
      </Typography>
    </SectionCard>
  );
}
