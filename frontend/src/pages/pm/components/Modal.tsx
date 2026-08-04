import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, maxWidth = 640 }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{ sx: { maxWidth, maxHeight: '92vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} component="span">
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
