import React, { useRef } from 'react';
import { Box, Typography, IconButton, alpha, useTheme } from '@mui/material';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import CloseIcon from '@mui/icons-material/Close';

export interface PendingPhoto {
  file: File;
  previewUrl: string;
}

/**
 * Local (not-yet-uploaded) photo picker for checkout/return evidence shots.
 * Files are only actually sent once the parent's save action succeeds and it
 * has a real checkoutId/returnId to attach them to — this component just
 * collects File objects + local object-URL previews.
 */
export function EvidencePhotoPicker({ photos, onChange, label = 'แนบภาพถ่ายหลักฐาน', max = 4 }: {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  label?: string;
  max?: number;
}) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= max) break;
      if (!file.type.startsWith('image/')) continue;
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (idx: number) => {
    URL.revokeObjectURL(photos[idx].previewUrl);
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        {label} ({photos.length}/{max})
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {photos.map((p, i) => (
          <Box key={p.previewUrl} sx={{ position: 'relative', width: 72, height: 72, borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
            <Box component="img" src={p.previewUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <IconButton
              size="small"
              onClick={() => remove(i)}
              sx={{
                position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                bgcolor: alpha('#000', 0.55), color: '#fff',
                '&:hover': { bgcolor: alpha('#000', 0.75) },
              }}
            >
              <CloseIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        ))}
        {photos.length < max && (
          <Box
            component="label"
            sx={{
              width: 72, height: 72, borderRadius: 1.5, cursor: 'pointer',
              border: `1.5px dashed ${theme.palette.divider}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.palette.text.disabled,
              '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main },
            }}
          >
            <AddAPhotoIcon fontSize="small" />
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
