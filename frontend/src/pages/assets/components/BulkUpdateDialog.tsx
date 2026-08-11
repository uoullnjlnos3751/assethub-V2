import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Typography, TextField, MenuItem, 
  CircularProgress, Alert 
} from '@mui/material';
import { Layers } from 'lucide-react';
import { assetAPI } from '../../../services/api';

interface BulkUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  assetIds: number[];
  onSuccess: () => void;
}

export default function BulkUpdateDialog({ open, onClose, assetIds, onSuccess }: BulkUpdateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  
  // Options
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      // Reset form
      setStatus('');
      setLocation('');
      setCompany('');
      setError(null);

      // Load options
      Promise.all([
        assetAPI.statusOptions(),
        assetAPI.locationOptions(),
        assetAPI.companyOptions()
      ]).then(([sRes, lRes, cRes]) => {
        setStatuses(sRes.data);
        setLocations(lRes.data);
        setCompanies(cRes.data);
      }).catch(err => {
        console.error('Failed to load options', err);
      });
    }
  }, [open]);

  const handleUpdate = async () => {
    if (!status && !location && !company) {
      setError('กรุณาเลือกอย่างน้อย 1 ข้อมูลที่ต้องการอัปเดต');
      return;
    }

    const data: Record<string, any> = {};
    if (status) data.status = status;
    if (location) data.location = location;
    if (company) data.company = company;

    setLoading(true);
    try {
      await assetAPI.bulkUpdate(assetIds, data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Layers size={20} />
        แก้ไขข้อมูลหลายรายการ ({assetIds.length} รายการ)
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          เลือกข้อมูลที่คุณต้องการเปลี่ยนแปลงสำหรับทรัพย์สินที่เลือก ข้อมูลใดที่ไม่ถูกเลือกจะคงค่าเดิมไว้
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <TextField
            select
            label="เปลี่ยนสถานะ"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">-- ไม่เปลี่ยนแปลง --</MenuItem>
            <MenuItem value="InUse">InUse - ใช้งาน</MenuItem>
            <MenuItem value="Available">Available - สำรอง / พร้อมใช้งาน</MenuItem>
            <MenuItem value="Maintenance">Maintenance - ซ่อมบำรุง</MenuItem>
            <MenuItem value="Retired">Retired - ปลดระวาง/เตรียมบริจาค</MenuItem>
            <MenuItem value="Lost">Lost - สูญหาย</MenuItem>
            {statuses.map((s: any) => {
              const code = s.code || s.id || s.name;
              const thaiNames: Record<string, string> = {
                Available: 'สำรอง / พร้อมใช้งาน',
                Borrowed: 'กำลังยืม',
                InUse: 'ใช้งาน',
                Maintenance: 'ซ่อมบำรุง',
                Retired: 'ปลดระวาง/เตรียมบริจาค',
                Lost: 'สูญหาย'
              };
              const thaiName = thaiNames[code] || s.name;
              return (
                <MenuItem key={code} value={code}>{`${code} - ${thaiName}`}</MenuItem>
              );
            })}
          </TextField>

          <TextField
            select
            label="เปลี่ยนสถานที่ตั้ง (Location)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">-- ไม่เปลี่ยนแปลง --</MenuItem>
            {locations.map(l => (
              <MenuItem key={l.id} value={l.name}>{l.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="เปลี่ยนบริษัทถือครอง (Company)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">-- ไม่เปลี่ยนแปลง --</MenuItem>
            {companies.map(c => (
              <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
            ))}
          </TextField>

        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          ยกเลิก
        </Button>
        <Button 
          onClick={handleUpdate} 
          variant="contained" 
          disabled={loading || (!status && !location && !company)}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          บันทึกการเปลี่ยนแปลง
        </Button>
      </DialogActions>
    </Dialog>
  );
}
