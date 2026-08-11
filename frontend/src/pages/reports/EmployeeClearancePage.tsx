import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, Card, CardContent, 
  Grid, Avatar, Chip, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, CircularProgress, IconButton,
  Divider, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import DevicesIcon from '@mui/icons-material/Devices';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { assetAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function EmployeeClearancePage() {
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await assetAPI.list({ exactOwnerName: searchName.trim(), limit: 500 });
      let foundAssets = res.data.data || [];
      
      // Fallback filter just to be absolutely sure
      foundAssets = foundAssets.filter((a: any) => 
        a.ownerName?.toLowerCase().trim() === searchName.toLowerCase().trim()
      );
      
      setAssets(foundAssets);
    } catch (err) {
      console.error('Failed to search employee assets', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeAssets = assets.filter(a => !['Retired', 'Disposed', 'Lost'].includes(a.status));

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
        <Typography variant="h4" fontWeight="bold">
          📝 ตรวจสอบทรัพย์สินพนักงาน (Employee Clearance)
        </Typography>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 4 }} className="no-print">
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="ชื่อ-นามสกุล พนักงาน (ภาษาอังกฤษหรือไทย)"
            variant="outlined"
            size="small"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1, maxWidth: 400 }}
            placeholder="เช่น Wasan Nuntakul"
          />
          <Button 
            variant="contained" 
            startIcon={<SearchIcon />} 
            onClick={handleSearch}
            disabled={!searchName.trim() || loading}
          >
            ค้นหา
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : hasSearched && (
        <Box>
          {assets.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }} className="no-print">
              <Typography variant="h6" color="text.secondary">
                ไม่พบทรัพย์สินที่ถือครองโดย "{searchName}"
              </Typography>
            </Card>
          ) : (
            <Box id="print-area">
              {/* Profile Summary */}
              <Card sx={{ mb: 4, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                        <PersonIcon fontSize="large" />
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Typography variant="h5" fontWeight="bold" color="primary.900">
                        {searchName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>แผนก:</strong> {assets[0]?.departmentId || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>สถานที่:</strong> {assets[0]?.location || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>บริษัท:</strong> {assets[0]?.company || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item className="no-print">
                      <Button 
                        variant="outlined" 
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                      >
                        พิมพ์เอกสารส่งคืน
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Clearance Form Header (Visible mostly on print) */}
              <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 3, textAlign: 'center' } }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>แบบฟอร์มส่งคืนทรัพย์สิน (Asset Clearance Form)</Typography>
                <Typography>ชื่อพนักงาน: {searchName} &nbsp;&nbsp;&nbsp; แผนก: {assets[0]?.departmentId || '-'}</Typography>
                <Divider sx={{ my: 2 }} />
              </Box>

              {/* Assets Table */}
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DevicesIcon color="primary" /> 
                รายการทรัพย์สินในความรับผิดชอบ ({activeAssets.length} รายการ)
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell><strong>ชื่อทรัพย์สิน</strong></TableCell>
                      <TableCell><strong>ประเภท</strong></TableCell>
                      <TableCell><strong>ยี่ห้อ / รุ่น</strong></TableCell>
                      <TableCell><strong>Serial No.</strong></TableCell>
                      <TableCell><strong>สถานะปัจจุบัน</strong></TableCell>
                      <TableCell align="center" className="no-print"><strong>จัดการ</strong></TableCell>
                      <TableCell sx={{ display: 'none', '@media print': { display: 'table-cell' } }}><strong>สภาพตอนส่งคืน</strong></TableCell>
                      <TableCell sx={{ display: 'none', '@media print': { display: 'table-cell' } }}><strong>ผู้รับคืน</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeAssets.map((asset) => (
                      <TableRow key={asset.id} hover>
                        <TableCell>{asset.assetName || asset.assetCode}</TableCell>
                        <TableCell>
                          <Chip label={asset.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{asset.brand} {asset.model}</TableCell>
                        <TableCell>{asset.serialNo || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={asset.status} 
                            size="small" 
                            color={asset.status === 'Available' ? 'success' : asset.status === 'InUse' ? 'info' : 'default'} 
                          />
                        </TableCell>
                        <TableCell align="center" className="no-print">
                          <Tooltip title="ดูรายละเอียด">
                            <IconButton size="small" color="primary" onClick={() => navigate(`/assets/${asset.id}`)}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        {/* Print only columns */}
                        <TableCell sx={{ display: 'none', '@media print': { display: 'table-cell' } }}>[ ] ปกติ [ ] ชำรุด</TableCell>
                        <TableCell sx={{ display: 'none', '@media print': { display: 'table-cell' } }}>.......................</TableCell>
                      </TableRow>
                    ))}
                    {activeAssets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                          ไม่มีทรัพย์สินที่กำลังใช้งาน (อาจถูกคืนหรือตัดจำหน่ายไปแล้ว)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Print Signatures */}
              <Box sx={{ display: 'none', '@media print': { display: 'flex', justifyContent: 'space-around', mt: 8 } }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography>ลงชื่อ...................................................</Typography>
                  <Typography sx={{ mt: 1 }}>( {searchName} )</Typography>
                  <Typography variant="body2" color="text.secondary">พนักงานผู้ส่งคืน</Typography>
                  <Typography sx={{ mt: 1 }}>วันที่......./......./.......</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography>ลงชื่อ...................................................</Typography>
                  <Typography sx={{ mt: 1 }}>( ................................................... )</Typography>
                  <Typography variant="body2" color="text.secondary">เจ้าหน้าที่ IT ผู้รับคืน</Typography>
                  <Typography sx={{ mt: 1 }}>วันที่......./......./.......</Typography>
                </Box>
              </Box>

            </Box>
          )}
        </Box>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Box>
  );
}
