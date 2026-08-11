import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { borrowAPI } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';

/* ─── Extend borrow-due-date dialog ───────────────────────────── */
export default function ExtendBorrowDialog({ open, item, onClose, onSuccess }: {
  open: boolean;
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [extendDays, setExtendDays] = useState(3);
  const [extendReason, setExtendReason] = useState('');

  // Original behavior: every time the dialog is opened (from the "ขยายวัน" button),
  // the day count resets to the default of 3 regardless of any prior session.
  useEffect(() => {
    if (open) setExtendDays(3);
  }, [open]);

  const handleClose = () => { onClose(); setExtendReason(''); };

  const handleSubmit = async () => {
    if (!item) return;
    try {
      await borrowAPI.createExtension({
        requestId: item.requestId,
        itemIds: [item.id],
        extraDays: extendDays,
        reason: extendReason || 'ต้องการขยายวันยืม',
      });
      toast.success('ส่งคำขอขยายวันเรียบร้อย รอ IT Admin อนุมัติ');
      setExtendReason('');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ไม่สามารถขยายวันได้');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>ขยายวันยืม</DialogTitle>
      <DialogContent dividers>
        {item && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>{item.assetCode}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>กำหนดคืนปัจจุบัน: {new Date(item.dueDate).toLocaleDateString('th-TH')}</Typography>
            <TextField type="number" label="จำนวนวันที่ต้องการขยาย" fullWidth value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)} inputProps={{ min: 1, max: 30 }} sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              วันสิ้นสุดใหม่: {new Date(new Date(item.dueDate).getTime() + extendDays * 86400000).toLocaleDateString('th-TH')}
            </Typography>
            <TextField
              label="เหตุผลในการขยายวัน"
              fullWidth
              multiline
              rows={2}
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="เช่น ยังใช้งานไม่เสร็จ, ต้องการทำงานต่อ"
              sx={{ mt: 2 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>ยกเลิก</Button>
        <Button variant="contained" onClick={handleSubmit}>ส่งคำขอ</Button>
      </DialogActions>
    </Dialog>
  );
}
