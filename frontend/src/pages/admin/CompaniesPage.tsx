import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Chip, IconButton, TextField, Checkbox, List, ListItem,
  ListItemText, ListItemIcon, Alert
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Sync as SyncIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { adminAPI, assetAPI } from '../../services/api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync Dialog state
  const [syncDialog, setSyncDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adCompanies, setAdCompanies] = useState<string[]>([]);
  const [selectedAD, setSelectedAD] = useState<string[]>([]);

  // Add/Edit Dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [assetCompanyCodes, setAssetCompanyCodes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCompanies = () => {
    setLoading(true);
    assetAPI.companies()
      .then((res: any) => setCompanies(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleOpenSync = async () => {
    setSyncDialog(true);
    setSyncing(true);
    try {
      const res = await adminAPI.syncADCompanies();
      setAdCompanies(res.data || []);
      // Default select all that are NOT already in the system
      const existingNames = companies.map(c => c.name.toLowerCase());
      const newFromAD = (res.data || []).filter((c: string) => !existingNames.includes(c.toLowerCase()));
      setSelectedAD(newFromAD);
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก AD');
      setSyncDialog(false);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleADSelect = (name: string) => {
    if (selectedAD.includes(name)) {
      setSelectedAD(selectedAD.filter(c => c !== name));
    } else {
      setSelectedAD([...selectedAD, name]);
    }
  };

  const handleConfirmSync = async () => {
    if (selectedAD.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 บริษัท');
      return;
    }
    setSaving(true);
    try {
      const res = await adminAPI.saveADCompanies(selectedAD);
      alert(res.data.message || `นำเข้าสำเร็จ ${res.data.syncedCount} รายการ`);
      setSyncDialog(false);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewCompanyName('');
    setAssetCompanyCodes('');
    setEditDialog(true);
  };

  const handleOpenEdit = (row: any) => {
    setEditingId(row.id);
    setNewCompanyName(row.name);
    setAssetCompanyCodes(row.assetCompanyCodes || '');
    setEditDialog(true);
  };

  const handleSaveCompany = async () => {
    if (!newCompanyName.trim()) return;
    setSaving(true);
    const data = { 
      name: newCompanyName.trim(), 
      assetCompanyCodes: assetCompanyCodes.trim() || null,
      isActive: true 
    };
    try {
      if (editingId) {
        await assetAPI.updateCompany(editingId, data);
      } else {
        await assetAPI.createCompany(data);
      }
      setEditDialog(false);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกบริษัท');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await assetAPI.updateCompany(id, { isActive: !currentActive });
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`ยืนยันการลบบริษัท ${name} ใช่หรือไม่?`)) {
      try {
        await assetAPI.deleteCompany(id);
        fetchCompanies();
      } catch (err: any) {
        alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบ (อาจมีทรัพย์สินผูกอยู่)');
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'ชื่อบริษัทหลัก (Login AD)', flex: 1 },
    { field: 'assetCompanyCodes', headerName: 'ชื่อบริษัทย่อ (Asset บริษัท)', flex: 1, valueFormatter: (v) => v || '-' },
    { 
      field: 'isActive', headerName: 'สถานะ', width: 120, 
      renderCell: ({ value }) => <Chip label={value ? 'เปิดใช้งาน' : 'ปิด'} color={value ? 'success' : 'error'} size="small" /> 
    },
    { field: 'createdAt', headerName: 'วันที่สร้าง', width: 180, valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-' },
    {
      field: 'actions', headerName: 'จัดการ', width: 200, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleOpenEdit(row)}>
            แก้ไข
          </Button>
          <Button size="small" color={row.isActive ? 'error' : 'success'} variant="outlined" sx={{ mr: 1 }} onClick={() => handleToggleActive(row.id, row.isActive)}>
            {row.isActive ? 'ปิด' : 'เปิด'}
          </Button>
          <IconButton color="error" size="small" onClick={() => handleDelete(row.id, row.name)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>จัดการบริษัท (Companies)</Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            เพิ่มบริษัทด้วยตนเอง
          </Button>
          <Button variant="contained" startIcon={<SyncIcon />} onClick={handleOpenSync}>
            ดึงรายชื่อจาก AD
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        ระบบจะใช้ชื่อบริษัทเหล่านี้เป็นตัวเลือกในหน้าลงทะเบียนทรัพย์สิน และใช้สำหรับการแบ่งแยกสิทธิ์การมองเห็นทรัพย์สินตามบริษัทของพนักงาน
      </Alert>

      <DataGrid
        rows={companies}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        autoHeight
        disableRowSelectionOnClick
        initialState={{
          sorting: { sortModel: [{ field: 'name', sort: 'asc' }] }
        }}
      />

      {/* Dialog: Sync AD */}
      <Dialog open={syncDialog} onClose={() => !saving && setSyncDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ดึงรายชื่อบริษัทจาก Active Directory</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {syncing ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={250} gap={2}>
              <CircularProgress />
              <Typography color="text.secondary">กำลังกวาดข้อมูลจาก AD (อาจใช้เวลาสักครู่)...</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                พบข้อมูลบริษัทใน AD ทั้งหมด {adCompanies.length} รายการ
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ระบบได้เลือกติ๊กเฉพาะบริษัทที่ยังไม่เคยมีในฐานข้อมูลให้แล้ว คุณสามารถเลือกเพิ่มเติมได้
              </Typography>
              
              <List sx={{ border: '1px solid #e0e0e0', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
                {adCompanies.map((name) => {
                  const exists = companies.some(c => c.name.toLowerCase() === name.toLowerCase());
                  return (
                    <ListItem key={name} disablePadding>
                      <ListItemText 
                        primary={name} 
                        secondary={exists ? 'มีในระบบแล้ว' : 'บริษัทใหม่'} 
                        sx={{ pl: 2 }}
                      />
                      <ListItemIcon>
                        <Checkbox
                          edge="end"
                          checked={selectedAD.includes(name)}
                          onChange={() => handleToggleADSelect(name)}
                        />
                      </ListItemIcon>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialog(false)} disabled={saving || syncing}>ยกเลิก</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmSync} 
            disabled={saving || syncing || selectedAD.length === 0}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            นำเข้าเข้าระบบ ({selectedAD.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add/Edit Manual */}
      <Dialog open={editDialog} onClose={() => !saving && setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'แก้ไขข้อมูลบริษัท' : 'เพิ่มบริษัทใหม่ด้วยตนเอง'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="ชื่อบริษัทหลัก (Login AD)"
            fullWidth
            variant="outlined"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="ชื่อบริษัทย่อ (Asset บริษัท) คั่นด้วยลูกน้ำ (,)"
            fullWidth
            variant="outlined"
            value={assetCompanyCodes}
            onChange={(e) => setAssetCompanyCodes(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="เช่น TRR,TRRSK"
            helperText="เว้นว่างได้ถ้าย่อเหมือนเต็ม, ใช้ลูกน้ำคั่นกรณีมีหลายตัว"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={saving}>ยกเลิก</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveCompany} 
            disabled={saving || !newCompanyName.trim()}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
