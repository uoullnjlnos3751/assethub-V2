import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { assetAPI } from '../../../services/api';
import { useConfirm } from '../../../contexts/ConfirmContext';

/* ─── Documents tab ───────────────────────────────────────────── */
export function DocumentsTab({ asset, onReload }: { asset: any; onReload: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const docs = asset.documents || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Check size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await assetAPI.uploadDocument(asset.id, fd);
      onReload();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'อัพโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (docId: number) => {
    if (!await confirm({ title: 'ลบเอกสารแนบ', target: docs.find((d: any) => d.id === docId)?.fileName })) return;
    try {
      await assetAPI.deleteDocument(asset.id, docId);
      onReload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
          เอกสารแนบ
        </Typography>
        <Button
          component="label"
          variant="contained"
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
          disabled={uploading}
          sx={{ borderRadius: '8px', textTransform: 'none' }}
        >
          {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดเอกสาร'}
          <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      {docs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <InsertDriveFileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">ยังไม่มีเอกสารแนบ</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {docs.map((doc: any) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card variant="outlined" sx={{ boxShadow: 'none' }}>
                <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', width: 36, height: 36 }}>
                    <InsertDriveFileIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap title={doc.fileName}>
                      {doc.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Tooltip title="ดาวน์โหลด">
                      <IconButton aria-label="ดาวน์โหลด" size="small" onClick={() => assetAPI.downloadDocument(asset.id, doc.id)}>
                        <DownloadIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton aria-label="ลบ" size="small" onClick={() => handleDelete(doc.id)}>
                        <DeleteOutlineIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Card>
  );
}
