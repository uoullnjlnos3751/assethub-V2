import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Divider, Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: 'text.secondary',
        mb: 2,
        pb: 1,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {children}
    </Typography>
  );
}

function InfoItem({ label, value, fullWidth }: { label: string; value: string | number | null | undefined; fullWidth?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <Grid item xs={12} sm={6} md={fullWidth ? 12 : 4}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400, display: 'block', mb: 0.25, fontSize: '0.75rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
        {value}
      </Typography>
    </Grid>
  );
}

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

  function renderDetailSection(type: string, detail: any) {
    const t = type?.toLowerCase() || '';

    if (['phone', 'tablet'].includes(t)) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์สื่อสาร</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="IMEI" value={detail.imei} />
              <InfoItem label="Carrier" value={detail.carrier} />
              <InfoItem label="เบอร์โทรศัพท์" value={detail.phoneNumber} />
              <InfoItem label="ความจุ" value={detail.storageCapacity} />
              <InfoItem label="สี" value={detail.color} />
              <InfoItem label="OS" value={detail.osType} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    if (['monitor'].includes(t)) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลจอภาพ</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ขนาดจอ" value={detail.screenSize} />
              <InfoItem label="ความละเอียด" value={detail.resolution} />
              <InfoItem label="ช่องสัญญาณ" value={detail.connectionType} />
              <InfoItem label="อัตรารีเฟรช" value={detail.refreshRate} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    if (['projector', 'device', 'accessory'].includes(t)) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภท" value={detail.subType} />
              <InfoItem label="กำลังไฟ" value={detail.powerRating} />
              <InfoItem label="Lamp Hours" value={detail.lampHours} />
              <InfoItem label="ช่องสัญญาณ" value={detail.connectionType} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    if (['network', 'switch', 'router'].includes(t)) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์เครือข่าย</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="จำนวน Port" value={detail.portCount} />
              <InfoItem label="ความเร็ว Port" value={detail.portSpeed} />
              <InfoItem label="IP Address" value={detail.ipAddress} />
              <InfoItem label="MAC Address" value={detail.macAddress} />
              <InfoItem label="Firmware" value={detail.firmwareVersion} />
              <InfoItem label="Managed" value={detail.isManaged === true ? 'Managed' : detail.isManaged === false ? 'Unmanaged' : null} />
              <InfoItem label="PoE" value={detail.hasPoE === true ? 'มี PoE' : detail.hasPoE === false ? 'ไม่มี PoE' : null} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    if (['rack', 'enclosure', 'pdu'].includes(t)) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูล Rack / Enclosure / PDU</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภท" value={detail.subType} />
              <InfoItem label="Rack Units" value={detail.rackUnits} />
              <InfoItem label="Power Capacity" value={detail.powerCapacity} />
              <InfoItem label="ตำแหน่ง" value={detail.rackLocation} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    if (['printer'].includes(t)) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลเครื่องพิมพ์</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภท" value={detail.printerType} />
              <InfoItem label="สี" value={detail.isColor === true ? 'Color' : detail.isColor === false ? 'Mono' : null} />
              <InfoItem label="ขนาดกระดาษ" value={detail.paperSizes} />
              <InfoItem label="รุ่น Cartridge" value={detail.cartridgeModel} />
              <InfoItem label="Network" value={detail.isNetworkEnabled === true ? 'เชื่อมต่อได้' : detail.isNetworkEnabled === false ? 'ไม่ได้เชื่อมต่อ' : null} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </Box>
  );
  if (!asset) return <Typography>ไม่พบทรัพย์สิน</Typography>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/assets')}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          กลับ
        </Button>
        <Typography variant="h5" fontWeight={500} sx={{ letterSpacing: -0.3 }}>
          รายละเอียดทรัพย์สิน
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<EditIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate(`/assets/${id}/edit`)}
          sx={{
            borderRadius: 1,
            fontWeight: 500,
            textTransform: 'none',
            px: 2,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          }}
        >
          แก้ไข
        </Button>
      </Box>

      {/* Asset Code & Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" fontWeight={600} sx={{ letterSpacing: -0.5 }}>
          {asset.assetCode}
        </Typography>
        <Chip
          label={statusLabels[asset.status] || asset.status}
          color={(statusColors[asset.status] as any) || 'default'}
          size="small"
          sx={{ fontWeight: 500 }}
        />
        {asset.brand && asset.model && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {asset.brand} {asset.model}
          </Typography>
        )}
      </Box>

      {/* รูปภาพทะเบียนทรัพย์สิน */}
      {asset.image && (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>รูปภาพทะเบียนทรัพย์สิน</SectionTitle>
            <Box
              sx={{
                width: '100%',
                maxWidth: 600,
                mx: 'auto',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <img
                src={asset.image}
                alt="Asset registration"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Stack spacing={3}>
        {/* ข้อมูลทั่วไป */}
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="Serial Number" value={asset.serialNo} />
              <InfoItem label="ประเภทอุปกรณ์" value={asset.type} />
              <InfoItem label="ยี่ห้อ (Brand)" value={asset.brand} />
              <InfoItem label="รุ่น (Model)" value={asset.model} />
              <InfoItem label="Company" value={asset.company} />
              <InfoItem label="Computer Name เดิม" value={asset.oldAssetCode} />
              <InfoItem label="Domain Name" value={asset.domainName} />
            </Grid>
          </CardContent>
        </Card>

        {/* ผู้ถือครองและสถานที่ */}
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ผู้ถือครองและสถานที่</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ผู้ถือครอง" value={asset.ownerName} />
              <InfoItem label="แผนก" value={asset.departmentId} />
              <InfoItem label="Location" value={asset.location} />
              <InfoItem label="Floor" value={asset.floor} />
            </Grid>
          </CardContent>
        </Card>

        {/* OS/Software และ Hardware */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle>OS และ Software</SectionTitle>
                <Grid container spacing={2.5}>
                  <InfoItem label="OS" value={asset.osType} />
                  <InfoItem label="Windows" value={asset.osVersion} />
                  <InfoItem label="MS Office" value={asset.officeLicense} />
                  <InfoItem label="Antivirus" value={asset.antivirusStatus} />
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle>Hardware</SectionTitle>
                <Grid container spacing={2.5}>
                  <InfoItem label="CPU" value={asset.cpu} />
                  <InfoItem label="Generation" value={asset.cpuGeneration} />
                  <InfoItem label="GPU" value={asset.gpu} />
                  <InfoItem label="RAM" value={asset.ram} />
                  <InfoItem label="RAM Slot1" value={asset.ramSlot1} />
                  <InfoItem label="RAM Slot2" value={asset.ramSlot2} />
                  <InfoItem label="Storage 1" value={asset.storage1} />
                  <InfoItem label="Storage 2" value={asset.storage2} />
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Type-specific detail */}
        {asset.detail && renderDetailSection(asset.type, asset.detail)}

        {/* ข้อมูลจัดซื้อ */}
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลจัดซื้อ</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="PR No." value={asset.prNumber} />
              <InfoItem label="งบประมาณ" value={asset.budget} />
              <InfoItem label="PO Date" value={asset.poDate ? new Date(asset.poDate).toLocaleDateString('th-TH') : null} />
              <InfoItem label="PO No." value={asset.poNumber} />
              <InfoItem label="Vendor" value={asset.vendor} />
              <InfoItem label="วันที่ซื้อ" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('th-TH') : null} />
              <InfoItem label="อายุ (ปี)" value={asset.age} />
              <InfoItem label="หมายเหตุ" value={asset.remark} fullWidth />
            </Grid>
          </CardContent>
        </Card>

        {/* ประวัติการเปลี่ยนแปลง */}
        {asset.assetHistory?.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ประวัติการเปลี่ยนแปลง</SectionTitle>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: 'none' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>วันที่</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>การกระทำ</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>จาก</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>ไป</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>หมายเหตุ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asset.assetHistory.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{new Date(h.createdAt).toLocaleString('th-TH')}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{historyActionLabels[h.actionType] || h.actionType}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{h.fromStatus || h.fromOwner || h.fromLoc || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{h.toStatus || h.toOwner || h.toLoc || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{h.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* ประวัติการทำ PM */}
        {asset.pmRuns?.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ประวัติการทำ PM</SectionTitle>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: 'none' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>ปี</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>สถานะ</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>ผู้ดำเนินการ</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>วันที่ดำเนินการ</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>แล้วเสร็จ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asset.pmRuns.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ fontWeight: 500, fontSize: '0.875rem', py: 1.5 }}>{r.year}</TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip
                            label={pmStatusLabels[r.status] || r.status}
                            size="small"
                            color={r.status === 'COMPLETED' ? 'success' : r.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                            sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{r.performer?.displayName || r.performer?.adUsername || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{r.performedAt ? new Date(r.performedAt).toLocaleString('th-TH') : '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', py: 1.5 }}>{r.completedAt ? new Date(r.completedAt).toLocaleString('th-TH') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
