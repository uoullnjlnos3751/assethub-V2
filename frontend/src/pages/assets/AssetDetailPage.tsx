import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { assetAPI } from '../../services/api';

const statusColors: Record<string, string> = {
  Available: 'success', Borrowed: 'warning', InUse: 'info',
  Maintenance: 'error', Retired: 'default', Lost: 'error',
};

const statusLabels: Record<string, string> = {
  Available: 'พร้อมใช้งาน', Borrowed: 'กำลังยืม', InUse: 'ใช้งานประจำ',
  Maintenance: 'ซ่อมบำรุง', Retired: 'ปลดระวาง', Lost: 'สูญหาย',
};

const historyActionLabels: Record<string, string> = {
  CREATE: 'สร้าง', STATUS_CHANGE: 'เปลี่ยนสถานะ', OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง',
  LOCATION_CHANGE: 'เปลี่ยนสถานที่', CHECKOUT: 'ส่งมอบ', RETURN: 'คืน',
};

const pmStatusLabels: Record<string, string> = {
  DRAFT: 'ร่าง', IN_PROGRESS: 'กำลังดำเนินการ', COMPLETED: 'เสร็จสิ้น',
};

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      assetAPI.get(parseInt(id)).then((res) => setAsset(res.data)).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (!asset) return <Typography>ไม่พบทรัพย์สิน</Typography>;

  const infoRow = (label: string, value: string | number | null | undefined) => value !== null && value !== undefined && value !== '' ? (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value}</Typography>
    </Grid>
  ) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/assets')}>กลับ</Button>
        <Typography variant="h4" fontWeight={600} sx={{ flexGrow: 1 }}>รายละเอียดทรัพย์สิน</Typography>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/assets/${id}/edit`)}>แก้ไข</Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight="bold">{asset.assetCode}</Typography>
            <Chip label={statusLabels[asset.status] || asset.status} color={(statusColors[asset.status] as any) || 'default'} />
          </Box>

          <Typography variant="h6" gutterBottom color="primary">ข้อมูลทั่วไป</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {infoRow('Serial Number', asset.serialNo)}
            {infoRow('ประเภทอุปกรณ์', asset.type)}
            {infoRow('ยี่ห้อ (Brand)', asset.brand)}
            {infoRow('รุ่น (Model)', asset.model)}
            {infoRow('Company', asset.company)}
            {infoRow('ผู้ถือครอง', asset.ownerName)}
            {infoRow('แผนก', asset.departmentId)}
            {infoRow('Location', asset.location)}
            {infoRow('Floor', asset.floor)}
            {infoRow('สถานะ', statusLabels[asset.status] || asset.status)}
            {infoRow('Domain Name', asset.domainName)}
          </Grid>

          <Typography variant="h6" gutterBottom color="primary">OS และ Software</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {infoRow('OS', asset.osType)}
            {infoRow('Windows', asset.osVersion)}
            {infoRow('MS Office', asset.officeLicense)}
            {infoRow('Antivirus', asset.antivirusStatus)}
          </Grid>

          <Typography variant="h6" gutterBottom color="primary">Processor & Graphics</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {infoRow('CPU', asset.cpu)}
            {infoRow('Generation', asset.cpuGeneration)}
            {infoRow('GPU', asset.gpu)}
          </Grid>

          <Typography variant="h6" gutterBottom color="primary">Memory & Storage</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {infoRow('Storage 1', asset.storage1)}
            {infoRow('Storage 2', asset.storage2)}
            {infoRow('RAM', asset.ram)}
            {infoRow('RAM Slot1', asset.ramSlot1)}
            {infoRow('RAM Slot2', asset.ramSlot2)}
          </Grid>

          <Typography variant="h6" gutterBottom color="primary">ข้อมูลจัดซื้อและสถานที่</Typography>
          <Grid container spacing={2}>
            {infoRow('PR No.', asset.prNumber)}
            {infoRow('PO Date', asset.poDate ? new Date(asset.poDate).toLocaleDateString('th-TH') : null)}
            {infoRow('PO No.', asset.poNumber)}
            {infoRow('Vendor', asset.vendor)}
            {infoRow('วันที่ซื้อ', asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('th-TH') : null)}
            {infoRow('อายุ (ปี)', asset.age)}
            {infoRow('หมายเหตุ', asset.remark)}
          </Grid>
        </CardContent>
      </Card>

      {asset.assetHistory?.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>ประวัติการเปลี่ยนแปลง</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>วันที่</TableCell>
                    <TableCell>การกระทำ</TableCell>
                    <TableCell>จาก</TableCell>
                    <TableCell>ไป</TableCell>
                    <TableCell>หมายเหตุ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {asset.assetHistory.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>{new Date(h.createdAt).toLocaleString('th-TH')}</TableCell>
                      <TableCell>{historyActionLabels[h.actionType] || h.actionType}</TableCell>
                      <TableCell>{h.fromStatus || h.fromOwner || h.fromLoc || '-'}</TableCell>
                      <TableCell>{h.toStatus || h.toOwner || h.toLoc || '-'}</TableCell>
                      <TableCell>{h.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {asset.pmRuns?.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>ประวัติการทำ PM</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ปี</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>ผู้ดำเนินการ</TableCell>
                    <TableCell>วันที่ดำเนินการ</TableCell>
                    <TableCell>แล้วเสร็จ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {asset.pmRuns.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.year}</TableCell>
                      <TableCell>
                        <Chip label={pmStatusLabels[r.status] || r.status} size="small"
                          color={r.status === 'COMPLETED' ? 'success' : r.status === 'IN_PROGRESS' ? 'warning' : 'default'} />
                      </TableCell>
                      <TableCell>{r.performer?.displayName || r.performer?.adUsername || '-'}</TableCell>
                      <TableCell>{r.performedAt ? new Date(r.performedAt).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell>{r.completedAt ? new Date(r.completedAt).toLocaleString('th-TH') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
