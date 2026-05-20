import React, { useEffect, useMemo, useState } from 'react';
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

  const categoryName = asset?.category?.name || '';
  const typeLower = asset?.type?.toLowerCase() || '';

  const isComputer = useMemo(() => {
    if (categoryName) {
      return categoryName === 'คอมพิวเตอร์';
    }
    const t = typeLower.trim();
    if (t === 'pc') return true;
    return ['notebook', 'pc desktop', 'macbook', 'mini pc', 'all-in-one', 'thin client', 'computer'].some(k => t.includes(k));
  }, [categoryName, typeLower]);

  const isMonitor = useMemo(() => {
    if (categoryName) {
      return categoryName === 'จอภาพ';
    }
    return typeLower.includes('monitor');
  }, [categoryName, typeLower]);

  useEffect(() => {
    if (id) {
      assetAPI.get(parseInt(id)).then((res) => setAsset(res.data)).finally(() => setLoading(false));
    }
  }, [id]);

  function renderDetailSection(type: string, detail: any) {
    const t = type?.toLowerCase() || '';
    const cat = categoryName?.toLowerCase() || '';

    // อุปกรณ์สื่อสาร (Phone / Tablet / IPAD)
    if (
      cat === 'อุปกรณ์สื่อสาร' ||
      ['smartphone', 'tablet', 'mobile hotspot', 'ipad'].some(k => t.includes(k))
    ) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์สื่อสาร</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="IMEI 1" value={detail.imei1} />
              <InfoItem label="IMEI 2" value={detail.imei2} />
              <InfoItem label="เบอร์โทรศัพท์" value={detail.phoneNumber} />
              <InfoItem label="OS" value={detail.osType} />
              <InfoItem label="OS Version" value={detail.osVersion} />
              <InfoItem label="ความจุ (Storage)" value={detail.storageCapacity} />
              <InfoItem label="RAM" value={detail.ram} />
              <InfoItem label="สี" value={detail.color} />
              <InfoItem label="ผู้ให้บริการ (SIM/Carrier)" value={detail.simProvider} />
              <InfoItem label="MDM Enrolled" value={detail.mdmEnrolled === true ? 'ลงทะเบียนแล้ว' : detail.mdmEnrolled === false ? 'ยังไม่ได้ลงทะเบียน' : null} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // จอภาพ (Monitor)
    if (
      cat === 'จอภาพ' ||
      t.includes('monitor')
    ) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลจอภาพ</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ขนาดจอ (นิ้ว)" value={detail.screenSize} />
              <InfoItem label="ความละเอียด" value={detail.resolution} />
              <InfoItem label="ประเภทแผง (Panel Type)" value={detail.panelType} />
              <InfoItem label="อัตรารีเฟรช" value={detail.refreshRate} />
              <InfoItem label="พอร์ตเชื่อมต่อ" value={detail.ports} />
              <InfoItem label="มีลำโพง" value={detail.hasSpeaker === true ? 'มี' : detail.hasSpeaker === false ? 'ไม่มี' : null} />
              <InfoItem label="Curved" value={detail.curved === true ? 'จอโค้ง' : detail.curved === false ? 'จอแบน' : null} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // อุปกรณ์นำเสนอ/AV
    if (
      cat === 'อุปกรณ์นำเสนอ/av' ||
      ['projector', 'conference speaker', 'webcam', 'docking station', 'presentation clicker', 'speaker', 'docking'].some(k => t.includes(k))
    ) {
      if (t.includes('projector')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Projector</SectionTitle>
              <Grid container spacing={2.5}>
                <InfoItem label="ความสว่าง (Lumens)" value={detail.lumens} />
                <InfoItem label="ความละเอียด" value={detail.resolution} />
                <InfoItem label="Throw Ratio" value={detail.throwRatio} />
                <InfoItem label="ชั่วโมงหลอดที่ใช้แล้ว" value={detail.lampHours} />
                <InfoItem label="ช่องสัญญาณเข้า (Input)" value={detail.connectionType} />
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (t.includes('webcam')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Webcam</SectionTitle>
              <Grid container spacing={2.5}>
                <InfoItem label="ความละเอียด" value={detail.resolution} />
                <InfoItem label="FPS" value={detail.fps} />
                <InfoItem label="การเชื่อมต่อ" value={detail.connectionType} />
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (t.includes('docking')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Docking Station</SectionTitle>
              <Grid container spacing={2.5}>
                <InfoItem label="มาตรฐานเชื่อมต่อ" value={detail.usbStandard} />
                <InfoItem label="จำนวนพอร์ต" value={detail.portCount} />
                <InfoItem label="Power Delivery (W)" value={detail.powerDelivery} />
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (t.includes('conference speaker') || t.includes('speaker')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Conference Speaker</SectionTitle>
              <Grid container spacing={2.5}>
                <InfoItem label="การเชื่อมต่อ" value={detail.connectionType} />
                <InfoItem label="กำลังไฟ (W)" value={detail.powerRating} />
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (t.includes('clicker') || t.includes('presentation clicker')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Presentation Clicker</SectionTitle>
              <Grid container spacing={2.5}>
                <InfoItem label="ช่วงระยะ (Range)" value={detail.range} />
                <InfoItem label="ประเภท Receiver" value={detail.receiverType} />
                <InfoItem label="แบตเตอรี่" value={detail.batteryType} />
              </Grid>
            </CardContent>
          </Card>
        );
      }
      // Generic AV
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์ AV</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="การเชื่อมต่อ" value={detail.connectionType} />
              <InfoItem label="กำลังไฟ (W)" value={detail.powerRating} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // Network / อุปกรณ์เครือข่าย
    if (
      cat === 'อุปกรณ์เครือข่าย' ||
      ['switch', 'router', 'access point', 'firewall', 'modem', 'network'].some(k => t.includes(k))
    ) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์เครือข่าย</SectionTitle>
            <Grid container spacing={2.5}>
              {t.includes('access point') && (
                <>
                  <InfoItem label="WiFi Standard" value={detail.wifiStandard} />
                  <InfoItem label="ย่านความถี่ (Band)" value={detail.band} />
                </>
              )}
              <InfoItem label="จำนวน Port" value={detail.portCount} />
              <InfoItem label="ความเร็ว Port" value={detail.portSpeed} />
              <InfoItem label="IP Address" value={detail.ipAddress} />
              <InfoItem label="MAC Address" value={detail.macAddress} />
              <InfoItem label="Firmware" value={detail.firmwareVersion} />
              <InfoItem label="ตำแหน่งในตู้ Rack" value={detail.locationRack} />
              {t.includes('switch') && (
                <>
                  <InfoItem label="PoE Support" value={detail.hasPoE === true ? 'รองรับ' : detail.hasPoE === false ? 'ไม่รองรับ' : null} />
                  <InfoItem label="VLAN Support" value={detail.vlanSupport === true ? 'รองรับ' : detail.vlanSupport === false ? 'ไม่รองรับ' : null} />
                </>
              )}
              <InfoItem label="จัดการได้ (Managed)" value={detail.isManaged === true ? 'Managed' : detail.isManaged === false ? 'Unmanaged' : null} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // Rack & Infrastructure / UPS
    if (
      cat === 'rack & infrastructure' ||
      ['server rack', 'pdu', 'ups', 'enclosure', 'rack'].some(k => t.includes(k))
    ) {
      const isUPS = t.includes('ups');
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูล {isUPS ? 'UPS' : 'Rack / Infrastructure'}</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภท" value={detail.subType} />
              {isUPS ? (
                <>
                  <InfoItem label="ความจุ (VA)" value={detail.vaCapacity} />
                  <InfoItem label="Watt ที่รองรับ" value={detail.wattCapacity} />
                  <InfoItem label="Runtime (นาที)" value={detail.batteryRuntime} />
                  <InfoItem label="ประเภทแบตเตอรี่" value={detail.batteryType} />
                  <InfoItem label="จำนวน Outlet" value={detail.outletCount} />
                  <InfoItem label="ตำแหน่งติดตั้ง" value={detail.rackLocation} />
                </>
              ) : (
                <>
                  <InfoItem label="Rack Units" value={detail.rackUnits} />
                  <InfoItem label="Power Capacity" value={detail.powerCapacity} />
                  <InfoItem label="ตำแหน่งติดตั้ง" value={detail.rackLocation} />
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // เครื่องพิมพ์ (Printer)
    if (
      cat === 'เครื่องพิมพ์' ||
      t.includes('printer')
    ) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลเครื่องพิมพ์</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภทเครื่องพิมพ์" value={detail.printerType} />
              <InfoItem label="พิมพ์สี/ขาวดำ" value={detail.isColor === true ? 'สี (Color)' : detail.isColor === false ? 'ขาวดำ (Mono)' : null} />
              <InfoItem label="ขนาดกระดาษ" value={detail.paperSizes} />
              <InfoItem label="พิมพ์สองหน้า (Duplex)" value={detail.duplexSupport === true ? 'รองรับ' : detail.duplexSupport === false ? 'ไม่รองรับ' : null} />
              <InfoItem label="เชื่อมต่อเครือข่าย" value={detail.isNetworkEnabled === true ? 'มี Network' : detail.isNetworkEnabled === false ? 'ไม่มี' : (detail.networkReady === true ? 'มี Network' : detail.networkReady === false ? 'ไม่มี' : null)} />
              <InfoItem label="รุ่นหมึก/Cartridge" value={detail.cartridgeModel} />
              <InfoItem label="IP Address" value={detail.ipAddress} />
              <InfoItem label="MAC Address" value={detail.macAddress} />
              <InfoItem label="จำนวนหน้าที่พิมพ์แล้ว" value={detail.pageCount} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // สายสัญญาณ (Cable)
    if (
      cat === 'สายสัญญาณ' ||
      ['hdmi', 'displayport', 'usb-c', 'lan cable', 'power cable', 'audio cable'].some(k => t.includes(k))
    ) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลสายสัญญาณ</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภทสาย" value={detail.cableType} />
              <InfoItem label="ความยาว" value={detail.length} />
              <InfoItem label="จำนวนคงเหลือ" value={detail.stockQuantity} />
              <InfoItem label="จุดสั่งซื้อ (Min Stock)" value={detail.minimumStock} />
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // Consumable / วัสดุสิ้นเปลือง
    if (
      cat === 'วัสดุสิ้นเปลือง' ||
      ['toner', 'ink', 'cartridge', 'battery', 'adapter', 'charger', 'consumable', 'paper', 'drum', 'ribbon'].some(k => t.includes(k))
    ) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลวัสดุสิ้นเปลือง</SectionTitle>
            <Grid container spacing={2.5}>
              <InfoItem label="ประเภทวัสดุสิ้นเปลือง" value={detail.consumableType} />
              <InfoItem label="ใช้งานร่วมกับ" value={detail.compatibleWith} />
              <InfoItem label="จำนวนคงเหลือ" value={detail.stockQuantity} />
              <InfoItem label="จุดสั่งซื้อ (Min Stock)" value={detail.minimumStock} />
              <InfoItem label="วันหมดอายุ" value={detail.expiryDate ? new Date(detail.expiryDate).toLocaleDateString('th-TH') : null} />
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
          {asset.assetCode}{asset.assetName ? ` - ${asset.assetName}` : ''}
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
              <InfoItem label="ชื่อทรัพย์สิน" value={asset.assetName} />
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
        {isComputer && !isMonitor && (
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
        )}

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
              <InfoItem label="วันหมดประกัน" value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString('th-TH') : null} />
              <InfoItem label="ราคาจัดซื้อ" value={asset.purchasePrice !== null && asset.purchasePrice !== undefined ? `${asset.purchasePrice.toLocaleString('th-TH')} บาท` : null} />
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
