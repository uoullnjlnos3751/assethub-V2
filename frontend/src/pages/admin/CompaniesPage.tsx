import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Chip, IconButton, TextField, Checkbox, List, ListItem,
  ListItemText, ListItemIcon, Alert
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Sync as SyncIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { adminAPI, assetAPI } from '../../services/api';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function CompaniesPage({ embedded }: { embedded?: boolean }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);

  // Add/Edit Dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyNameEng, setNewCompanyNameEng] = useState('');
  const [assetCompanyCodes, setAssetCompanyCodes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCompanies = () => {
    setLoading(true);
    assetAPI.companies()
      .then((res: any) => setCompanies(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCompanies(); }, []);

  const confirm = useConfirm();
  const handleSyncAD = async () => {
    if (!await confirm({
      title: 'ดึงข้อมูลบริษัทจาก Intra-tools',
      detail: 'ข้อมูลบริษัทที่มีอยู่จะถูกปรับให้ตรงกับ Intra-tools',
      confirmLabel: 'ดึงข้อมูล', danger: false,
    })) return;
    
    setSyncing(true);
    try {
      const res = await adminAPI.syncADCompanies();
      alert(res.data.message || 'ดึงข้อมูลสำเร็จ');
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewCompanyCode('');
    setNewCompanyName('');
    setNewCompanyNameEng('');
    setAssetCompanyCodes('');
    setEditDialog(true);
  };

  const handleOpenEdit = (row: any) => {
    setEditingId(row.id);
    setNewCompanyCode(row.code || '');
    setNewCompanyName(row.name || '');
    setNewCompanyNameEng(row.nameEng || '');
    setAssetCompanyCodes(row.assetCompanyCodes || '');
    setEditDialog(true);
  };

  const handleSaveCompany = async () => {
    if (!newCompanyName.trim()) return;
    setSaving(true);
    const data = { 
      code: newCompanyCode.trim() || null,
      name: newCompanyName.trim(), 
      nameEng: newCompanyNameEng.trim() || null,
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
    if (await confirm({ title: 'ลบบริษัท', target: name })) {
      try {
        await assetAPI.deleteCompany(id);
        fetchCompanies();
      } catch (err: any) {
        alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบ (อาจมีทรัพย์สินผูกอยู่)');
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'code', headerName: 'รหัส (Code)', width: 100, valueFormatter: (v) => v || '-' },
    { field: 'name', headerName: 'ชื่อบริษัท (TH)', flex: 1 },
    { field: 'nameEng', headerName: 'ชื่อบริษัทหลัก (EN)', flex: 1, valueFormatter: (v) => v || '-' },
    { field: 'assetCompanyCodes', headerName: 'ชื่อบริษัทย่อ (Asset)', width: 140, valueFormatter: (v) => v || '-' },
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
      {!embedded && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={600}>จัดการบริษัท (Companies)</Typography>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAdd}>
              เพิ่มบริษัทด้วยตนเอง
            </Button>
            <Button variant="contained" startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />} onClick={handleSyncAD} disabled={syncing}>
              {syncing ? 'กำลังดึง...' : 'ดึงรายชื่อจาก Intra-tools'}
            </Button>
          </Box>
        </Box>
      )}

      {embedded && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            เพิ่ม
          </Button>
          <Button variant="contained" size="small" startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />} onClick={handleSyncAD} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Intra Sync'}
          </Button>
        </Box>
      )}

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



      {/* Dialog: Add/Edit Manual */}
      <Dialog open={editDialog} onClose={() => !saving && setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'แก้ไขข้อมูลบริษัท' : 'เพิ่มบริษัทใหม่ด้วยตนเอง'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="รหัสบริษัท (Code)"
            fullWidth
            variant="outlined"
            value={newCompanyCode}
            onChange={(e) => setNewCompanyCode(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            autoFocus
            margin="dense"
            label="ชื่อบริษัท (TH)"
            fullWidth
            variant="outlined"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="ชื่อบริษัทหลัก (EN)"
            fullWidth
            variant="outlined"
            value={newCompanyNameEng}
            onChange={(e) => setNewCompanyNameEng(e.target.value)}
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
