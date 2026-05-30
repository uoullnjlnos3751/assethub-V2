import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, IconButton, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { maintenanceAPI } from '../../services/api';
import dayjs from 'dayjs';

interface MaintenanceTabProps {
  assetId: number;
  onUpdate: () => void;
}

export default function MaintenanceTab({ assetId, onUpdate }: MaintenanceTabProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Form states (Create)
  const [reportedProblem, setReportedProblem] = useState('');
  const [repairType, setRepairType] = useState('INTERNAL');
  const [vendorName, setVendorName] = useState('');
  const [beforeImage, setBeforeImage] = useState<File | null>(null);

  // Form states (Complete)
  const [resolutionNote, setResolutionNote] = useState('');
  const [parts, setParts] = useState<{ partName: string, quantity: number, price: number }[]>([]);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [assetId]);

  const fetchRecords = async () => {
    try {
      const res = await maintenanceAPI.getByAsset(assetId);
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsCompleting(false);
    setReportedProblem('');
    setRepairType('INTERNAL');
    setVendorName('');
    setBeforeImage(null);
    setOpenForm(true);
  };

  const handleOpenComplete = (record: any) => {
    setIsCompleting(true);
    setSelectedRecord(record);
    setResolutionNote(record.resolutionNote || '');
    setParts(record.replacedParts || []);
    setAfterImage(null);
    setReceiptFile(null);
    setOpenForm(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const res = await maintenanceAPI.create({
        assetId,
        reportedProblem,
        repairType,
        vendorName: repairType === 'EXTERNAL' ? vendorName : null,
      });
      if (beforeImage) {
        await maintenanceAPI.uploadImage(res.data.id, beforeImage, 'BEFORE');
      }
      setOpenForm(false);
      fetchRecords();
      onUpdate();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleCompleteSubmit = async () => {
    try {
      const totalCost = parts.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0);
      await maintenanceAPI.update(selectedRecord.id, {
        resolutionNote,
        totalCost,
        status: 'COMPLETED',
        parts,
      });
      if (afterImage) {
        await maintenanceAPI.uploadImage(selectedRecord.id, afterImage, 'AFTER');
      }
      if (receiptFile) {
        await maintenanceAPI.uploadImage(selectedRecord.id, receiptFile, 'RECEIPT');
      }
      setOpenForm(false);
      fetchRecords();
      onUpdate();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปิดงานซ่อม');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>ประวัติการซ่อมบำรุง (Repairs)</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ borderRadius: '8px' }}>
          แจ้งซ่อม / บันทึกส่งซ่อม
        </Button>
      </Box>

      {records.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          ยังไม่มีประวัติการซ่อมบำรุงสำหรับเครื่องนี้
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {records.map((rec) => (
            <Grid item xs={12} key={rec.id}>
              <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {rec.ticketNo} - {rec.reportedProblem}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        เปิดงานเมื่อ: {dayjs(rec.startedAt).format('DD/MM/YYYY HH:mm')} | โดย: {rec.technician?.displayName || 'IT Admin'}
                      </Typography>
                    </Box>
                    <Chip 
                      label={rec.status === 'COMPLETED' ? 'ซ่อมเสร็จแล้ว' : 'กำลังดำเนินการซ่อม'} 
                      color={rec.status === 'COMPLETED' ? 'success' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>ประเภทการซ่อม:</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {rec.repairType === 'INTERNAL' ? 'IT ซ่อมเอง' : `ส่งศูนย์/ร้านนอก (${rec.vendorName || '-'})`}
                      </Typography>

                      <Typography variant="body2" fontWeight={600} gutterBottom>การแก้ไขปัญหา:</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{rec.resolutionNote || '-'}</Typography>

                      <Typography variant="body2" fontWeight={600} gutterBottom>ค่าใช้จ่ายรวม:</Typography>
                      <Typography variant="body2" color="error.main" fontWeight={700}>
                        ฿ {rec.totalCost?.toLocaleString() || 0}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>รูปภาพประกอบ:</Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {rec.images?.filter((img: any) => img.imageType === 'BEFORE').map((img: any) => (
                          <Box key={img.id} sx={{ textAlign: 'center' }}>
                            <img src={img.imageUrl} alt="Before" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px' }} />
                            <Typography variant="caption" display="block">ก่อนซ่อม</Typography>
                          </Box>
                        ))}
                        {rec.images?.filter((img: any) => img.imageType === 'AFTER').map((img: any) => (
                          <Box key={img.id} sx={{ textAlign: 'center' }}>
                            <img src={img.imageUrl} alt="After" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px' }} />
                            <Typography variant="caption" display="block">หลังซ่อม</Typography>
                          </Box>
                        ))}
                      </Box>

                      {rec.images?.filter((img: any) => img.imageType === 'RECEIPT').length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight={600} gutterBottom>เอกสารสั่งซื้อ / ใบเสร็จ:</Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {rec.images.filter((img: any) => img.imageType === 'RECEIPT').map((img: any) => {
                              const isPdf = img.imageUrl.toLowerCase().endsWith('.pdf');
                              return isPdf ? (
                                <Button key={img.id} variant="outlined" size="small" startIcon={<InsertDriveFileIcon />} href={img.imageUrl} target="_blank">
                                  เปิดดูเอกสาร PDF
                                </Button>
                              ) : (
                                <Box key={img.id} sx={{ textAlign: 'center' }}>
                                  <a href={img.imageUrl} target="_blank" rel="noreferrer">
                                    <img src={img.imageUrl} alt="Receipt" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0' }} />
                                  </a>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Grid>
                  </Grid>

                  {rec.replacedParts?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>รายการอะไหล่ที่เปลี่ยน:</Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                              <TableCell>ชื่ออะไหล่</TableCell>
                              <TableCell align="right">จำนวน</TableCell>
                              <TableCell align="right">ราคา/หน่วย</TableCell>
                              <TableCell align="right">รวม</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rec.replacedParts.map((p: any) => (
                              <TableRow key={p.id}>
                                <TableCell>{p.partName}</TableCell>
                                <TableCell align="right">{p.quantity}</TableCell>
                                <TableCell align="right">฿ {p.price.toLocaleString()}</TableCell>
                                <TableCell align="right">฿ {(p.quantity * p.price).toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {rec.status === 'IN_PROGRESS' && (
                    <Box sx={{ mt: 3, textAlign: 'right' }}>
                      <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleOpenComplete(rec)}>
                        ปิดงาน / บันทึกซ่อมเสร็จสิ้น
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for Create/Complete */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isCompleting ? 'ปิดงานซ่อม (Complete Repair)' : 'แจ้งซ่อม / บันทึกส่งซ่อม'}</DialogTitle>
        <DialogContent dividers>
          {!isCompleting ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="อาการเสียที่พบ" fullWidth multiline rows={3} value={reportedProblem} onChange={e => setReportedProblem(e.target.value)} />
              <FormControl fullWidth>
                <InputLabel>ประเภทการซ่อม</InputLabel>
                <Select value={repairType} label="ประเภทการซ่อม" onChange={e => setRepairType(e.target.value)}>
                  <MenuItem value="INTERNAL">ซ่อมเอง (Internal IT)</MenuItem>
                  <MenuItem value="EXTERNAL">ส่งศูนย์ / ร้านนอก (External Vendor)</MenuItem>
                </Select>
              </FormControl>
              {repairType === 'EXTERNAL' && (
                <TextField label="ชื่อร้าน/ศูนย์บริการ" fullWidth value={vendorName} onChange={e => setVendorName(e.target.value)} />
              )}
              <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />}>
                {beforeImage ? beforeImage.name : 'แนบรูป "ก่อนซ่อม" (ถ้ามี)'}
                <input type="file" hidden accept="image/*" onChange={e => setBeforeImage(e.target.files?.[0] || null)} />
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="วิธีการแก้ไข (Resolution)" fullWidth multiline rows={2} value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
              
              <Divider sx={{ my: 1 }}><Typography variant="caption">รายการอะไหล่</Typography></Divider>
              {parts.map((p, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField size="small" label="ชื่ออะไหล่" value={p.partName} onChange={e => {
                    const newParts = [...parts]; newParts[idx].partName = e.target.value; setParts(newParts);
                  }} sx={{ flexGrow: 1 }} />
                  <TextField size="small" label="จำนวน" type="number" value={p.quantity} onChange={e => {
                    const newParts = [...parts]; newParts[idx].quantity = Number(e.target.value); setParts(newParts);
                  }} sx={{ width: 80 }} />
                  <TextField size="small" label="ราคา" type="number" value={p.price} onChange={e => {
                    const newParts = [...parts]; newParts[idx].price = Number(e.target.value); setParts(newParts);
                  }} sx={{ width: 100 }} />
                  <IconButton color="error" onClick={() => setParts(parts.filter((_, i) => i !== idx))}><DeleteIcon /></IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={() => setParts([...parts, { partName: '', quantity: 1, price: 0 }])}>เพิ่มรายการอะไหล่</Button>

              <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} sx={{ mt: 2 }}>
                {afterImage ? afterImage.name : 'แนบรูป "หลังซ่อม" (ถ้ามี)'}
                <input type="file" hidden accept="image/*" onChange={e => setAfterImage(e.target.files?.[0] || null)} />
              </Button>
              <Button variant="outlined" component="label" startIcon={<InsertDriveFileIcon />} sx={{ mt: 1 }}>
                {receiptFile ? receiptFile.name : 'แนบเอกสาร PO / ใบเสร็จ (ถ้ามี)'}
                <input type="file" hidden accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={isCompleting ? handleCompleteSubmit : handleCreateSubmit}>
            บันทึกข้อมูล
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
