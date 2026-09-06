import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  AddCircleOutline as AddIcon,
} from '@mui/icons-material';
import { Database } from 'lucide-react';
import { systemBackupAPI } from '../../../services/api';
import { formatDateTime } from '../../../utils/dateUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { SectionCard } from '../../../components/SectionCard';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

export default function BackupTab() {
  const { user } = useAuth();
  // Restore/delete overwrite or remove a full database backup — the backend
  // requires SUPERADMIN for both; hide just these two actions for IT_ADMIN
  // rather than the whole tab, matching the route-level access this tab
  // replaces (admin/backup previously admitted IT_ADMIN too).
  const canDestroy = user?.role === 'SUPERADMIN';
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'delete' | 'restore' | null; filename: string }>({
    open: false, action: null, filename: '',
  });

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await systemBackupAPI.list();
      setBackups(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลแบ็คอัพได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await systemBackupAPI.create();
      setSuccess(res.data.message || 'สร้าง Backup สำเร็จ');
      fetchBackups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'การสร้าง Backup ล้มเหลว');
      setLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    const { action, filename } = confirmDialog;
    setConfirmDialog({ open: false, action: null, filename: '' });
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      if (action === 'delete') {
        await systemBackupAPI.delete(filename);
        setSuccess('ลบไฟล์ Backup สำเร็จ');
        fetchBackups();
      } else if (action === 'restore') {
        await systemBackupAPI.restore(filename);
        setSuccess('กู้คืนข้อมูลจาก Backup สำเร็จ');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `การ${action === 'restore' ? 'กู้คืนข้อมูล' : 'ลบไฟล์'}ล้มเหลว`);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <SectionCard title="Backup ฐานข้อมูล" icon={Database}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="body2" fontWeight={600}>ไฟล์ข้อมูลสำรองทั้งหมด ({backups.length} ไฟล์)</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              💡 ระบบทำการสำรองข้อมูลอัตโนมัติทุกวันเวลา 02:00 น. และจะเก็บไฟล์ย้อนหลังไว้สูงสุด 180 วัน
            </Typography>
          </Box>
          <Button
            variant="contained" size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon fontSize="small" />}
            onClick={handleCreate} disabled={loading}
          >
            สร้าง Backup ตอนนี้
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ชื่อไฟล์</TableCell>
                <TableCell>ขนาดไฟล์</TableCell>
                <TableCell>วันที่สร้าง</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && backups.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}><CircularProgress size={22} /></TableCell></TableRow>
              ) : backups.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>ยังไม่มีข้อมูลแบ็คอัพ</TableCell></TableRow>
              ) : (
                backups.map((b) => (
                  <TableRow key={b.filename} hover>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500 }}>{b.filename}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{formatSize(b.size)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{formatDateTime(b.createdAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton aria-label="ดาวน์โหลด" size="small" color="primary" onClick={() => systemBackupAPI.download(b.filename)} title="ดาวน์โหลด">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      {canDestroy && (
                        <>
                          <IconButton aria-label="กู้คืน" size="small" color="warning" onClick={() => setConfirmDialog({ open: true, action: 'restore', filename: b.filename })} title="กู้คืนข้อมูล">
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                          <IconButton aria-label="ลบ" size="small" color="error" onClick={() => setConfirmDialog({ open: true, action: 'delete', filename: b.filename })} title="ลบ">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle sx={{ color: confirmDialog.action === 'restore' ? 'warning.main' : 'error.main' }}>
          {confirmDialog.action === 'restore' ? 'ยืนยันการกู้คืนข้อมูล?' : 'ยืนยันการลบไฟล์?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'restore'
              ? `คำเตือน: การกู้คืนข้อมูลจะทำการลบข้อมูลปัจจุบันและแทนที่ด้วยข้อมูลจากไฟล์ ${confirmDialog.filename} คุณแน่ใจหรือไม่?`
              : `คุณแน่ใจหรือไม่ที่จะลบไฟล์แบ็คอัพ ${confirmDialog.filename}? การกระทำนี้ไม่สามารถยกเลิกได้`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="inherit">ยกเลิก</Button>
          <Button onClick={handleConfirmAction} color={confirmDialog.action === 'restore' ? 'warning' : 'error'} variant="contained" autoFocus>
            {confirmDialog.action === 'restore' ? 'กู้คืนข้อมูล' : 'ลบไฟล์'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
