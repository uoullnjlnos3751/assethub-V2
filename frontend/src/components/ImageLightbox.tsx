import React from 'react';
import { Box, Button, Dialog, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface ImageLightboxProps {
  open: boolean;
  onClose: () => void;
  /** ที่อยู่รูป — ว่างเมื่อไหร่หน้าต่างปิดเอง (เช่นหลังกดลบ) */
  src: string | null | undefined;
  title: string;
  /** ใส่มาเมื่อเปลี่ยนรูปได้จากตรงนี้ ไม่ใส่ = ไม่ขึ้นปุ่ม */
  onReplace?: () => void;
  replacing?: boolean;
  /** ใส่มาเมื่อลบรูปได้จริง ๆ เท่านั้น — บางที่ยังไม่มี API ลบ อย่าขึ้นปุ่มหลอก */
  onDelete?: () => void;
}

/**
 * ดูรูปขนาดเต็ม พร้อมแก้ไขได้จากตรงนั้น
 *
 * รูปที่แนบในระบบนี้ (ป้ายทะเบียนทรัพย์สิน รูปตอนทำ PM รูปจอมอนิเตอร์) ถูกย่อ
 * เหลือ 60–200px ซึ่งอ่านเลขบนป้ายหรือดูว่าถ่ายชัดไม่ออกเลย พอกางดูแล้วเจอว่า
 * ถ่ายผิดหรือเบลอ สิ่งที่ต้องทำต่อคือเปลี่ยนหรือลบทันที ปุ่มจึงอยู่ในหน้าต่าง
 * เดียวกัน ไม่ใช่ให้ปิดออกไปหาปุ่มอีกที
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  open, onClose, src, title, onReplace, replacing = false, onDelete,
}) => (
  <Dialog
    open={open && !!src}
    onClose={onClose}
    maxWidth={false}
    PaperProps={{
      sx: {
        bgcolor: 'rgba(0,0,0,0.92)', backgroundImage: 'none', boxShadow: 'none',
        m: 2, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)',
        display: 'flex', flexDirection: 'column',
      },
    }}
  >
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 2, px: 2, py: 1.25, color: '#fff',
      borderBottom: '1px solid rgba(255,255,255,0.15)',
    }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {onReplace && (
          <Button
            size="small" variant="outlined" startIcon={<PhotoCameraIcon sx={{ fontSize: 16 }} />}
            onClick={onReplace}
            disabled={replacing}
            /* ธีมตั้งพื้นหลังปุ่ม outlined เป็นสีขาวไว้ ถ้าไม่ล้างทิ้งจะได้
               ตัวอักษรขาวบนพื้นขาวบนฉากมืดของหน้าดูรูป */
            sx={{
              color: '#fff', bgcolor: 'transparent', borderColor: 'rgba(255,255,255,0.4)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#fff' },
              '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)', bgcolor: 'transparent' },
            }}
          >
            {replacing ? 'กำลังอัพโหลด...' : 'เปลี่ยนรูป'}
          </Button>
        )}
        {onDelete && (
          <Button
            size="small" variant="outlined" color="error" startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
            onClick={onDelete}
            sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'rgba(220,38,38,0.14)' } }}
          >
            ลบรูป
          </Button>
        )}
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
    <Box sx={{
      flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'auto', p: 1,
    }}>
      <Box
        component="img"
        src={src || ''}
        alt={title}
        sx={{ maxWidth: '100%', maxHeight: 'calc(100vh - 130px)', objectFit: 'contain', display: 'block' }}
      />
    </Box>
  </Dialog>
);
