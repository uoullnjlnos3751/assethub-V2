import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { pmAPI } from '../../services/api';

export default function PMDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pmAPI.dashboard().then((res) => setDashboard(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>PM Dashboard {new Date().getFullYear()}</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography variant="body2" color="text.secondary">ตามแผน</Typography><Typography variant="h4">{dashboard?.planned || 0}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography variant="body2" color="text.secondary">ทำแล้ว</Typography><Typography variant="h4" color="success.main">{dashboard?.completed || 0}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography variant="body2" color="text.secondary">คงเหลือ</Typography><Typography variant="h4" color="warning.main">{dashboard?.remaining || 0}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography variant="body2" color="text.secondary">เกินกำหนด</Typography><Typography variant="h4" color="error.main">{dashboard?.overdue || 0}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      {dashboard?.plans && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Site/แผนก</TableCell>
                <TableCell>เป้าหมาย</TableCell>
                <TableCell>สร้างงานแล้ว</TableCell>
                <TableCell>ทำแล้ว</TableCell>
                <TableCell>วันที่เริ่ม</TableCell>
                <TableCell>วันที่สิ้นสุด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboard.plans.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.site || plan.deptTask || '-'}</TableCell>
                  <TableCell>{plan.plannedDeviceCount}</TableCell>
                  <TableCell>{plan.totalCount || 0}</TableCell>
                  <TableCell>{plan.completedCount || 0}</TableCell>
                  <TableCell>{plan.startDate ? new Date(plan.startDate).toLocaleDateString('th-TH') : '-'}</TableCell>
                  <TableCell>{plan.endDate ? new Date(plan.endDate).toLocaleDateString('th-TH') : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
