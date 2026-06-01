import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QRScannerModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            false
          );
          
          scannerRef.current.render(
            (decodedText) => {
              console.log("QR Decoded:", decodedText);
              // Clean up scanner
              if (scannerRef.current) {
                scannerRef.current.clear().catch(e => console.error(e));
                scannerRef.current = null;
              }
              onClose();
              
              // Assume decodedText is the Asset Code
              navigate(`/assets?search=${encodeURIComponent(decodedText)}`);
            },
            (error) => {
              // Ignore typical scan errors
            }
          );
        }
      }, 100);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    };
  }, [open, onClose, navigate]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>สแกน QR Code ทรัพย์สิน</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box id="reader" sx={{ width: '100%', maxWidth: '300px', mx: 'auto' }}></Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          หันกล้องไปที่ QR Code ของทรัพย์สินที่ต้องการตรวจสอบ
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
