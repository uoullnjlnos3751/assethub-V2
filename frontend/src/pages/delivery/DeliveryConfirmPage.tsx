import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, alpha, useTheme } from '@mui/material';
import { PackageCheck, CheckCircle2, XCircle } from 'lucide-react';
import { deliveryAPI } from '../../services/api';

export default function DeliveryConfirmPage() {
  const theme = useTheme();
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) return;
    deliveryAPI.getConfirm(token)
      .then(r => {
        setData(r.data);
        if (r.data.status === 'CONFIRMED') setConfirmed(true);
      })
      .catch(err => setError(err.response?.data?.error || 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setConfirming(true);
    try {
      await deliveryAPI.confirm(token);
      setConfirmed(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ยืนยันไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: theme.palette.background.default, p: 2,
    }}>
      <Box sx={{
        maxWidth: 440, width: '100%', bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', p: 4, textAlign: 'center',
        boxShadow: theme.palette.mode === 'dark' ? '0 10px 28px -12px rgba(0,0,0,0.5)' : '0 10px 28px -12px rgba(16,24,40,.12)',
      }}>
        {loading ? (
          <CircularProgress size={32} />
        ) : error ? (
          <>
            <XCircle size={48} color={theme.palette.error.main} style={{ marginBottom: 16 }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>ไม่สามารถยืนยันได้</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: theme.palette.text.secondary }}>{error}</Typography>
          </>
        ) : confirmed ? (
          <>
            <CheckCircle2 size={48} color={theme.palette.success.main} style={{ marginBottom: 16 }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>ยืนยันรับเครื่องเรียบร้อยแล้ว</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: theme.palette.text.secondary }}>ขอบคุณครับ/ค่ะ ทาง IT ได้รับการยืนยันของท่านแล้ว</Typography>
          </>
        ) : (
          <>
            <PackageCheck size={48} color={theme.palette.primary.main} style={{ marginBottom: 16 }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: theme.palette.text.primary, mb: 0.5 }}>ยืนยันการรับเครื่อง</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: theme.palette.text.secondary, mb: 2 }}>เรียน {data?.recipientName}</Typography>

            {data?.asset && (
              <Box sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.06), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                borderRadius: '10px', p: 2, mb: 2, textAlign: 'left',
              }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: theme.palette.text.primary }}>
                  {data.asset.assetName || data.asset.assetCode} {data.asset.brand} {data.asset.model}
                </Typography>
              </Box>
            )}

            {data?.peripherals?.length > 0 && (
              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: theme.palette.text.secondary, mb: 0.5 }}>อุปกรณ์ต่อพ่วง</Typography>
                {data.peripherals.map((p: any) => (
                  <Typography key={p.id} sx={{ fontSize: '0.8rem', color: theme.palette.text.primary }}>• {p.category} — {p.itemName} ({p.qty})</Typography>
                ))}
              </Box>
            )}

            <Button fullWidth variant="contained" size="large" onClick={handleConfirm} disabled={confirming} sx={{ py: 1.25, fontWeight: 700 }}>
              {confirming ? 'กำลังยืนยัน...' : 'ยืนยันรับเครื่องแล้ว'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
