import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Cpu, MemoryStick, HardDrive, Layers, Network, CircuitBoard } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

/**
 * Per-component hardware cards — CPU / RAM / Storage / GPU / Network, one
 * card each — matching the reference ITAM's dedicated Hardware tab (a grid of
 * small component cards) rather than the flat spec table the "สเปก & ซอฟต์แวร์"
 * tab uses. Same underlying asset columns as that tab; this is a different
 * shape for the same data, not a second source of truth.
 *
 * No motherboard/BIOS/printers/monitors/multimedia cards — this registry
 * doesn't track those at the component level (only CPU/RAM/GPU/storage
 * columns exist on the asset row), so those slots are left out rather than
 * shown empty.
 */

function Row({ label, value }: { label: string; value?: string | null }) {
  const theme = useTheme();
  if (!value) return null;
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

export function HardwareTab({ asset }: { asset: any }) {
  const ramRows = [
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
  ].filter(r => r.value);

  const storageRows = [
    { label: 'Storage 1', value: asset.storage1 },
    { label: 'Storage 2', value: asset.storage2 },
  ].filter(r => r.value);

  const networkRows = [
    { label: 'Hostname', value: asset.assetName },
    { label: 'S/N เครื่อง (Agent)', value: asset.snComputer },
    { label: 'Domain', value: asset.domainName },
  ].filter(r => r.value);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
      <SectionCard title="CPU" icon={Cpu}>
        {asset.cpu ? (
          <Box>
            <Row label="รุ่น" value={asset.cpu} />
            <Row label="Generation" value={asset.cpuGeneration} />
          </Box>
        ) : <Empty />}
      </SectionCard>

      <SectionCard title="RAM" icon={MemoryStick}>
        {ramRows.length > 0 ? <Box>{ramRows.map(r => <Row key={r.label} {...r} />)}</Box> : <Empty />}
      </SectionCard>

      <SectionCard title="พื้นที่จัดเก็บ" icon={HardDrive}>
        {storageRows.length > 0 ? <Box>{storageRows.map(r => <Row key={r.label} {...r} />)}</Box> : <Empty />}
      </SectionCard>

      <SectionCard title="การ์ดจอ" icon={Layers}>
        {asset.gpu ? <Row label="รุ่น" value={asset.gpu} /> : <Empty />}
      </SectionCard>

      <SectionCard title="เครือข่าย" icon={Network}>
        {networkRows.length > 0 ? <Box>{networkRows.map(r => <Row key={r.label} {...r} />)}</Box> : <Empty />}
      </SectionCard>

      <SectionCard title="Serial & รหัสอ้างอิง" icon={CircuitBoard}>
        <Box>
          <Row label="Serial Number" value={asset.serialNo} />
          <Row label="รหัสทรัพย์สิน" value={asset.assetCode} />
          <Row label="เลขครุภัณฑ์ (บัญชี)" value={asset.accountingCode} />
        </Box>
      </SectionCard>
    </Box>
  );
}
