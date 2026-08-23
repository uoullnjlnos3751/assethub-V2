import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, CircularProgress, Chip, alpha, useTheme,
} from '@mui/material';
import { ScanLine, Search, ArrowRight, Laptop, MapPin, UserCheck, Wrench } from 'lucide-react';
import QRScannerModal from '../components/QRScannerModal';
import { assetAPI, pmAPI } from '../services/api';

/**
 * หน้าสแกนสำหรับใช้บนมือถือหน้างาน
 *
 * งานสองอย่างในระบบนี้เกิดขึ้นไกลจากโต๊ะ — เดินทำ PM กับเดินตรวจนับ — แต่ทั้งคู่
 * บังคับให้เดินกลับมานั่งหน้าคอมเพื่อค้นหาเครื่องในทะเบียนก่อน
 *
 * ที่นี่ยิงกล้องที่สติกเกอร์แล้วได้เครื่องนั้นทันที พร้อมสามอย่างที่มักอยากรู้
 * ตรงนั้น: ใครถืออยู่ · ตั้งอยู่ที่ไหน · PM ปีนี้ทำหรือยัง
 *
 * ใช้ตัวสแกนตัวเดียวกับที่หน้ายืม-คืนใช้อยู่แล้ว ไม่ได้เพิ่ม dependency
 */

const YEAR = new Date().getFullYear();

export default function ScanPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [scanOpen, setScanOpen] = useState(false);
  const [term, setTerm] = useState(params.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  const lookup = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setLoading(true); setNotFound(null); setAsset(null); setRun(null);
    setParams({ q }, { replace: true });
    try {
      // สติกเกอร์บางใบเป็นรหัสทรัพย์สิน บางใบเป็น serial ค้นทีเดียวครอบทั้งสองแบบ
      const res = await assetAPI.list({ search: q, limit: 5 });
      const rows: any[] = res.data?.data || [];
      const hit = rows.find(r =>
        [r.assetName, r.assetCode, r.serialNo, r.snComputer]
          .some(v => String(v ?? '').trim().toLowerCase() === q.toLowerCase()),
      ) || rows[0];

      if (!hit) { setNotFound(q); return; }
      const full = await assetAPI.get(hit.id);
      setAsset(full.data);

      // งาน PM ของปีนี้ ถ้ามี — ปุ่มจะพาไปทำต่อได้เลยโดยไม่ต้องค้นซ้ำ
      try {
        const runs = await pmAPI.runs({ year: YEAR, search: full.data.assetName, limit: 5 });
        const list: any[] = runs.data?.data || runs.data || [];
        setRun(list.find(r => r.assetId === hit.id) || null);
      } catch { /* ไม่มีคิว PM ก็ยังใช้หน้านี้ได้ */ }
    } catch {
      setNotFound(q);
    } finally { setLoading(false); }
  }, [setParams]);

  useEffect(() => {
    const q = params.get('q');
    if (q && !asset && !loading) lookup(q);
    // ตั้งใจให้วิ่งครั้งเดียวตอนเปิดหน้าพร้อม ?q= จาก QR ที่สแกนมาจากที่อื่น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pmLabel = run
    ? (run.status === 'COMPLETED' ? 'PM ปีนี้เสร็จแล้ว' : 'PM ปีนี้ยังไม่เสร็จ')
    : 'ไม่มีแผน PM ปีนี้';
  const pmTone = run
    ? (run.status === 'COMPLETED' ? theme.palette.success.main : theme.palette.warning.main)
    : theme.palette.text.disabled;

  const facts = asset ? [
    {
      icon: UserCheck, label: 'ผู้ครอบครอง',
      value: asset.ownerName || 'ยังไม่ระบุ',
    },
    { icon: MapPin, label: 'ที่ตั้ง', value: [asset.location, asset.departmentId].filter(Boolean).join(' · ') || 'ยังไม่ระบุ' },
    { icon: Laptop, label: 'สถานะ', value: asset.status || '—' },
  ] : [];

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', pb: 5 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScanLine size={20} color={theme.palette.primary.main} /> สแกนหาเครื่อง
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
          ยิงกล้องที่สติกเกอร์ หรือพิมพ์รหัส/serial เพื่อเปิดเครื่องนั้นทันที
        </Typography>
      </Box>

      <Button fullWidth variant="contained" size="large" startIcon={<ScanLine size={20} />}
        onClick={() => setScanOpen(true)}
        sx={{ py: 1.75, fontSize: 15, fontWeight: 700, borderRadius: 3, mb: 1.5 }}>
        เปิดกล้องสแกน
      </Button>

      <Box component="form" onSubmit={(e) => { e.preventDefault(); lookup(term); }}
        sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        <TextField fullWidth size="medium" value={term} onChange={e => setTerm(e.target.value)}
          placeholder="หรือพิมพ์รหัสเครื่อง / serial"
          InputProps={{ sx: { borderRadius: 2.5, fontSize: 15 } }} />
        <Button type="submit" variant="outlined" sx={{ borderRadius: 2.5, minWidth: 54 }}>
          <Search size={18} />
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={26} /></Box>
      )}

      {notFound && !loading && (
        <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.08),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>ไม่พบ “{notFound}” ในทะเบียน</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
            อาจเป็นเครื่องที่ยังไม่ได้ลงทะเบียน หรือสติกเกอร์อ่านไม่ตรง
          </Typography>
          <Button size="small" sx={{ mt: 1.5 }} onClick={() => navigate('/assets/new')}>
            ลงทะเบียนเครื่องใหม่
          </Button>
        </Box>
      )}

      {asset && !loading && (
        <Box sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2.25, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography sx={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>
              {asset.assetName || asset.assetCode}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              {[asset.brand, asset.model, asset.serialNo].filter(Boolean).join(' · ')}
            </Typography>
            <Chip size="small" label={pmLabel}
              sx={{ mt: 1.25, fontSize: 11.5, fontWeight: 600, color: pmTone,
                bgcolor: alpha(pmTone, 0.12), border: `1px solid ${alpha(pmTone, 0.3)}` }} />
          </Box>

          <Box sx={{ p: 2.25, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {facts.map(f => (
              <Box key={f.label} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                <f.icon size={16} style={{ color: theme.palette.text.disabled, marginTop: 2 }} />
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>{f.label}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{f.value}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 2.25, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {run && run.status !== 'COMPLETED' && (
              <Button fullWidth variant="contained" size="large" startIcon={<Wrench size={18} />}
                onClick={() => navigate(`/pm/runs/${run.id}`)}
                sx={{ py: 1.4, borderRadius: 2.5, fontWeight: 700 }}>
                ทำ PM เครื่องนี้ต่อ
              </Button>
            )}
            <Button fullWidth variant="outlined" size="large" endIcon={<ArrowRight size={17} />}
              onClick={() => navigate(`/assets/${asset.id}`)}
              sx={{ py: 1.4, borderRadius: 2.5 }}>
              เปิดหน้าทรัพย์สิน
            </Button>
          </Box>
        </Box>
      )}

      <QRScannerModal open={scanOpen} onClose={() => setScanOpen(false)}
        onScan={(text) => { setTerm(text); lookup(text); }} />
    </Box>
  );
}
