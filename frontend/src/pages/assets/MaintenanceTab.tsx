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
import { formatDateTime } from '../../utils/dateUtils';
import { resolveMediaUrl } from '../../utils/mediaUrl';


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
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');

  // Form states (Create)
  const [reportedProblem, setReportedProblem] = useState('');
  const [repairType, setRepairType] = useState('INTERNAL');
  const [vendorName, setVendorName] = useState('');
  const [beforeImage, setBeforeImage] = useState<File | null>(null);

  // Form states (Complete)
  const [resolutionNote, setResolutionNote] = useState('');
  const [parts, setParts] = useState<{ partName: string, quantity: number, price: number }[]>([]);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  // Image manager states
  const [manageImagesRecord, setManageImagesRecord] = useState<any>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageType, setNewImageType] = useState<'BEFORE'|'AFTER'|'RECEIPT'>('BEFORE');
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
    setIsEditing(false);
    setIsCompleting(false);
    setReportedProblem('');
    setRepairType('INTERNAL');
    setVendorName('');
    setBeforeImage(null);
    setOpenForm(true);
  };

  const handleOpenComplete = (record: any) => {
    setIsEditing(false);
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



  const handleOpenEdit = (record: any) => {
    setIsEditing(true);
    setIsCompleting(false);
    setSelectedRecord(record);
    setReportedProblem(record.reportedProblem || '');
    setRepairType(record.repairType || 'INTERNAL');
    setVendorName(record.vendorName || '');
    setResolutionNote(record.resolutionNote || '');
    setParts(record.replacedParts || []);
    setEditStatus(record.status || 'IN_PROGRESS');
    setBeforeImage(null);
    setAfterImage(null);
    setReceiptFile(null);
    setOpenForm(true);
  };

  const handleEditSubmit = async () => {
    try {
      const totalCost = parts.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0);
      await maintenanceAPI.update(selectedRecord.id, {
        reportedProblem,
        repairType,
        vendorName: repairType === 'EXTERNAL' ? vendorName : null,
        resolutionNote,
        totalCost,
        status: editStatus,
        parts,
      });
      setOpenForm(false);
      fetchRecords();
      onUpdate();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการแก้ไขงานซ่อม');
    }
  };

  const handleOpenManageImages = (record: any) => {
    setManageImagesRecord(record);
    setNewImageFile(null);
    setNewImageType('BEFORE');
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('ยืนยันการลบรูปภาพนี้?')) return;
    try {
      await maintenanceAPI.deleteImage(imageId);
      fetchRecords();
      setManageImagesRecord((prev: any) => ({
        ...prev,
        images: prev.images.filter((img: any) => img.id !== imageId)
      }));
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบรูปภาพ');
    }
  };

  const handleUploadNewImage = async () => {
    if (!newImageFile || !manageImagesRecord) return;
    try {
      await maintenanceAPI.uploadImage(manageImagesRecord.id, newImageFile, newImageType);
      setNewImageFile(null);
      
      const updated = await maintenanceAPI.getByAsset(assetId);
      const updatedRecord = updated.data.find((r:any) => r.id === manageImagesRecord.id);
      setManageImagesRecord(updatedRecord);
      
      setRecords(updated.data);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
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
                        เปิดงานเมื่อ: {formatDateTime(rec.startedAt)} | โดย: {rec.technician?.displayName || 'IT Admin'}
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
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>รูปภาพประกอบ:</Typography>
                        <Button size="small" variant="text" onClick={() => handleOpenManageImages(rec)}>จัดการรูปภาพ</Button>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {rec.images?.filter((img: any) => img.imageType === 'BEFORE').map((img: any) => (
                          <Box key={img.id} sx={{ textAlign: 'center' }}>
                            <img 
                              src={resolveMediaUrl(img.imageUrl)}
                              alt="Before" 
                              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px', backgroundColor: '#f1f5f9' }} 
                              onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image'; }}
                            />
                            <Typography variant="caption" display="block">ก่อนซ่อม</Typography>
                          </Box>
                        ))}
                        {rec.images?.filter((img: any) => img.imageType === 'AFTER').map((img: any) => (
                          <Box key={img.id} sx={{ textAlign: 'center' }}>
                            <img 
                              src={resolveMediaUrl(img.imageUrl)}
                              alt="After" 
                              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px', backgroundColor: '#f1f5f9' }} 
                              onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image'; }}
                            />
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
                                <Button key={img.id} variant="outlined" size="small" startIcon={<InsertDriveFileIcon />} href={resolveMediaUrl(img.imageUrl) || '#'} target="_blank">
                                  เปิดดูเอกสาร PDF
                                </Button>
                              ) : (
                                <Box key={img.id} sx={{ textAlign: 'center' }}>
                                  <a href={resolveMediaUrl(img.imageUrl)} target="_blank" rel="noreferrer">
                                    <img 
                                      src={resolveMediaUrl(img.imageUrl)}
                                      alt="Receipt" 
                                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }} 
                                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image'; }}
                                    />
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
                          <TableHead sx={{ bgcolor: 'action.hover' }}>
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


                    <Box sx={{ mt: 3, textAlign: 'right', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button variant="outlined" onClick={() => handleOpenEdit(rec)}>
                        แก้ไขข้อมูล
                      </Button>
                      {rec.status === 'IN_PROGRESS' && (
                        <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleOpenComplete(rec)}>
                          ปิดงาน / บันทึกซ่อมเสร็จสิ้น
                        </Button>
                      )}
                    </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for Create/Complete */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'แก้ไขข้อมูลงานซ่อม' : (isCompleting ? 'ปิดงานซ่อม (Complete Repair)' : 'แจ้งซ่อม / บันทึกส่งซ่อม')}</DialogTitle>
                <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {(!isCompleting || isEditing) && (
              <>
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
                {!isEditing && (
                  <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />}>
                    {beforeImage ? beforeImage.name : 'แนบรูป "ก่อนซ่อม" (ถ้ามี)'}
                    <input type="file" hidden accept="image/*" onChange={e => setBeforeImage(e.target.files?.[0] || null)} />
                  </Button>
                )}
              </>
            )}

            {(isCompleting || isEditing) && (
              <>
                {isEditing && <Divider sx={{ my: 1 }} />}
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
                    <IconButton aria-label="ลบ" color="error" onClick={() => setParts(parts.filter((_, i) => i !== idx))}><DeleteIcon /></IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => setParts([...parts, { partName: '', quantity: 1, price: 0 }])}>เพิ่มรายการอะไหล่</Button>

                {isEditing && (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>สถานะ</InputLabel>
                    <Select value={editStatus} label="สถานะ" onChange={e => setEditStatus(e.target.value as any)}>
                      <MenuItem value="IN_PROGRESS">กำลังดำเนินการซ่อม</MenuItem>
                      <MenuItem value="COMPLETED">ซ่อมเสร็จแล้ว</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {isCompleting && !isEditing && (
                  <>
                    <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} sx={{ mt: 2 }}>
                      {afterImage ? afterImage.name : 'แนบรูป "หลังซ่อม" (ถ้ามี)'}
                      <input type="file" hidden accept="image/*" onChange={e => setAfterImage(e.target.files?.[0] || null)} />
                    </Button>
                    <Button variant="outlined" component="label" startIcon={<InsertDriveFileIcon />} sx={{ mt: 1 }}>
                      {receiptFile ? receiptFile.name : 'แนบเอกสาร PO / ใบเสร็จ (ถ้ามี)'}
                      <input type="file" hidden accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                    </Button>
                  </>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={isEditing ? handleEditSubmit : (isCompleting ? handleCompleteSubmit : handleCreateSubmit)}>
            บันทึกข้อมูล
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Manage Images */}
      <Dialog open={!!manageImagesRecord} onClose={() => setManageImagesRecord(null)} maxWidth="sm" fullWidth>
        <DialogTitle>จัดการรูปภาพและเอกสาร</DialogTitle>
        <DialogContent dividers>
          {manageImagesRecord && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Existing Images */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>รูปภาพปัจจุบัน</Typography>
                {manageImagesRecord.images?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">ไม่มีรูปภาพ</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {manageImagesRecord.images.map((img: any) => (
                      <Grid item xs={6} sm={4} key={img.id} sx={{ textAlign: 'center', position: 'relative' }}>
                        <img 
                          src={resolveMediaUrl(img.imageUrl)} 
                          alt={img.imageType} 
                          style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: '8px', backgroundColor: '#f1f5f9' }} 
                          onError={(e: any) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image'; }}
                        />
                        <Typography variant="caption" display="block">
                          {img.imageType === 'BEFORE' ? 'ก่อนซ่อม' : img.imageType === 'AFTER' ? 'หลังซ่อม' : 'ใบเสร็จ'}
                        </Typography>
                        <IconButton aria-label="ลบ" 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteImage(img.id)}
                          sx={{ position: 'absolute', top: 12, right: 4, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>

              <Divider />

              {/* Upload New Image */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>อัปโหลดรูปภาพเพิ่มเติม</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>ประเภท</InputLabel>
                    <Select value={newImageType} label="ประเภท" onChange={(e: any) => setNewImageType(e.target.value as any)}>
                      <MenuItem value="BEFORE">ก่อนซ่อม</MenuItem>
                      <MenuItem value="AFTER">หลังซ่อม</MenuItem>
                      <MenuItem value="RECEIPT">ใบเสร็จ/PO</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ flexGrow: 1 }}>
                    <Button variant="outlined" component="label" fullWidth startIcon={<PhotoCameraIcon />} sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                      {newImageFile ? newImageFile.name : 'เลือกไฟล์รูปภาพ...'}
                      <input type="file" hidden accept="image/*,.pdf" onChange={e => setNewImageFile(e.target.files?.[0] || null)} />
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Button variant="contained" onClick={handleUploadNewImage} disabled={!newImageFile}>อัปโหลด</Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageImagesRecord(null)}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
