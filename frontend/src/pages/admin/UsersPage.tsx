import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress,
  List, ListItem, ListItemText, Divider, IconButton, ListItemButton, Alert,
  Avatar, Card, CardContent, Grid, Tooltip
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Search as SearchIcon, Add as AddIcon, PersonAdd as PersonAddIcon,
  Delete as DeleteIcon, People as PeopleIcon, Shield as ShieldIcon,
  Block as BlockIcon, AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
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

  // Summary counts
  const totalUsers = total;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'IT_ADMIN' || u.role === 'SUPERADMIN').length;
  const inactiveUsers = users.filter(u => !u.isActive).length;

  const columns: GridColDef[] = [
    {
      field: 'avatar', headerName: '', width: 50, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Avatar
          src={row.avatarUrl || undefined}
          sx={{ width: 32, height: 32, fontSize: '13px', bgcolor: row.isActive ? '#4f46e5' : '#9ca3af' }}
        >
          {!row.avatarUrl && (row.displayName?.charAt(0) || 'U')}
        </Avatar>
      ),
    },
    { field: 'adUsername', headerName: 'Username', width: 130 },
    { field: 'displayName', headerName: 'ชื่อ - นามสกุล', width: 170 },
    { field: 'email', headerName: 'อีเมล', width: 200 },
    { field: 'department', headerName: 'แผนก', width: 140 },
    { field: 'companyThai', headerName: 'บริษัท', width: 200 },
    {
      field: 'authType', headerName: 'ประเภท', width: 80,
      renderCell: ({ value }) => (
        <Chip
          label={value || 'AD'}
          color={value === 'LOCAL' ? 'info' : 'default'}
          size="small"
          variant={value === 'LOCAL' ? 'filled' : 'outlined'}
          sx={{ fontSize: '11px' }}
        />
      ),
    },
    {
      field: 'role', headerName: 'บทบาท', width: 120,
      renderCell: ({ value }) => (
        <Chip
          label={roleLabels[value] || value}
          color={(roleColors[value] as any) || 'default'}
          size="small"
          sx={{ fontWeight: 600, fontSize: '11px' }}
        />
      ),
    },
    {
      field: 'isActive', headerName: 'สถานะ', width: 90,
      renderCell: ({ value }) => (
        <Chip
          label={value ? 'ใช้งาน' : 'ปิด'}
          color={value ? 'success' : 'error'}
          size="small"
          variant="outlined"
          sx={{ fontSize: '11px' }}
        />
      ),
    },
    {
      field: 'lastLoginAt', headerName: 'ล็อกอินล่าสุด', width: 160,
      valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-'
    },
    {
      field: 'actions', headerName: 'จัดการ', width: 220, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="เปลี่ยนบทบาท">
            <Button
              size="small" variant="outlined"
              sx={{ minWidth: 0, px: 1, fontSize: '11px', borderColor: '#e2e8f0', color: '#475569' }}
              onClick={() => { setRoleDialog({ open: true, user: row }); setNewRole(row.role); }}
            >
              บทบาท
            </Button>
          </Tooltip>
          <Tooltip title={row.authType === 'LOCAL' ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน Local'}>
            <Button
              size="small" variant="outlined"
              sx={{ minWidth: 0, px: 1, fontSize: '11px', borderColor: '#e2e8f0', color: '#475569' }}
              onClick={() => { setPasswordDialog({ open: true, user: row }); setNewPassword(''); }}
            >
              {row.authType === 'LOCAL' ? 'รหัส' : 'ตั้งรหัส'}
            </Button>
          </Tooltip>
          <Tooltip title={row.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}>
            <Button
              size="small" variant="outlined"
              sx={{
                minWidth: 0, px: 1, fontSize: '11px',
                borderColor: row.isActive ? '#fecaca' : '#bbf7d0',
                color: row.isActive ? '#dc2626' : '#16a34a',
              }}
              onClick={() => handleToggleActive(row.id)}
            >
              {row.isActive ? 'ปิด' : 'เปิด'}
            </Button>
          </Tooltip>
          <Tooltip title="ลบผู้ใช้">
            <IconButton color="error" size="small" onClick={() => handleDeleteUser(row)} sx={{ ml: 0.5 }}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#1e293b', mb: 0.5 }}>
            จัดการผู้ใช้งาน
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ดูแลจัดการบัญชีผู้ใช้งานทั้งหมดในระบบ
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { handleCloseAddDialog(); setAddDialog(true); }}
          sx={{
            bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' },
            borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3,
          }}
        >
          เพิ่มผู้ใช้งานใหม่
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #4f46e5', bgcolor: 'rgba(79,70,229,0.02)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(79,70,229,0.06)', display: 'flex' }}>
                  <PeopleIcon sx={{ color: '#4f46e5', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ผู้ใช้ทั้งหมด
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>{totalUsers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #16a34a', bgcolor: 'rgba(22,163,74,0.02)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(22,163,74,0.06)', display: 'flex' }}>
                  <ShieldIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ใช้งานอยู่
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>{activeUsers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #f59e0b', bgcolor: 'rgba(245,158,11,0.02)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.06)', display: 'flex' }}>
                  <AdminIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    แอดมิน
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>{adminUsers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #ef4444', bgcolor: 'rgba(239,68,68,0.02)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.06)', display: 'flex' }}>
                  <BlockIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ปิดการใช้งาน
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>{inactiveUsers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          placeholder="ค้นหาในระบบ (ชื่อ, Username, อีเมล)"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{
            minWidth: 400,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px', bgcolor: '#fff',
            },
          }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} />
          }}
        />
        <Button
          variant="outlined"
          onClick={handleSearch}
          sx={{ borderRadius: '8px', textTransform: 'none', borderColor: '#e2e8f0', color: '#475569' }}
        >
          ค้นหา
        </Button>
      </Box>

      {/* Data Grid */}
      <Box sx={{
        bgcolor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
        overflow: 'hidden',
        '& .MuiDataGrid-root': { border: 'none' },
        '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '12px', color: '#475569' },
        '& .MuiDataGrid-cell': { fontSize: '13px', color: '#334155' },
        '& .MuiDataGrid-row:hover': { bgcolor: '#f8fafc' },
      }}>
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
          disableColumnFilter
          rowHeight={48}
        />
      </Box>

      {/* Dialog: Update Role */}
      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, user: null })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>เปลี่ยนบทบาท: {roleDialog.user?.displayName}</DialogTitle>
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoleDialog({ open: false, user: null })} sx={{ borderRadius: '8px' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleUpdateRole} disabled={saving}
            sx={{ borderRadius: '8px', bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >บันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add User (AD & Manual) */}
      <Dialog open={addDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>เพิ่มผู้ใช้งานใหม่</DialogTitle>
        <DialogContent sx={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
            <Button
              fullWidth
              variant={tabValue === 0 ? 'contained' : 'outlined'}
              onClick={() => setTabValue(0)}
              sx={{
                py: 1, borderRadius: '8px', textTransform: 'none',
                ...(tabValue === 0 ? { bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } } : { borderColor: '#e2e8f0', color: '#475569' }),
              }}
            >
              ค้นหาจาก AD
            </Button>
            <Button
              fullWidth
              variant={tabValue === 1 ? 'contained' : 'outlined'}
              onClick={() => setTabValue(1)}
              sx={{
                py: 1, borderRadius: '8px', textTransform: 'none',
                ...(tabValue === 1 ? { bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } } : { borderColor: '#e2e8f0', color: '#475569' }),
              }}
            >
              สร้างผู้ใช้ทดสอบ (Manual)
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
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
                              secondary={`${user.adUsername} | ${user.email} | ${user.department}${user.company ? ` | ${user.company}` : ''}`}
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
                <Box sx={{ mt: 3, p: 2.5, border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 700 }}>ผู้ใช้ที่เลือก:</Typography>
                  <Typography variant="h6" fontWeight={700}>{selectedADUser.displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedADUser.adUsername} ({selectedADUser.email})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedADUser.department} {selectedADUser.company ? `(${selectedADUser.company})` : ''}
                  </Typography>

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

                  <Button sx={{ mt: 1, borderRadius: '8px', textTransform: 'none' }} onClick={() => setSelectedADUser(null)}>เปลี่ยนคน</Button>
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
              <TextField
                fullWidth
                label="รหัสผ่าน *"
                type="password"
                placeholder="อย่างน้อย 4 ตัวอักษร"
                variant="outlined"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
              <TextField
                fullWidth
                label="ชื่อ - นามสกุล (Display Name) *"
                placeholder="เช่น User Test"
                variant="outlined"
                value={manualDisplayName}
                onChange={(e) => setManualDisplayName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
              <TextField
                fullWidth
                label="อีเมล (Email)"
                placeholder="เช่น test.user@company.com"
                variant="outlined"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
              <TextField
                fullWidth
                label="แผนก (Department)"
                placeholder="เช่น IT"
                variant="outlined"
                value={manualDepartment}
                onChange={(e) => setManualDepartment(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddDialog} sx={{ borderRadius: '8px', textTransform: 'none' }}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={saving || (tabValue === 0 ? !selectedADUser : (!manualUsername.trim() || !manualDisplayName.trim() || !manualPassword.trim()))}
            startIcon={saving && <CircularProgress size={16} color="inherit" />}
            sx={{ borderRadius: '8px', bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}
          >
            เพิ่มเข้าระบบ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Set/Reset Password */}
      <Dialog open={passwordDialog.open} onClose={() => { setPasswordDialog({ open: false, user: null }); setNewPassword(''); }} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {passwordDialog.user?.authType === 'LOCAL' ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน (Local Login)'}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ผู้ใช้: {passwordDialog.user?.displayName} ({passwordDialog.user?.adUsername})
          </Typography>
        </DialogTitle>
        <DialogContent>
          {passwordDialog.user?.authType !== 'LOCAL' && (
            <Alert severity="info" sx={{ mt: 2, mb: 1, borderRadius: '8px' }}>
              ผู้ใช้นี้เดิมเป็น AD user — การตั้งรหัสผ่านจะเปิดให้ login แบบ Local ได้ด้วย
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="รหัสผ่านใหม่"
            placeholder="อย่างน้อย 4 ตัวอักษร"
            variant="outlined"
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setPasswordDialog({ open: false, user: null }); setNewPassword(''); }}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >ยกเลิก</Button>
          <Button variant="contained" onClick={handleSetPassword} disabled={saving}
            sx={{ borderRadius: '8px', bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontWeight: 600 }}
          >บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
