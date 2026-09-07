import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  /** เต็มจอ — สำหรับงานที่ต้องกรอกยาวและอยากเห็นข้อมูลประกอบไปพร้อมกัน
   *  เช่นหน้าทำ PM ที่มีเช็คลิสต์ยาวคู่กับผลตรวจจาก Agent */
  fullScreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, maxWidth = 640, fullScreen = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: fullScreen
          ? { display: 'flex', flexDirection: 'column' }
          : { maxWidth, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
        flexShrink: 0,
        ...(fullScreen && { py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }),
      }}>
        <Typography variant="subtitle1" fontWeight={600} component="span">
          {title}
        </Typography>
        <IconButton aria-label="ปิด" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      {/* เต็มจอ: ตัวเนื้อหาไม่เลื่อนเอง ปล่อยให้แต่ละคอลัมน์ข้างในเลื่อนของตัวเอง
          ไม่งั้นจะได้แถบเลื่อนซ้อนกันสองชั้น */}
      <DialogContent sx={{
        p: 0, flex: 1, display: 'flex', flexDirection: 'column',
        overflowY: fullScreen ? 'hidden' : 'auto',
        minHeight: 0,
      }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
