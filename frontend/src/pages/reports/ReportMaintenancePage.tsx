import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, TextField, MenuItem, Select, FormControl, InputLabel, alpha, Dialog, DialogTitle, DialogContent, IconButton, Divider, Button, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { maintenanceAPI } from '../../services/api';
import ReportHeaderTabs from './ReportHeaderTabs';
import { Wrench, CheckCircle2, Clock, AlertTriangle, Eye, DollarSign, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

import 'dayjs/locale/th';

dayjs.locale('th');

const statusColors: Record<string, string> = { PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success', CANCELLED: 'error' };
const statusLabels: Record<string, string> = { PENDING: 'รอดำเนินการ', IN_PROGRESS: 'กำลังซ่อม', COMPLETED: 'ซ่อมเสร็จสิ้น', CANCELLED: 'ยกเลิก' };

export default function ReportMaintenancePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const element = document.getElementById('report-content');
      if (!element) return;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Maintenance Executive Summary', 14, 20);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Exported Date: ${new Date().toLocaleString('th-TH')}`, 14, 28);
      pdf.addImage(imgData, 'PNG', 10, 35, pdfWidth - 20, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 40));
      pdf.save(`Maintenance_Executive_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setExportingPDF(false);
    }
  };

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
      if (status !== 'ALL' && status !== 'IN_PROGRESS_ALL') params.status = status;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await maintenanceAPI.reportAll(params);
      let data = res.data || [];
      if (status === 'IN_PROGRESS_ALL') {
        data = data.filter((r: any) => r.status === 'IN_PROGRESS' || r.status === 'PENDING');
      }
      setRecords(data);
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
      renderCell: ({ value }) => value ? formatDate(value) : '-'
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
          icon={<Eye size={18} color={theme.palette.text.secondary} />}
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
          <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', mb: 1 }}>รายงานประวัติการซ่อมบำรุง</Typography>
          <Typography variant="body1" color="text.secondary">สรุปประวัติการซ่อมบำรุงทรัพย์สินทั้งหมดในระบบ</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={exportingPDF ? <CircularProgress size={16} color="inherit" /> : <FileText size={16} />} 
            onClick={handleExportPDF}
            disabled={exportingPDF}
            sx={{
              bgcolor: 'warning.dark',
              '&:hover': { bgcolor: 'warning.dark', filter: 'brightness(0.9)' },
              boxShadow: `0 4px 10px ${alpha(theme.palette.warning.dark, 0.15)}`,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {exportingPDF ? 'Generating...' : 'Export PDF'}
          </Button>
        </Box>
      </Box>

      <Box id="report-content" sx={{ bgcolor: 'background.paper', borderRadius: 4, p: 3, mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: `1px solid ${theme.palette.divider}` }}>
        {/* Summary cards */}
        <Grid container spacing={2.5}>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatus('ALL')}
              sx={{
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                bgcolor: status === 'ALL' ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (status === 'ALL' || status === 'COMPLETED' || status === 'IN_PROGRESS_ALL') ? 1 : 0.45,
                transform: status === 'ALL' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: status === 'ALL' ? `0 8px 20px ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' }}>
                    <Wrench size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>รายการซ่อมทั้งหมด</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="primary.main">{totalRecords}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatus(status === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              sx={{
                borderLeft: `4px solid ${theme.palette.success.main}`,
                bgcolor: status === 'COMPLETED' ? alpha(theme.palette.success.main, 0.06) : alpha(theme.palette.success.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (status === 'ALL' || status === 'COMPLETED') ? 1 : 0.45,
                transform: status === 'COMPLETED' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: status === 'COMPLETED' ? `0 8px 20px ${alpha(theme.palette.success.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.success.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.dark', display: 'flex' }}>
                    <CheckCircle2 size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>ซ่อมเสร็จสิ้น</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="success.dark">{completed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatus(status === 'IN_PROGRESS_ALL' ? 'ALL' : 'IN_PROGRESS_ALL')}
              sx={{
                borderLeft: `4px solid ${theme.palette.warning.main}`,
                bgcolor: status === 'IN_PROGRESS_ALL' ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.warning.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (status === 'ALL' || status === 'IN_PROGRESS_ALL') ? 1 : 0.45,
                transform: status === 'IN_PROGRESS_ALL' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: status === 'IN_PROGRESS_ALL' ? `0 8px 20px ${alpha(theme.palette.warning.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.warning.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.dark', display: 'flex' }}>
                    <Clock size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>กำลังดำเนินการ</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="warning.dark">{inProgress}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderLeft: `4px solid ${theme.palette.error.main}`, bgcolor: alpha(theme.palette.error.main, 0.01) }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', display: 'flex' }}>
                    <DollarSign size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>ค่าใช้จ่ายรวม (บาท)</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="error.main">{totalCost.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Filters & Table */}
      <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${theme.palette.divider}`, overflow: 'visible' }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
              <MenuItem value="IN_PROGRESS_ALL">🟠 กำลังดำเนินการ (รอ/กำลังซ่อม)</MenuItem>
              <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${theme.palette.divider}` }} />
              <MenuItem value="PENDING">รอดำเนินการ</MenuItem>
              <MenuItem value="IN_PROGRESS">กำลังซ่อม</MenuItem>
              <MenuItem value="COMPLETED">ซ่อมเสร็จสิ้น</MenuItem>
              <MenuItem value="CANCELLED">ยกเลิก</MenuItem>
            </Select>
          </FormControl>
          <DatePicker
            label="ตั้งแต่เริ่มซ่อม"
            value={startDate ? dayjs(startDate) : null}
            onChange={(newVal) => setStartDate(newVal ? newVal.format('YYYY-MM-DD') : '')}
            slotProps={{ textField: { size: 'small', InputLabelProps: { shrink: true }, sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px' } } } }}
          />
          <DatePicker
            label="ถึงวันที่"
            value={endDate ? dayjs(endDate) : null}
            onChange={(newVal) => setEndDate(newVal ? newVal.format('YYYY-MM-DD') : '')}
            slotProps={{ textField: { size: 'small', InputLabelProps: { shrink: true }, sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px' } } } }}
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
              '& .MuiDataGrid-cell': { borderColor: theme.palette.divider },
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', borderBottom: `1px solid ${theme.palette.divider}` },
              '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02), cursor: 'pointer' }
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
              <IconButton aria-label="ปิด" onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3, bgcolor: 'action.hover' }}>
              {/* Asset Info */}
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
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
                  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>รายละเอียดการแจ้งซ่อม</Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">อาการเสีย / ปัญหา</Typography>
                        <Typography variant="body2" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }}>
                          {selectedRecord.reportedProblem || '-'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">การแก้ไข / เปลี่ยนอะไหล่</Typography>
                        <Typography variant="body2" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5, minHeight: 60 }}>
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
                  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 'none', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>สถานะ และ ค่าใช้จ่าย</Typography>
                      
                      <Box sx={{ mb: 2, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>สถานะปัจจุบัน</Typography>
                        <Chip label={statusLabels[selectedRecord.status] || selectedRecord.status} color={(statusColors[selectedRecord.status] as any) || 'default'} size="small" />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">วันที่แจ้งซ่อม</Typography>
                        <Typography variant="body2" fontWeight={500}>{selectedRecord.startedAt ? formatDateTime(selectedRecord.startedAt) : '-'}</Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">วันที่ซ่อมเสร็จ</Typography>
                        <Typography variant="body2" fontWeight={500}>{selectedRecord.completedAt ? formatDateTime(selectedRecord.completedAt) : '-'}</Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), p: 1.5, borderRadius: 2, border: `1px dashed ${alpha(theme.palette.error.main, 0.3)}` }}>
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
