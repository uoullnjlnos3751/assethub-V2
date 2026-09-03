import React from 'react';
import { Box, Typography, Chip, LinearProgress, alpha, useTheme } from '@mui/material';
import { Cpu, MemoryStick, HardDrive, Layers, Network, CircuitBoard, MonitorSmartphone, Printer } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

/**
 * Per-component hardware cards — CPU / RAM / Storage / GPU / Network /
 * Motherboard / Monitors / Printers — matching the reference ITAM's
 * Hardware ▸ Modules tab (one card per component instead of a flat table).
 *
 * Prefers a live read from the external monitoring agent (per-drive disk
 * usage, per-slot RAM detail, the actual list of attached monitors/printers)
 * over the registry's own static columns, falling back to those columns —
 * or hiding the card entirely — when no agent record exists for this asset.
 * Same "live overlay, static fallback" rule AgentSpecCard already uses one
 * tab over; this just gives each component its own card instead of one long
 * comparison table.
 */

function Row({ label, value }: { label: React.ReactNode; value?: string | number | null }) {
  const theme = useTheme();
  if (value == null || value === '') return null;
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline',
      py: 0.7, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
      '&:last-of-type': { borderBottom: 'none' },
    }}>
      <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 'none' }}>{label}</Typography>
      <Typography sx={{
        fontSize: '0.78rem', fontWeight: 600, color: theme.palette.text.primary,
        textAlign: 'right', minWidth: 0, wordBreak: 'break-word',
      }}>
        {value}
      </Typography>
    </Box>
  );
}

function Empty() {
  const theme = useTheme();
  return (
    <Typography sx={{ fontSize: '0.76rem', color: theme.palette.text.disabled, py: 1 }}>
      ยังไม่มีข้อมูล
    </Typography>
  );
}

function LiveTag() {
  const theme = useTheme();
  return (
    <Chip label="Agent" size="small" sx={{
      height: 16, fontSize: '0.6rem', fontWeight: 700, ml: 0.75,
      bgcolor: alpha(theme.palette.success.main, 0.14), color: theme.palette.success.dark,
    }} />
  );
}

function DiskBar({ drive, totalGb, freeGb, usedPct }: { drive: string; totalGb: number; freeGb: number; usedPct: number }) {
  const theme = useTheme();
  const color = usedPct >= 90 ? theme.palette.error.main : usedPct >= 75 ? theme.palette.warning.main : theme.palette.success.main;
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.75rem' }}>{drive} · {totalGb} GB (เหลือ {freeGb} GB)</Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color }}>{usedPct}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(100, usedPct)} sx={{
        height: 6, borderRadius: 999, mt: 0.4,
        bgcolor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
      }} />
    </Box>
  );
}

export function HardwareTab({ asset, agent }: { asset: any; agent?: any }) {
  const theme = useTheme();
  const a = agent || {};

  const ramSlotsLive: any[] = a.ram_slots || [];
  const disksLive: any[] = a.disks || [];
  const diskHealthLive: any[] = a.disk_health || [];
  const monitorsLive: any[] = a.monitors || [];
  const printersLive: any[] = a.printers || [];

  const ramRows = ramSlotsLive.length === 0 ? [
    { label: 'ขนาดรวม', value: asset.ram },
    { label: 'รายละเอียด', value: asset.ramDetail },
    { label: 'ชนิดหน่วยความจำ', value: asset.memoryType },
    { label: 'RAM Slot 1', value: asset.ramSlot1 },
    { label: 'RAM Slot 2', value: asset.ramSlot2 },
    { label: 'RAM ติดเครื่อง (Onboard)', value: asset.ramOnboard },
    { label: 'ชนิด RAM', value: asset.ramType },
    { label: 'ความเร็ว', value: asset.ramSpeed },
    { label: 'รองรับสูงสุด', value: asset.ramMaxSupported },
    { label: 'ช่องว่างที่เหลือ', value: asset.ramAvailableSlots },
    { label: 'อัปเกรดได้', value: asset.ramUpgradeable },
  ].filter(r => r.value) : [];

  const storageRows = disksLive.length === 0 ? [
    { label: 'Storage 1', value: asset.storage1 },
    { label: 'Storage 2', value: asset.storage2 },
  ].filter(r => r.value) : [];

  const networkRows = [
    { label: 'Hostname', value: asset.assetName },
    { label: 'IP ล่าสุด', value: a.ip, live: !!a.ip },
    { label: 'MAC Address', value: a.mac, live: !!a.mac },
    { label: 'S/N เครื่อง (Agent)', value: asset.snComputer },
    { label: 'Domain', value: a.domain || asset.domainName, live: !!a.domain },
  ].filter(r => r.value);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
      <SectionCard title="CPU" icon={Cpu}>
        {a.cpu_name || asset.cpu ? (
          <Box>
            <Row label="รุ่น" value={a.cpu_name || asset.cpu} />
            {a.cpu_cores ? <Row label="จำนวนคอร์" value={a.cpu_cores} /> : <Row label="Generation" value={asset.cpuGeneration} />}
            {a.cpu_load_pct != null && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>ใช้งานอยู่ขณะนี้ <LiveTag /></Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{Math.round(a.cpu_load_pct)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(100, a.cpu_load_pct)} sx={{ height: 5, borderRadius: 999, mt: 0.4 }} />
              </Box>
            )}
          </Box>
        ) : <Empty />}
      </SectionCard>

      <SectionCard title="RAM" icon={MemoryStick}>
        {ramSlotsLive.length > 0 ? (
          <Box>
            <Row label="ขนาดรวม" value={a.ram_total_gb ? `${Math.round(a.ram_total_gb)} GB` : null} />
            {ramSlotsLive.map((s: any, i: number) => (
              <Row key={i} label={s.slot || `Slot ${i + 1}`}
                value={[s.type, s.size_gb ? `${s.size_gb} GB` : null, s.speed_mhz ? `${s.speed_mhz} MHz` : null].filter(Boolean).join(' · ')} />
            ))}
            {a.ram_used_pct != null && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>ใช้งานอยู่ขณะนี้ <LiveTag /></Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{Math.round(a.ram_used_pct)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(100, a.ram_used_pct)} sx={{ height: 5, borderRadius: 999, mt: 0.4 }} />
              </Box>
            )}
          </Box>
        ) : ramRows.length > 0 ? <Box>{ramRows.map(r => <Row key={r.label} {...r} />)}</Box> : <Empty />}
      </SectionCard>

      <SectionCard title="พื้นที่จัดเก็บ" icon={HardDrive}>
        {disksLive.length > 0 ? (
          <Box>
            {disksLive.map((d: any) => (
              <DiskBar key={d.drive} drive={d.drive} totalGb={d.total_gb} freeGb={d.free_gb} usedPct={Number(d.used_pct) || 0} />
            ))}
            {diskHealthLive.map((d: any, i: number) => (
              <Row key={i} label={`${d.name} (${d.media_type})`} value={`${d.health_status} · ${d.size_gb} GB`} />
            ))}
          </Box>
        ) : storageRows.length > 0 ? <Box>{storageRows.map(r => <Row key={r.label} {...r} />)}</Box> : <Empty />}
      </SectionCard>

      <SectionCard title="การ์ดจอ" icon={Layers}>
        {a.gpu_name || asset.gpu ? <Row label="รุ่น" value={a.gpu_name || asset.gpu} /> : <Empty />}
      </SectionCard>

      <SectionCard title="เครือข่าย" icon={Network}>
        {networkRows.length > 0 ? <Box>{networkRows.map(r => <Row key={r.label} label={r.live ? <>{r.label} <LiveTag /></> : r.label} value={r.value} />)}</Box> : <Empty />}
      </SectionCard>

      <SectionCard title="เมนบอร์ด & Serial" icon={CircuitBoard}>
        <Box>
          {a.motherboard && <Row label="เมนบอร์ด" value={a.motherboard} />}
          <Row label="Serial Number" value={asset.serialNo} />
          <Row label="รหัสทรัพย์สิน" value={asset.assetCode} />
          <Row label="เลขครุภัณฑ์ (บัญชี)" value={asset.accountingCode} />
        </Box>
      </SectionCard>

      {monitorsLive.length > 0 && (
        <SectionCard title={`มอนิเตอร์ที่ต่ออยู่ (${monitorsLive.length})`} icon={MonitorSmartphone}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {monitorsLive.map((m: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.6, borderBottom: i < monitorsLive.length - 1 ? `1px dashed ${alpha(theme.palette.divider, 0.9)}` : 'none' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{m.name || '—'}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>
                    {m.type === 'Internal' ? 'จอในตัว' : 'จอนอก'}{m.port ? ` · ${m.port}` : ''}{m.width && m.height ? ` · ${m.width}×${m.height}` : ''}
                  </Typography>
                </Box>
                {m.serial && <Typography sx={{ fontSize: '0.72rem', fontFamily: 'monospace', color: theme.palette.text.secondary, flexShrink: 0 }}>{m.serial}</Typography>}
              </Box>
            ))}
          </Box>
        </SectionCard>
      )}

      {printersLive.length > 0 && (
        <SectionCard title={`เครื่องพิมพ์ที่ติดตั้ง (${printersLive.length})`} icon={Printer}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {printersLive.map((p: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.6, borderBottom: i < printersLive.length - 1 ? `1px dashed ${alpha(theme.palette.divider, 0.9)}` : 'none' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                    {p.name || '—'}
                    {p.is_default ? <Chip label="ค่าเริ่มต้น" size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.6rem' }} /> : null}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{p.driver || '—'}</Typography>
                </Box>
                {p.is_network ? <Chip label="เครือข่าย" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', flexShrink: 0 }} /> : null}
              </Box>
            ))}
          </Box>
        </SectionCard>
      )}
    </Box>
  );
}
