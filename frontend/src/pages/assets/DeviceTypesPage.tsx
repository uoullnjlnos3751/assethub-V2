import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { assetAPI } from '../../services/api';

const emptyForm = {
  name: '',
  description: '',
  isActive: true,
};

export default function DeviceTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.deviceTypes();
      setTypes(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTypes(); }, []);

  const openCreateDialog = () => {
    setEditingType(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (type: any) => {
    setEditingType(type);
    setForm({
      name: type.name || '',
      description: type.description || '',
      isActive: type.isActive ?? true,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setError('กรุณาระบุประเภทอุปกรณ์');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = {
        name,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };

      if (editingType) {
        await assetAPI.updateDeviceType(editingType.id, data);
      } else {
        await assetAPI.createDeviceType(data);
      }

      setDialogOpen(false);
      fetchTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกประเภทอุปกรณ์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: any) => {
    if (!window.confirm(`ต้องการลบประเภทอุปกรณ์ "${type.name}" ใช่หรือไม่?`)) return;
    try {
      await assetAPI.deleteDeviceType(type.id);
      fetchTypes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'ไม่สามารถลบประเภทอุปกรณ์ได้');
    }
  };

  const handleImport = async () => {
    try {
      await assetAPI.importDeviceTypesFromAssets();
      fetchTypes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'ไม่สามารถนำเข้าประเภทจากทรัพย์สินได้');
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'ประเภทอุปกรณ์', flex: 1, minWidth: 180 },
    { field: 'description', headerName: 'รายละเอียด', flex: 1.4, minWidth: 220 },
    {
      field: 'isActive',
      headerName: 'สถานะ',
      width: 130,
      renderCell: ({ value }) => <Chip size="small" color={value ? 'success' : 'default'} label={value ? 'ใช้งาน' : 'ปิดใช้งาน'} />,
    },
    { field: 'assetCount', headerName: 'จำนวนทรัพย์สิน', width: 140 },
    {
      field: 'actions',
      headerName: 'จัดการ',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="แก้ไข">
            <IconButton size="small" color="info" onClick={() => openEditDialog(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="ลบ">
            <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>ประเภทอุปกรณ์ (Device Types)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            จัดการรายการประเภทสำหรับใช้ในฟอร์มทรัพย์สินและตัวกรองทะเบียน
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={handleImport}>นำเข้าจากทรัพย์สิน</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>เพิ่มประเภท</Button>
        </Stack>
      </Stack>

      <DataGrid
        rows={types}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        autoHeight
        disableRowSelectionOnClick
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingType ? 'แก้ไขประเภทอุปกรณ์' : 'เพิ่มประเภทอุปกรณ์'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="ประเภทอุปกรณ์ *"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              autoFocus
            />
            <TextField
              label="รายละเอียด"
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />}
              label="เปิดใช้งาน"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
