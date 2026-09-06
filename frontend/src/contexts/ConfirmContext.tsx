import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Typography, alpha, useTheme,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * กล่องยืนยันการกระทำที่ย้อนกลับไม่ได้
 *
 * ของเดิมใช้ window.confirm ซึ่งแสดงได้แค่ข้อความบรรทัดเดียว บอกไม่ได้ว่ากำลัง
 * จะลบ "อะไร" ผู้ใช้เห็นแค่ "แน่ใจหรือไม่" แล้วกด OK โดยไม่รู้ว่าเป็นชิ้นไหน
 * และมีอะไรผูกอยู่บ้าง — กล่องนี้จึงบังคับให้ผู้เรียกระบุชื่อสิ่งที่จะลบ และ
 * เปิดช่องให้ใส่ผลกระทบที่ตามมา
 *
 * เป็น hook คืน Promise<boolean> เพื่อให้แทนที่ `if (!window.confirm(...)) return;`
 * ได้ตรงรูปเดิม แก้ทีละบรรทัดโดยไม่ต้องรื้อโครงฟังก์ชันที่เรียกใช้
 */
export interface ConfirmOptions {
  /** หัวเรื่อง เช่น "ลบทรัพย์สิน" */
  title: string;
  /** ชื่อสิ่งที่จะถูกกระทำ แสดงเด่นเพื่อให้ทานก่อนกดยืนยัน */
  target?: string;
  /** ผลที่ตามมาซึ่งย้อนกลับไม่ได้ เช่น "งาน PM ทั้งหมดในแผนจะถูกลบด้วย" */
  detail?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** false เมื่อเป็นการยืนยันทั่วไปที่ไม่ได้ทำลายข้อมูล */
  danger?: boolean;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolver.current = resolve;
    setBusy(false);
    setOpts(o);
  }), []);

  const settle = (ok: boolean) => {
    // ปิดก่อนแล้วค่อยตอบ เพื่อให้ผู้เรียกที่ทำงานต่อทันทีไม่ต้องรออนิเมชันปิด
    setOpts(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(ok);
  };

  const danger = opts?.danger !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => !busy && settle(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pb: 1.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(danger ? theme.palette.error.main : theme.palette.warning.main, 0.12),
            color: danger ? 'error.main' : 'warning.main',
          }}>
            <WarningAmberIcon fontSize="small" />
          </Box>
          <Typography component="span" sx={{ fontSize: 17, fontWeight: 700 }}>
            {opts?.title}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {opts?.target && (
            <Box sx={{
              p: '10px 14px', borderRadius: '10px', mb: opts?.detail ? 1.75 : 0,
              bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
              fontSize: 14, fontWeight: 600, wordBreak: 'break-word',
            }}>
              {opts.target}
            </Box>
          )}
          {opts?.detail && (
            <Alert severity={danger ? 'error' : 'warning'} sx={{ fontSize: 13, py: 0.5 }}>
              {opts.detail}
            </Alert>
          )}
          {!opts?.target && !opts?.detail && (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              ยืนยันการดำเนินการนี้หรือไม่
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ p: '12px 24px 20px', gap: 1 }}>
          <Button variant="outlined" color="inherit" disabled={busy} onClick={() => settle(false)}>
            {opts?.cancelLabel || 'ยกเลิก'}
          </Button>
          <Button
            variant="contained"
            color={danger ? 'error' : 'warning'}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={15} color="inherit" /> : undefined}
            onClick={() => { setBusy(true); settle(true); }}
          >
            {opts?.confirmLabel || (danger ? 'ลบ' : 'ยืนยัน')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
