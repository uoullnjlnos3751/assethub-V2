import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  Typography,
  AlertTitle,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { departmentAPI } from '../../services/api';

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export default function DepartmentManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, [searchTerm]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentAPI.list({ search: searchTerm });
      setDepartments(res.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลแผนก');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (dept?: Department) => {
    if (dept) {
      setEditingId(dept.id);
      setFormData({ name: dept.name, code: dept.code, description: dept.description || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '', description: '' });
    }
    setError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({ name: '', code: '', description: '' });
  };

  const handleSave = async () => {
    try {
      setError('');
      if (!formData.name.trim()) {
        setError('ชื่อแผนก ต้องไม่ว่างเปล่า');
        return;
      }

      if (editingId) {
        await departmentAPI.update(editingId, formData);
        setSuccessMsg('อัปเดตแผนกเรียบร้อย');
      } else {
        await departmentAPI.create(formData);
        setSuccessMsg('เพิ่มแผนกใหม่เรียบร้อย');
      }

      handleCloseDialog();
      fetchDepartments();

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบแผนกนี้?')) return;

    try {
      setError('');
      await departmentAPI.delete(id);
      setSuccessMsg('ลบแผนกเรียบร้อย');
      fetchDepartments();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ไม่สามารถลบแผนก');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 2 }}>
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: '14px',
        boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      }}>
        <CardContent>
          {successMsg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMsg}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              label="ค้นหาแผนก"
              placeholder="ชื่อหรือรหัสแผนก"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              เพิ่มแผนกใหม่
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : departments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              ไม่มีแผนก
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
                    <TableCell><strong>ชื่อแผนก</strong></TableCell>
                    <TableCell><strong>รหัส</strong></TableCell>
                    <TableCell><strong>รายละเอียด</strong></TableCell>
                    <TableCell align="right"><strong>การดำเนินการ</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id} sx={{ '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.03)' } }}>
                      <TableCell sx={{ fontWeight: 500 }}>{dept.name}</TableCell>
                      <TableCell>
                        <Chip label={dept.code} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{dept.description || '—'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(dept)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(dept.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? '✏️ แก้ไขแผนก' : '➕ เพิ่มแผนกใหม่'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="ชื่อแผนก"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            placeholder="เช่น IT, HR, Finance"
          />
          <TextField
            label="รหัสแผนก"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            fullWidth
            placeholder="เช่น IT, HR, FIN"
          />
          <TextField
            label="รายละเอียด"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            placeholder="รายละเอียดเพิ่มเติม"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ยกเลิก</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
