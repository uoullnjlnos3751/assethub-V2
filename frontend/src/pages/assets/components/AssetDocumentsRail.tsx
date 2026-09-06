import React, { useState } from 'react';
import { Box, Typography, CircularProgress, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Paperclip } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { assetAPI } from '../../../services/api';
import { useConfirm } from '../../../contexts/ConfirmContext';

const extOf = (name: string) => (name.split('.').pop() || '').toUpperCase().slice(0, 4);

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Colour the badge by family so PDFs/images are distinguishable at a glance. */
function badgeTone(ext: string, theme: any) {
  if (ext === 'PDF') return theme.palette.error.main;
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext)) return theme.palette.success.main;
  if (['XLS', 'XLSX', 'CSV'].includes(ext)) return theme.palette.secondary.main;
  return theme.palette.primary.main;
}

/**
 * Compact attachments list for the detail page's context rail (the handoff puts
 * เอกสารแนบ beside the content, not behind a tab). Upload/delete/download all
 * work here; the เอกสาร tab remains for the roomier grid view.
 */
export function AssetDocumentsRail({ asset, onReload }: { asset: any; onReload: () => void }) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const docs = asset.documents || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      setErr('ขนาดไฟล์ต้องไม่เกิน 10MB');
      e.target.value = '';
      return;
    }
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await assetAPI.uploadDocument(asset.id, fd);
      onReload();
    } catch (e: any) {
      setErr(e.response?.data?.message || 'อัพโหลดไม่สำเร็จ');
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
    } catch (e: any) {
      setErr(e.response?.data?.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <SectionCard title="เอกสารแนบ" icon={Paperclip}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
        {docs.map((doc: any) => {
          const ext = extOf(doc.fileName);
          const tone = badgeTone(ext, theme);
          return (
            <Box key={doc.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.1,
              p: 1, borderRadius: '11px', border: `1px solid ${theme.palette.divider}`,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}>
              <Box sx={{
                width: 34, height: 34, flex: 'none', borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(tone, 0.13), color: tone, fontSize: '0.6rem', fontWeight: 800,
              }}>
                {ext || 'FILE'}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap title={doc.fileName} sx={{ fontSize: '0.76rem', fontWeight: 600, color: theme.palette.text.primary }}>
                  {doc.fileName}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>
                  {fmtSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                </Typography>
              </Box>
              <Tooltip title="ดาวน์โหลด">
                <IconButton aria-label="ดาวน์โหลด" size="small" onClick={() => assetAPI.downloadDocument(asset.id, doc.id)}>
                  <DownloadIcon sx={{ fontSize: 16 }} color="primary" />
                </IconButton>
              </Tooltip>
              <Tooltip title="ลบ">
                <IconButton aria-label="ลบ" size="small" onClick={() => handleDelete(doc.id)}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} color="error" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}

        <Box
          component="label"
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            p: 1.5, borderRadius: '11px', cursor: uploading ? 'default' : 'pointer',
            border: `1px dashed ${theme.palette.divider}`,
            color: theme.palette.text.secondary, fontSize: '0.75rem',
            transition: 'all .18s',
            '&:hover': uploading ? {} : {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              color: theme.palette.primary.main,
            },
          }}
        >
          {uploading ? <CircularProgress size={14} /> : null}
          {uploading ? 'กำลังอัพโหลด...' : 'คลิกเพื่อแนบเอกสาร'}
          <input
            type="file"
            hidden
            disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
            onChange={handleUpload}
          />
        </Box>

        {err && (
          <Typography sx={{ fontSize: '0.7rem', color: theme.palette.error.main }}>{err}</Typography>
        )}
      </Box>
    </SectionCard>
  );
}
