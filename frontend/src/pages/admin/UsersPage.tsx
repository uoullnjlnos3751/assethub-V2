import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress,
  List, ListItem, ListItemText, Divider, InputAdornment, IconButton, ListItemButton
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon, Add as AddIcon, PersonAdd as PersonAddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { adminAPI } from '../../services/api';
import debounce from 'lodash/debounce';

const roleColors: Record<string, string> = { SUPERADMIN: 'error', IT_ADMIN: 'warning', USER: 'default' };
const roleLabels: Record<string, string> = { SUPERADMIN: 'SuperAdmin', IT_ADMIN: 'IT Admin', USER: 'ผู้ใช้' };

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  
  // Dialog for role update
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialog for adding user from AD
  const [addDialog, setAddDialog] = useState(false);
  const [adQuery, setAdQuery] = useState('');
  const [adResults, setAdResults] = useState<any[]>([]);
  const [searchingAD, setSearchingAD] = useState(false);
  const [selectedADUser, setSelectedADUser] = useState<any>(null);
  const [assignedRole, setAssignedRole] = useState('USER');

  const fetchData = () => {
    setLoading(true);
    adminAPI.users({ search: search || undefined, page: page + 1 })
      .then((res) => { setUsers(res.data.data); setTotal(res.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSearch = () => { setPage(0); fetchData(); };

  const handleUpdateRole = async () => {
    setSaving(true);
    try {
      await adminAPI.updateRole(roleDialog.user.id, newRole);
      setRoleDialog({ open: false, user: null });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); } finally { setSaving(false); }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await adminAPI.toggleActive(id);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const handleDeleteUser = async (user: any) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้งาน ${user.displayName} (${user.adUsername}) ใช่หรือไม่?\n\n*หมายเหตุ: จะลบไม่ได้หากมีประวัติการใช้งานในระบบ`)) {
      try {
        await adminAPI.deleteUser(user.id);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    }
  };

  // AD Search Logic
  const debouncedADSearch = useCallback(
    debounce((query: string) => {
      if (query.length < 2) {
        setAdResults([]);
        return;
      }
      setSearchingAD(true);
      adminAPI.searchADUsers(query)
        .then(res => setAdResults(res.data))
        .catch(err => console.error(err))
        .finally(() => setSearchingAD(false));
    }, 500),
    []
  );

  const onADQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdQuery(e.target.value);
    debouncedADSearch(e.target.value);
  };

  const handleAddFromAD = async () => {
    if (!selectedADUser) return;
    setSaving(true);
    try {
      await adminAPI.createUserFromAD({
        ...selectedADUser,
        role: assignedRole
      });
      setAddDialog(false);
      setSelectedADUser(null);
      setAdQuery('');
      setAdResults([]);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'ไม่สามารถเพิ่มผู้ใช้ได้');
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'adUsername', headerName: 'Username', width: 140 },
    { field: 'displayName', headerName: 'ชื่อ', width: 150 },
    { field: 'email', headerName: 'อีเมล', width: 200 },
    { field: 'department', headerName: 'แผนก', width: 130 },
    { field: 'role', headerName: 'บทบาท', width: 120, renderCell: ({ value }) => <Chip label={roleLabels[value] || value} color={(roleColors[value] as any) || 'default'} size="small" /> },
    { field: 'isActive', headerName: 'สถานะ', width: 100, renderCell: ({ value }) => <Chip label={value ? 'ใช้งาน' : 'ปิด'} color={value ? 'success' : 'error'} size="small" /> },
    { field: 'lastLoginAt', headerName: 'ล็อกอินล่าสุด', width: 180, valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-' },
    {
      field: 'actions', headerName: 'จัดการ', width: 240, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => { setRoleDialog({ open: true, user: row }); setNewRole(row.role); }}>บทบาท</Button>
          <Button size="small" color={row.isActive ? 'error' : 'success'} variant="outlined" sx={{ mr: 1 }} onClick={() => handleToggleActive(row.id)}>
            {row.isActive ? 'ปิด' : 'เปิด'}
          </Button>
          <IconButton color="error" size="small" onClick={() => handleDeleteUser(row)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>จัดการผู้ใช้</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialog(true)}>เพิ่มผู้ใช้งานจาก AD</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField 
          placeholder="ค้นหาในระบบ (ชื่อ, Username, อีเมล)" 
          size="small" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
          sx={{ minWidth: 400 }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
        />
        <Button variant="outlined" onClick={handleSearch}>ค้นหา</Button>
      </Box>

      <DataGrid
        rows={users}
        columns={columns}
        loading={loading}
        rowCount={total}
        pageSizeOptions={[10, 20, 50]}
        paginationMode="server"
        paginationModel={{ page, pageSize: 20 }}
        onPaginationModelChange={(m) => setPage(m.page)}
        getRowId={(r) => r.id}
        autoHeight
        disableRowSelectionOnClick
      />

      {/* Dialog: Update Role */}
      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, user: null })} maxWidth="xs" fullWidth>
        <DialogTitle>เปลี่ยนบทบาท: {roleDialog.user?.displayName}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>บทบาท</InputLabel>
            <Select value={newRole} label="บทบาท" onChange={(e) => setNewRole(e.target.value)}>
              <MenuItem value="USER">ผู้ใช้ (User)</MenuItem>
              <MenuItem value="IT_ADMIN">IT Admin</MenuItem>
              <MenuItem value="SUPERADMIN">SuperAdmin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog({ open: false, user: null })}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleUpdateRole} disabled={saving}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add from AD */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มผู้ใช้งานใหม่จาก Active Directory</DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
          <TextField
            fullWidth
            label="พิมพ์ชื่อ หรือ Email เพื่อค้นหาใน AD"
            variant="outlined"
            sx={{ mt: 2 }}
            value={adQuery}
            onChange={onADQueryChange}
            InputProps={{
              endAdornment: searchingAD ? <CircularProgress size={20} /> : <SearchIcon />
            }}
          />

          {!selectedADUser ? (
            <List sx={{ mt: 2 }}>
              {adResults.length > 0 ? (
                adResults.map((user, idx) => (
                  <React.Fragment key={user.adUsername}>
                    <ListItem 
                      disablePadding
                      sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemButton onClick={() => setSelectedADUser(user)}>
                        <ListItemText 
                          primary={user.displayName} 
                          secondary={`${user.adUsername} | ${user.email} | ${user.department}`} 
                        />
                        <PersonAddIcon color="primary" />
                      </ListItemButton>
                    </ListItem>
                    {idx < adResults.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                adQuery.length >= 2 && !searchingAD && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>ไม่พบข้อมูลผู้ใช้ใน AD</Typography>
                )
              )}
            </List>
          ) : (
            <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f8f9fa' }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>ผู้ใช้ที่เลือก:</Typography>
              <Typography variant="h6">{selectedADUser.displayName}</Typography>
              <Typography variant="body2">{selectedADUser.adUsername} ({selectedADUser.email})</Typography>
              <Typography variant="body2" color="text.secondary">{selectedADUser.department}</Typography>
              
              <FormControl fullWidth sx={{ mt: 3 }}>
                <InputLabel>กำหนดบทบาทให้ผู้ใช้</InputLabel>
                <Select value={assignedRole} label="กำหนดบทบาทให้ผู้ใช้" onChange={(e) => setAssignedRole(e.target.value)}>
                  <MenuItem value="USER">ผู้ใช้ (User)</MenuItem>
                  <MenuItem value="IT_ADMIN">IT Admin</MenuItem>
                  <MenuItem value="SUPERADMIN">SuperAdmin</MenuItem>
                </Select>
              </FormControl>
              
              <Button sx={{ mt: 1 }} onClick={() => setSelectedADUser(null)}>เปลี่ยนคน</Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>ยกเลิก</Button>
          <Button 
            variant="contained" 
            onClick={handleAddFromAD} 
            disabled={!selectedADUser || saving}
            startIcon={saving && <CircularProgress size={16} color="inherit" />}
          >
            เพิ่มเข้าระบบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
