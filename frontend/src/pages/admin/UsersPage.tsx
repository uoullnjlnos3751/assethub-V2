import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress,
  List, ListItem, ListItemText, Divider, InputAdornment, IconButton, ListItemButton, Alert
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon, Add as AddIcon, PersonAdd as PersonAddIcon, Delete as DeleteIcon, Lock as LockIcon } from '@mui/icons-material';
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

  // Dialog for adding user
  const [addDialog, setAddDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 = AD, 1 = Manual
  const [adQuery, setAdQuery] = useState('');
  const [adResults, setAdResults] = useState<any[]>([]);
  const [searchingAD, setSearchingAD] = useState(false);
  const [selectedADUser, setSelectedADUser] = useState<any>(null);
  const [assignedRole, setAssignedRole] = useState('USER');

  // Manual Creation Form States
  const [manualUsername, setManualUsername] = useState('');
  const [manualDisplayName, setManualDisplayName] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualDepartment, setManualDepartment] = useState('');
  const [manualRole, setManualRole] = useState('USER');

  // Password Dialog
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');

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

  const handleCloseAddDialog = () => {
    setAddDialog(false);
    setTabValue(0);
    setAdQuery('');
    setAdResults([]);
    setSelectedADUser(null);
    setAssignedRole('USER');
    setManualUsername('');
    setManualDisplayName('');
    setManualPassword('');
    setManualEmail('');
    setManualDepartment('');
    setManualRole('USER');
  };

  const handleCreateUser = async () => {
    if (tabValue === 0) {
      if (!selectedADUser) return;
    } else {
      if (!manualUsername.trim() || !manualDisplayName.trim() || !manualPassword.trim()) {
        alert('กรุณากรอก Username, ชื่อ - นามสกุล และรหัสผ่าน');
        return;
      }
      if (manualPassword.length < 4) {
        alert('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
        return;
      }
    }

    setSaving(true);
    try {
      if (tabValue === 0) {
        await adminAPI.createUserFromAD({
          ...selectedADUser,
          role: assignedRole
        });
      } else {
        await adminAPI.createLocalUser({
          username: manualUsername.trim(),
          password: manualPassword,
          displayName: manualDisplayName.trim(),
          role: manualRole
        });
      }
      handleCloseAddDialog();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'ไม่สามารถเพิ่มผู้ใช้ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      alert('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.setLocalPassword(passwordDialog.user.id, newPassword);
      setPasswordDialog({ open: false, user: null });
      setNewPassword('');
      alert('ตั้งรหัสผ่านเรียบร้อย');
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'adUsername', headerName: 'Username', width: 140 },
    { field: 'displayName', headerName: 'ชื่อ', width: 150 },
    { field: 'email', headerName: 'อีเมล', width: 200 },
    { field: 'department', headerName: 'แผนก', width: 130 },
    { field: 'authType', headerName: 'ประเภท', width: 80, renderCell: ({ value }) => <Chip label={value || 'AD'} color={value === 'LOCAL' ? 'info' : 'default'} size="small" variant={value === 'LOCAL' ? 'filled' : 'outlined'} /> },
    { field: 'role', headerName: 'บทบาท', width: 120, renderCell: ({ value }) => <Chip label={roleLabels[value] || value} color={(roleColors[value] as any) || 'default'} size="small" /> },
    { field: 'isActive', headerName: 'สถานะ', width: 100, renderCell: ({ value }) => <Chip label={value ? 'ใช้งาน' : 'ปิด'} color={value ? 'success' : 'error'} size="small" /> },
    { field: 'lastLoginAt', headerName: 'ล็อกอินล่าสุด', width: 180, valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-' },
    {
      field: 'actions', headerName: 'จัดการ', width: 300, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => { setRoleDialog({ open: true, user: row }); setNewRole(row.role); }}>บทบาท</Button>
          {row.authType !== 'LOCAL' ? (
            <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => { setPasswordDialog({ open: true, user: row }); setNewPassword(''); }}>
              ตั้งรหัส
            </Button>
          ) : (
            <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => { setPasswordDialog({ open: true, user: row }); setNewPassword(''); }}>
              เปลี่ยนรหัส
            </Button>
          )}
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { handleCloseAddDialog(); setAddDialog(true); }}>เพิ่มผู้ใช้งานใหม่</Button>
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

      {/* Dialog: Add User (AD & Manual) */}
      <Dialog open={addDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มผู้ใช้งานใหม่</DialogTitle>
        <DialogContent sx={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
            <Button
              fullWidth
              variant={tabValue === 0 ? 'contained' : 'outlined'}
              onClick={() => setTabValue(0)}
              sx={{ py: 1 }}
            >
              ค้นหาจาก AD
            </Button>
            <Button
              fullWidth
              variant={tabValue === 1 ? 'contained' : 'outlined'}
              onClick={() => setTabValue(1)}
              sx={{ py: 1 }}
            >
              สร้างผู้ใช้ทดสอบด้วยตนเอง (Manual)
            </Button>
          </Box>

          {tabValue === 0 ? (
            // AD Search Tab
            <Box>
              <TextField
                fullWidth
                label="พิมพ์ชื่อ หรือ Email เพื่อค้นหาใน AD"
                variant="outlined"
                value={adQuery}
                onChange={onADQueryChange}
                InputProps={{
                  endAdornment: searchingAD ? <CircularProgress size={20} /> : <SearchIcon />
                }}
              />

              {!selectedADUser ? (
                <List sx={{ mt: 2, maxHeight: 250, overflow: 'auto' }}>
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
                    <InputLabel id="ad-role-label">กำหนดบทบาทให้ผู้ใช้</InputLabel>
                    <Select 
                      labelId="ad-role-label"
                      id="ad-role-select"
                      value={assignedRole} 
                      label="กำหนดบทบาทให้ผู้ใช้" 
                      onChange={(e) => setAssignedRole(e.target.value)}
                    >
                      <MenuItem value="USER">ผู้ใช้ (User)</MenuItem>
                      <MenuItem value="IT_ADMIN">IT Admin</MenuItem>
                      <MenuItem value="SUPERADMIN">SuperAdmin</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button sx={{ mt: 1 }} onClick={() => setSelectedADUser(null)}>เปลี่ยนคน</Button>
                </Box>
              )}
            </Box>
          ) : (
            // Manual Tab
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                label="Username (สำหรับเข้าสู่ระบบ) *"
                placeholder="เช่น test.user"
                variant="outlined"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
              />
              <TextField
                fullWidth
                label="รหัสผ่าน *"
                type="password"
                placeholder="อย่างน้อย 4 ตัวอักษร"
                variant="outlined"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
              />
              <TextField
                fullWidth
                label="ชื่อ - นามสกุล (Display Name) *"
                placeholder="เช่น User Test"
                variant="outlined"
                value={manualDisplayName}
                onChange={(e) => setManualDisplayName(e.target.value)}
              />
              <TextField
                fullWidth
                label="อีเมล (Email)"
                placeholder="เช่น test.user@company.com"
                variant="outlined"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
              <TextField
                fullWidth
                label="แผนก (Department)"
                placeholder="เช่น IT"
                variant="outlined"
                value={manualDepartment}
                onChange={(e) => setManualDepartment(e.target.value)}
              />
              <FormControl fullWidth variant="outlined">
                <InputLabel id="manual-role-label">กำหนดบทบาทให้ผู้ใช้ *</InputLabel>
                <Select
                  labelId="manual-role-label"
                  id="manual-role-select"
                  value={manualRole}
                  label="กำหนดบทบาทให้ผู้ใช้ *"
                  onChange={(e) => setManualRole(e.target.value)}
                >
                  <MenuItem value="USER">ผู้ใช้ (User)</MenuItem>
                  <MenuItem value="IT_ADMIN">IT Admin</MenuItem>
                  <MenuItem value="SUPERADMIN">SuperAdmin</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>ยกเลิก</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateUser} 
            disabled={saving || (tabValue === 0 ? !selectedADUser : (!manualUsername.trim() || !manualDisplayName.trim() || !manualPassword.trim()))}
            startIcon={saving && <CircularProgress size={16} color="inherit" />}
          >
            เพิ่มเข้าระบบ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Set/Reset Password */}
      <Dialog open={passwordDialog.open} onClose={() => { setPasswordDialog({ open: false, user: null }); setNewPassword(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          {passwordDialog.user?.authType === 'LOCAL' ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน (Local Login)'}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ผู้ใช้: {passwordDialog.user?.displayName} ({passwordDialog.user?.adUsername})
          </Typography>
        </DialogTitle>
        <DialogContent>
          {passwordDialog.user?.authType !== 'LOCAL' && (
            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              ผู้ใช้นี้เดิมเป็น AD user — การตั้งรหัสผ่านจะเปิดให้ login แบบ Local ได้ด้วย
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="รหัสผ่านใหม่"
            placeholder="อย่างน้อย 4 ตัวอักษร"
            variant="outlined"
            sx={{ mt: 2 }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPasswordDialog({ open: false, user: null }); setNewPassword(''); }}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSetPassword} disabled={saving}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
