import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, alpha, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Plug, KeyRound, ShieldCheck } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { adminAPI } from '../../../services/api';

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
  { name: 'สำรองข้อมูล', status: 'connected', note: 'ใช้จริง — สำรองฐานข้อมูลเต็มรูปแบบอัตโนมัติทุกวัน 02:00 น. ผ่านเมนู "ตั้งค่า / Backup"' },
  { name: 'External Asset API (Read-only)', status: 'connected', note: 'ใช้จริง — เซิร์ฟเวอร์ภายนอกแยกต่างหาก ให้ข้อมูล hardware/OS/สถานะออนไลน์แบบอ่านอย่างเดียว ผ่าน API key ด้านล่าง' },
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
  // Key and base URL come from the server (backend/.env) rather than being
  // written into this file — the repository is public, so anything hardcoded
  // here would be published and would stay in the git history permanently.
  const [apiInfo, setApiInfo] = useState<{ configured: boolean; baseUrl: string; apiKey: string } | null>(null);
  useEffect(() => {
    adminAPI.externalApiInfo().then(r => setApiInfo(r.data)).catch(() => setApiInfo(null));
  }, []);
  const baseUrl = apiInfo?.baseUrl || 'http://<agent-server>:3500';
  const apiKey = apiInfo?.apiKey || '(ยังไม่ได้ตั้งค่า)';

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
          borderRadius: '12px', p: 1.25,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <KeyRound size={16} color={theme.palette.text.secondary} style={{ flexShrink: 0 }} />
            <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.65rem', color: theme.palette.text.secondary, fontWeight: 600, mb: 0.25 }}>API Key (Read-only)</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, wordBreak: 'break-all' }}>
                {apiKey}
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.65rem', color: theme.palette.text.secondary, fontWeight: 600, mb: 0.25 }}>Header</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                x-api-key: {apiKey}
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.65rem', color: theme.palette.text.secondary, fontWeight: 600, mb: 0.25 }}>Base URL</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {baseUrl}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25, borderRadius: '10px', bgcolor: alpha(theme.palette.success.main, 0.06) }}>
            <ShieldCheck size={15} color={theme.palette.success.main} style={{ flexShrink: 0, marginTop: 1 }} />
            <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.6 }}>
              คีย์นี้แยกจาก key ของ agent เอง และเป็นแบบอ่านอย่างเดียว (read-only) เท่านั้น — ไม่สามารถแก้ไขหรือลบข้อมูลผ่าน API ชุดนี้ได้
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: theme.palette.text.secondary, mb: 1 }}>Endpoints</Typography>
        <TableContainer sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', width: '38%' }}>Endpoint</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>คำอธิบาย</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { path: 'GET /api/external/agents', desc: 'รายการเครื่องทั้งหมด (hardware, OS, license, battery, disk, online/offline)' },
                { path: 'GET /api/external/agent/:hostname', desc: 'ข้อมูลเต็มของเครื่องเดียว (รวม RAM slots, monitors, printers, USB, software)' },
                { path: 'GET /api/external/search?q=keyword', desc: 'ค้นหาตาม hostname, serial, IP หรือ user' },
                { path: 'GET /api/external/summary', desc: 'สรุปจำนวน online / offline / total / Trend Micro' },
              ].map(ep => (
                <TableRow key={ep.path} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600 }}>{ep.path}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{ep.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: theme.palette.text.secondary, mb: 1 }}>ตัวอย่างการเรียกใช้</Typography>
        <Box sx={{
          borderRadius: '10px', p: 1.5,
          bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.25) : theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.9,
          overflowX: 'auto', whiteSpace: 'pre',
        }}>
{`GET ${baseUrl}/api/external/agents
Header: x-api-key: ${apiKey}

GET ${baseUrl}/api/external/agent/HQ-TRRT-N016
GET ${baseUrl}/api/external/search?q=1FNHN42
GET ${baseUrl}/api/external/summary`}
        </Box>
      </SectionCard>
    </Box>
  );
}
