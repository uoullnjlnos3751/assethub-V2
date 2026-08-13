import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { Plug } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

type Status = 'connected' | 'not_connected' | 'not_in_system';

interface Connector {
  name: string;
  status: Status;
  note: string;
}

const CONNECTORS: Connector[] = [
  { name: 'Active Directory', status: 'connected', note: 'ใช้จริง — ยืนยันตัวตนตอนล็อกอิน (LDAP bind)' },
  { name: 'Microsoft Entra ID (SSO)', status: 'not_in_system', note: 'ไม่มีโค้ด OIDC/SSO ในระบบนี้' },
  { name: 'GLPI Agent', status: 'not_connected', note: 'มีโครงโค้ดเบื้องต้นเท่านั้น ยังไม่มีงานนำเข้าตามตารางเวลา' },
  { name: 'Power Automate', status: 'not_in_system', note: 'แทนที่ด้วยระบบยืนยันรับเครื่องผ่านอีเมลในตัวแอปแล้ว (โมดูล "เครื่องใหม่ & ส่งมอบ")' },
  { name: 'Microsoft Forms', status: 'not_in_system', note: 'แทนที่ด้วยระบบยืนยันรับเครื่องผ่านอีเมลในตัวแอปแล้ว' },
  { name: 'SMTP (Office 365)', status: 'connected', note: 'ใช้จริง — ส่งอีเมลแจ้งเตือนของระบบ' },
  { name: 'ระบบบัญชี Impress ERP', status: 'not_in_system', note: 'ไม่มีโค้ดเชื่อมต่อ' },
  { name: 'Print Server', status: 'not_in_system', note: 'ไม่มีโค้ดเชื่อมต่อ — จัดการเครื่องพิมพ์ผ่านข้อมูลหลักแทน' },
  { name: 'ระบบจัดซื้อ (PO)', status: 'not_in_system', note: 'ไม่มีโค้ดเชื่อมต่อ' },
  { name: 'ระบบ HR / ผังองค์กร', status: 'not_in_system', note: 'ไม่มีโค้ดเชื่อมต่อ' },
  { name: 'สำรองข้อมูล', status: 'connected', note: 'ใช้จริง — export/import ไฟล์ JSON ผ่านเมนู "จัดการ Backup" (ไม่ใช่ระบบอัตโนมัติรายวัน)' },
];

const STATUS_LABEL: Record<Status, string> = { connected: 'เชื่อมต่ออยู่', not_connected: 'ยังไม่พร้อมใช้งาน', not_in_system: 'ไม่มีในระบบนี้' };

function StatusChip({ s }: { s: Status }) {
  const theme = useTheme();
  const map = {
    connected: { bg: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: alpha(theme.palette.success.main, 0.3) },
    not_connected: { bg: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.dark, border: alpha(theme.palette.warning.main, 0.3) },
    not_in_system: { bg: theme.palette.background.default, color: theme.palette.text.disabled, border: theme.palette.divider },
  }[s];
  return <Chip size="small" label={STATUS_LABEL[s]} sx={{ bgcolor: map.bg, color: map.color, border: `1px solid ${map.border}` }} />;
}

export default function IntegrationsTab() {
  const theme = useTheme();
  const connectedCount = CONNECTORS.filter(c => c.status === 'connected').length;
  const notConnectedCount = CONNECTORS.filter(c => c.status === 'not_connected').length;
  const notInSystemCount = CONNECTORS.filter(c => c.status === 'not_in_system').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 130px', minWidth: 130, borderRadius: '14px', p: '12px 14px', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, fontWeight: 600 }}>เชื่อมต่ออยู่จริง</Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: theme.palette.success.main }}>{connectedCount}</Typography>
        </Box>
        <Box sx={{ flex: '1 1 130px', minWidth: 130, borderRadius: '14px', p: '12px 14px', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, fontWeight: 600 }}>ยังไม่พร้อมใช้งาน</Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: theme.palette.warning.main }}>{notConnectedCount}</Typography>
        </Box>
        <Box sx={{ flex: '1 1 130px', minWidth: 130, borderRadius: '14px', p: '12px 14px', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, fontWeight: 600 }}>ไม่มีในระบบนี้</Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: theme.palette.text.disabled }}>{notInSystemCount}</Typography>
        </Box>
      </Box>

      <SectionCard title="การเชื่อมต่อระบบภายนอก" icon={Plug}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.25 }}>
          {CONNECTORS.map(c => (
            <Box key={c.name} sx={{
              borderRadius: '12px', p: 1.5,
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              display: 'flex', flexDirection: 'column', gap: 0.75,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{c.name}</Typography>
                <StatusChip s={c.status} />
              </Box>
              <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.5 }}>{c.note}</Typography>
            </Box>
          ))}
        </Box>
      </SectionCard>

      <SectionCard title="API Key และการเข้าถึงจากภายนอก" icon={Plug}>
        <Box sx={{
          borderRadius: '12px', p: 2.5, textAlign: 'center',
          border: `1px dashed ${theme.palette.divider}`,
        }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: theme.palette.text.secondary, mb: 0.5 }}>
            🔑 เร็วๆ นี้
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.disabled, maxWidth: 420, mx: 'auto', lineHeight: 1.7 }}>
            ระบบยังไม่มีการจัดการ API key แยกต่างหาก (เก็บ hash, จำกัดสิทธิ์/IP, หมดอายุอัตโนมัติ, นับจำนวนเรียกใช้)
            จึงยังไม่แสดงตารางตัวอย่างในหน้านี้ เพื่อไม่ให้เข้าใจผิดว่ามีคีย์ที่ใช้งานได้จริงอยู่แล้ว
          </Typography>
        </Box>
      </SectionCard>
    </Box>
  );
}
