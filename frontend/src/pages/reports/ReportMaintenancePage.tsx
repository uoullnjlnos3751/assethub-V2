import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, TextField, MenuItem, Select, FormControl, InputLabel, alpha, Dialog, DialogTitle, DialogContent, IconButton, Divider, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { maintenanceAPI } from '../../services/api';
import ReportHeaderTabs from './ReportHeaderTabs';
import { Wrench, CheckCircle2, Clock, AlertTriangle, Eye, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

const statusColors: Record<string, string> = { PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success', CANCELLED: 'error' };
const statusLabels: Record<string, string> = { PENDING: 'รอดำเนินการ', IN_PROGRESS: 'กำลังซ่อม', COMPLETED: 'ซ่อมเสร็จสิ้น', CANCELLED: 'ยกเลิก' };

export default function ReportMaintenancePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = (record: any) => {
    setSelectedRecord(record);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRecord(null);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (status !== 'ALL') params.status = status;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await maintenanceAPI.reportAll(params);
      setRecords(res.data);
    } catch (err) {
      console.error('Failed to load maintenance report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [status, startDate, endDate]); // Debounce search manually or rely on button, for now just load on filter change

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Summaries
  const totalRecords = records.length;
  const completed = records.filter(r => r.status === 'COMPLETED').length;
  const inProgress = records.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PENDING').length;
  const totalCost = records.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);

  const columns: GridColDef[] = [
    { field: 'ticketNo', headerName: 'เลขที่แจ้งซ่อม', width: 140 },
    { 
      field: 'assetName', 
      headerName: 'ชื่อทรัพย์สิน', 
      width: 200,
      valueGetter: (value: any, row: any) => row?.asset?.assetName || '-'
    },
    { field: 'reportedProblem', headerName: 'อาการเสีย/ปัญหา', width: 250 },
    { 
      field: 'startedAt', 
      headerName: 'วันที่แจ้งซ่อม', 
      width: 140,
      renderCell: ({ value }) => value ? dayjs(value).format('DD MMM YYYY') : '-'
    },
    { 
      field: 'totalCost', 
      headerName: 'ค่าใช้จ่าย', 
      width: 120,
      renderCell: ({ value }) => value ? `฿${Number(value).toLocaleString()}` : '-'
    },
    {
      field: 'status', headerName: 'สถานะ', width: 130,
      renderCell: ({ value }) => <Chip label={statusLabels[value] || value} color={(statusColors[value] as any) || 'default'} size="small" />,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'ดูข้อมูล',
      width: 100,
      getActions: (params: any) => [
        <GridActionsCellItem
          icon={<Eye size={18} color="#475569" />}
          label="ดูรายละเอียดการซ่อม"
          onClick={() => handleOpenDialog(params.row)}
          showInMenu={false}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <ReportHeaderTabs />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#1e293b', mb: 1 }}>รายงานประวัติการซ่อมบำรุง</Typography>
          <Typography variant="body1" color="text.secondary">สรุปประวัติการซ่อมบำรุงทรัพย์สินทั้งหมดในระบบ</Typography>
        </Box>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #4f46e5', bgcolor: 'rgba(79,70,229,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><Wrench size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>รายการซ่อมทั้งหมด</Typography></Box>
              <Typography variant="h4" fontWeight={800}>{totalRecords}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #10b981', bgcolor: 'rgba(16,185,129,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ซ่อมเสร็จสิ้น</Typography></Box>
              <Typography variant="h4" fontWeight={800}>{completed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #f59e0b', bgcolor: 'rgba(245,158,11,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><Clock size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>กำลังดำเนินการ</Typography></Box>
              <Typography variant="h4" fontWeight={800}>{inProgress}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #ef4444', bgcolor: 'rgba(239,68,68,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex' }}><DollarSign size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ค่าใช้จ่ายรวม (บาท)</Typography></Box>
              <Typography variant="h4" fontWeight={800}>{totalCost.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Table */}
      <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(229, 231, 235, 0.5)', overflow: 'visible' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(229, 231, 235, 0.5)', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="ค้นหารหัส/ชื่อทรัพย์สิน, อาการเสีย..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>สถานะ</InputLabel>
            <Select value={status} label="สถานะ" onChange={(e) => setStatus(e.target.value)} sx={{ borderRadius: '8px' }}>
              <MenuItem value="ALL">ทั้งหมด</MenuItem>
              <MenuItem value="PENDING">รอดำเนินการ</MenuItem>
              <MenuItem value="IN_PROGRESS">กำลังซ่อม</MenuItem>
              <MenuItem value="COMPLETED">ซ่อมเสร็จสิ้น</MenuItem>
              <MenuItem value="CANCELLED">ยกเลิก</MenuItem>
            </Select>
          </FormControl>
          <TextField
            type="date"
            size="small"
            label="ตั้งแต่เริ่มซ่อม"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <TextField
            type="date"
            size="small"
            label="ถึงวันที่"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <DataGrid
            rows={records}
            columns={columns}
            getRowId={(r) => r.id}
            autoHeight
            disableRowSelectionOnClick
            onRowClick={(params: any) => handleOpenDialog(params.row)}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ 
              border: 'none',
              '& .MuiDataGrid-cell': { borderColor: 'rgba(229, 231, 235, 0.5)' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', borderBottom: '1px solid rgba(229, 231, 235, 0.8)' },
              '& .MuiDataGrid-row:hover': { bgcolor: alpha('#4f46e5', 0.02), cursor: 'pointer' }
            }}
          />
        )}
      </Card>

      {/* Maintenance Record Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedRecord && (
          <>
            <DialogTitle sx={{ m: 0, p: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  รายละเอียดการซ่อมบำรุง
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ticket No: {selectedRecord.ticketNo}
                </Typography>
              </Box>
              <IconButton onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
              {/* Asset Info */}
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>ข้อมูลอุปกรณ์</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">รหัสทรัพย์สิน</Typography>
                      <Typography variant="body2" fontWeight={500}>{selectedRecord.asset?.assetCode || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">ชื่อทรัพย์สิน</Typography>
                      <Typography variant="body2" fontWeight={500}>{selectedRecord.asset?.assetName || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">ยี่ห้อ / รุ่น</Typography>
                      <Typography variant="body2" fontWeight={500}>{selectedRecord.asset?.brand || '-'} / {selectedRecord.asset?.model || '-'}</Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => navigate(`/assets/${selectedRecord.assetId}`)}
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      ดูข้อมูลทรัพย์สินเต็มรูปแบบ
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Maintenance Details */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>รายละเอียดการแจ้งซ่อม</Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">อาการเสีย / ปัญหา</Typography>
                        <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1, mt: 0.5 }}>
                          {selectedRecord.reportedProblem || '-'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">การแก้ไข / เปลี่ยนอะไหล่</Typography>
                        <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1, mt: 0.5, minHeight: 60 }}>
                          {selectedRecord.resolutionNote || 'ยังไม่มีการบันทึกการแก้ไข'}
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">ประเภทการซ่อม</Typography>
                          <Typography variant="body2">{selectedRecord.repairType === 'INTERNAL' ? 'ซ่อมเอง (Internal)' : 'ส่งซ่อมภายนอก (External)'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">{selectedRecord.repairType === 'INTERNAL' ? 'ช่างผู้รับผิดชอบ' : 'บริษัทผู้รับซ่อม'}</Typography>
                          <Typography variant="body2">{selectedRecord.repairType === 'INTERNAL' ? selectedRecord.technician?.displayName : selectedRecord.vendorName || '-'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>สถานะ และ ค่าใช้จ่าย</Typography>
                      
                      <Box sx={{ mb: 2, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>สถานะปัจจุบัน</Typography>
                        <Chip label={statusLabels[selectedRecord.status] || selectedRecord.status} color={(statusColors[selectedRecord.status] as any) || 'default'} size="small" />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">วันที่แจ้งซ่อม</Typography>
                        <Typography variant="body2" fontWeight={500}>{selectedRecord.startedAt ? dayjs(selectedRecord.startedAt).format('DD MMM YYYY HH:mm') : '-'}</Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">วันที่ซ่อมเสร็จ</Typography>
                        <Typography variant="body2" fontWeight={500}>{selectedRecord.completedAt ? dayjs(selectedRecord.completedAt).format('DD MMM YYYY HH:mm') : '-'}</Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ bgcolor: 'rgba(239,68,68,0.05)', p: 1.5, borderRadius: 2, border: '1px dashed rgba(239,68,68,0.3)' }}>
                        <Typography variant="caption" color="error">ค่าใช้จ่ายรวม (บาท)</Typography>
                        <Typography variant="h5" fontWeight={800} color="error" sx={{ mt: 0.5 }}>
                          ฿{Number(selectedRecord.totalCost || 0).toLocaleString()}
                        </Typography>
                      </Box>

                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
