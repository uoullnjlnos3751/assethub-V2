import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Checkbox, FormControlLabel, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { pmAPI } from '../../services/api';

const statusColors: Record<string, string> = { DRAFT: 'default', IN_PROGRESS: 'info', COMPLETED: 'success' };

export default function PMRunPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; run: any }>({ open: false, run: null });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchData = () => {
    setLoading(true);
    pmAPI.runs().then((res) => setRuns(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openPerform = (run: any) => {
    setDialog({ open: true, run });
    setAnswers({});
  };

  const handlePerform = async () => {
    setProcessing(true);
    try {
      const templateItems = dialog.run.plan?.template?.templateItems || [];
      const answerList = templateItems.map((item: any) => ({
        itemId: item.id,
        value: answers[item.key] !== undefined ? answers[item.key] : '',
      }));
      await pmAPI.performRun(dialog.run.id, { answers: answerList });
      setSuccess('บันทึกผล PM สำเร็จ');
      setDialog({ open: false, run: null });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: '#' },
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, valueGetter: (_, row) => row.asset?.assetCode },
    { field: 'serialNo', headerName: 'Serial', width: 140, valueGetter: (_, row) => row.asset?.serialNo },
    { field: 'brand', headerName: 'ยี่ห้อ', width: 100, valueGetter: (_, row) => row.asset?.brand },
    { field: 'model', headerName: 'รุ่น', width: 120, valueGetter: (_, row) => row.asset?.model },
    { field: 'planInfo', headerName: 'แผน', width: 120, valueGetter: (_, row) => row.plan?.site || row.plan?.deptTask || '' },
    {
      field: 'status', headerName: 'สถานะ', width: 120,
      renderCell: ({ value }) => <Chip label={value === 'DRAFT' ? 'รอดำเนินการ' : value === 'IN_PROGRESS' ? 'กำลังทำ' : 'เสร็จแล้ว'} color={(statusColors[value] as any) || 'default'} size="small" />,
    },
    { field: 'performerName', headerName: 'ผู้ทำ', width: 130, valueGetter: (_, row) => row.performer?.displayName || '-' },
    { field: 'completedAt', headerName: 'วันที่ทำเสร็จ', width: 180, valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-' },
    {
      field: 'actions', headerName: 'จัดการ', width: 100, sortable: false,
      renderCell: ({ row }) => (
        row.status !== 'COMPLETED' ? (
          <Button size="small" variant="contained" onClick={() => openPerform(row)}>ทำ PM</Button>
        ) : null
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>งาน PM</Typography>
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <DataGrid
        rows={runs}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        autoHeight
        pageSizeOptions={[10, 20, 50, 100]}
        disableRowSelectionOnClick
      />

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, run: null })} maxWidth="md" fullWidth>
        <DialogTitle>ทำ PM: {dialog.run?.asset?.assetCode} - {dialog.run?.asset?.brand} {dialog.run?.asset?.model}</DialogTitle>
        <DialogContent>
          {dialog.run?.plan?.template?.templateItems?.map((item: any) => (
            <Box key={item.id} sx={{ mb: 2 }}>
              {item.type === 'boolean' ? (
                <FormControlLabel
                  control={<Checkbox checked={answers[item.key] === 'true'} onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.checked ? 'true' : 'false' })} />}
                  label={`${item.label}${item.required ? ' *' : ''}`}
                />
              ) : item.type === 'rating' ? (
                <FormControl fullWidth size="small">
                  <InputLabel>{item.label}</InputLabel>
                  <Select value={answers[item.key] || ''} label={item.label} onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.value })}>
                    {[1, 2, 3, 4, 5].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField label={`${item.label}${item.required ? ' *' : ''}`} fullWidth size="small" value={answers[item.key] || ''} onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.value })} />
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, run: null })}>ยกเลิก</Button>
          <Button variant="contained" color="success" onClick={handlePerform} disabled={processing}>
            {processing ? <CircularProgress size={24} /> : 'บันทึกผล PM'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
