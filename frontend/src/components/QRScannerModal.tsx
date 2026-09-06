import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

// html5-qrcode ~382 KB โหลดตอนเปิดกล้องสแกนจริงเท่านั้น
const loadScanner = async () => (await import('html5-qrcode')).Html5QrcodeScanner;

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, a successful scan calls this instead of navigating to
   *  the asset search page — used by pages (checkout/return) that want to
   *  act on the scanned code themselves rather than leaving the page. */
  onScan?: (decodedText: string) => void;
}

export default function QRScannerModal({ open, onClose, onScan }: Props) {
  const navigate = useNavigate();
  const scannerRef = useRef<InstanceType<Awaited<ReturnType<typeof loadScanner>>> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(async () => {
        if (!scannerRef.current) {
          const Html5QrcodeScanner = await loadScanner();
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

              if (onScan) {
                onScan(decodedText);
              } else {
                // Assume decodedText is the Asset Code
                navigate(`/assets?search=${encodeURIComponent(decodedText)}`);
              }
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
  }, [open, onClose, navigate, onScan]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>สแกน QR Code ทรัพย์สิน</Typography>
        <IconButton aria-label="ปิด" onClick={onClose} size="small"><CloseIcon /></IconButton>
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
