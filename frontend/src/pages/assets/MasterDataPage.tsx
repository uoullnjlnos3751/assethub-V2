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
  MenuItem,
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

type StatusOption = { code: string; name: string };

type MasterDataPageProps = {
  title: string;
  subtitle: string;
  itemLabel: string;
  fetchItems: () => Promise<any>;
  createItem: (data: any) => Promise<any>;
  updateItem: (id: number, data: any) => Promise<any>;
  deleteItem: (id: number) => Promise<any>;
  importItems?: () => Promise<any>;
  statusOptions?: StatusOption[];
  showCompanyField?: boolean;
};

const emptyForm = {
  code: '',
  name: '',
  company: '',
  description: '',
  isActive: true,
};

export default function MasterDataPage({
  title,
  subtitle,
  itemLabel,
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  importItems,
  statusOptions,
  showCompanyField,
}: MasterDataPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isStatusPage = Boolean(statusOptions?.length);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchItems();
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, code: statusOptions?.[0]?.code || '' });
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setForm({
      code: item.code || statusOptions?.[0]?.code || '',
      name: item.name || '',
      company: item.company || '',
      description: item.description || '',
      isActive: item.isActive ?? true,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const code = form.code.trim();
    if (isStatusPage && !code) {
      setError('กรุณาเลือกรหัสสถานะ');
      return;
    }
    if (!name) {
      setError(`กรุณาระบุ${itemLabel}`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = {
        code: isStatusPage ? code : undefined,
        name,
        company: showCompanyField ? form.company.trim() || null : undefined,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };

      if (editingItem) {
        await updateItem(editingItem.id, data);
      } else {
        await createItem(data);
      }

      setDialogOpen(false);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || `ไม่สามารถบันทึก${itemLabel}ได้`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`ต้องการลบ "${item.name}" ใช่หรือไม่?`)) return;
    try {
      await deleteItem(item.id);
      loadItems();
    } catch (err: any) {
      alert(err.response?.data?.error || `ไม่สามารถลบ${itemLabel}ได้`);
    }
  };

  const handleImport = async () => {
    if (!importItems) return;
    try {
      await importItems();
      loadItems();
    } catch (err: any) {
      alert(err.response?.data?.error || `ไม่สามารถนำเข้า${itemLabel}จากทรัพย์สินได้`);
    }
  };

  const columns: GridColDef[] = [
    ...(isStatusPage ? [{ field: 'code', headerName: 'รหัส', width: 140 } as GridColDef] : []),
    { field: 'name', headerName: itemLabel, flex: 1, minWidth: 180 },
    ...(showCompanyField ? [{ field: 'company', headerName: 'Company', width: 150 } as GridColDef] : []),
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
          <Typography variant="h4" fontWeight={700}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {importItems && <Button variant="outlined" startIcon={<SyncIcon />} onClick={handleImport}>นำเข้าจากทรัพย์สิน</Button>}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>เพิ่ม</Button>
        </Stack>
      </Stack>

      <DataGrid
        rows={items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        autoHeight
        disableRowSelectionOnClick
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingItem ? `แก้ไข${itemLabel}` : `เพิ่ม${itemLabel}`}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {isStatusPage && (
              <TextField
                label="รหัสสถานะ *"
                select
                fullWidth
                value={form.code}
                onChange={(e) => {
                  const nextCode = e.target.value;
                  const option = statusOptions?.find((status) => status.code === nextCode);
                  setForm((prev) => ({ ...prev, code: nextCode, name: prev.name || option?.name || '' }));
                }}
              >
                {statusOptions?.map((status) => <MenuItem key={status.code} value={status.code}>{status.code} - {status.name}</MenuItem>)}
              </TextField>
            )}
            <TextField
              label={`${itemLabel} *`}
              fullWidth
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              autoFocus={!isStatusPage}
            />
            {showCompanyField && (
              <TextField
                label="Company"
                fullWidth
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              />
            )}
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
