import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Card, CardContent, Grid, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { pmAPI } from '../../services/api';

export default function PMPlanListPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [genDialog, setGenDialog] = useState<{ open: boolean; planId: number }>({ open: false, planId: 0 });
  const [genResult, setGenResult] = useState('');
  const [form, setForm] = useState({ year: new Date().getFullYear(), site: '', deptTask: '', lead: '', plannedDeviceCount: 10, startDate: '', endDate: '', templateId: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([pmAPI.plans(), pmAPI.templates()])
      .then(([p, t]) => { setPlans(p.data); setTemplates(t.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await pmAPI.createPlan(form);
      setDialog(false);
      setForm({ year: new Date().getFullYear(), site: '', deptTask: '', lead: '', plannedDeviceCount: 10, startDate: '', endDate: '', templateId: '' });
      fetchData();
    } catch (err) { alert('เกิดข้อผิดพลาด'); } finally { setSaving(false); }
  };

  const handleGenerate = async () => {
    try {
      const res = await pmAPI.generate(genDialog.planId);
      setGenResult(res.data.message);
      fetchData();
    } catch (err: any) {
      setGenResult(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={600}>แผน PM</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(true)}>สร้างแผน</Button>
      </Box>

      {genResult && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setGenResult('')}>{genResult}</Alert>}

      <Grid container spacing={2}>
        {plans.map((plan) => (
          <Grid item xs={12} md={6} key={plan.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{plan.site || plan.deptTask || 'ทั่วไป'} ({plan.year})</Typography>
                <Typography variant="body2" color="text.secondary">
                  เป้าหมาย: {plan.plannedDeviceCount} เครื่อง | สร้างงาน: {plan.runs?.length || 0} รายการ
                  | เสร็จ: {plan.runs?.filter((r: any) => r.status === 'COMPLETED').length || 0}
                </Typography>
                <Typography variant="body2">วันที่: {plan.startDate ? new Date(plan.startDate).toLocaleDateString('th-TH') : '-'} ถึง {plan.endDate ? new Date(plan.endDate).toLocaleDateString('th-TH') : '-'}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => { setGenDialog({ open: true, planId: plan.id }); setGenResult(''); }}>
                    สร้างงาน (Generate Workload)
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>สร้างแผน PM</DialogTitle>
        <DialogContent>
          <TextField label="ปี" type="number" fullWidth value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} sx={{ mt: 1 }} />
          <TextField label="Site" fullWidth value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} sx={{ mt: 2 }} />
          <TextField label="แผนก/งาน" fullWidth value={form.deptTask} onChange={(e) => setForm({ ...form, deptTask: e.target.value })} sx={{ mt: 2 }} />
          <TextField label="ผู้รับผิดชอบ" fullWidth value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} sx={{ mt: 2 }} />
          <TextField label="จำนวนเครื่องตามแผน" type="number" fullWidth value={form.plannedDeviceCount} onChange={(e) => setForm({ ...form, plannedDeviceCount: parseInt(e.target.value) })} sx={{ mt: 2 }} />
          <TextField label="วันที่เริ่ม" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} sx={{ mt: 2 }} />
          <TextField label="วันที่สิ้นสุด" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} sx={{ mt: 2 }} />
          <TextField label="Template" select fullWidth value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} sx={{ mt: 2 }}>
            {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'สร้าง'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={genDialog.open} onClose={() => setGenDialog({ open: false, planId: 0 })} maxWidth="sm" fullWidth>
        <DialogTitle>สร้างงาน PM</DialogTitle>
        <DialogContent>
          <Typography>สร้างรายการ PM จากทรัพย์สินที่ยังไม่ทำ PM ปีนี้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenDialog({ open: false, planId: 0 })}>ปิด</Button>
          <Button variant="contained" onClick={handleGenerate}>ยืนยันสร้างงาน</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
