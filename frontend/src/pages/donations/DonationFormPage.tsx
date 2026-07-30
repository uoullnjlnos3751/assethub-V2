import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, TextField, Grid, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, InputAdornment, alpha, Skeleton, Divider, Tooltip, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import { donationAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

export default function DonationFormPage() {
  const [assets, setAssets]                   = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets]     = useState(true);
  const [selectedIds, setSelectedIds]         = useState<Set<number>>(new Set());
  const [conditions, setConditions]           = useState<Record<number, string>>({});
  const [recipientName, setRecipientName]     = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientPhone, setRecipientPhone]   = useState('');
  const [approvalRef, setApprovalRef]         = useState('');
  const [donationDate, setDonationDate]       = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]                     = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [assetSearch, setAssetSearch]         = useState('');
  const [batchFiles, setBatchFiles]           = useState<File[]>([]);
  const [batchPreviews, setBatchPreviews]     = useState<string[]>([]);
  const [itemImages, setItemImages]           = useState<Record<number, File>>({});
  const [itemPreviews, setItemPreviews]       = useState<Record<number, string>>({});
  const navigate = useNavigate();
  const toast    = useToast();
  const batchInputRef = useRef<HTMLInputElement>(null);
  const itemInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    donationAPI.retiredAssets()
      .then(res => setAssets(res.data.data))
      .catch(() => toast.error('ไม่สามารถโหลดข้อมูลทรัพย์สินได้'))
      .finally(() => setLoadingAssets(false));
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      batchPreviews.forEach(url => URL.revokeObjectURL(url));
      Object.values(itemPreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // ── Batch image handlers ──
  const addBatchFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setBatchFiles(prev => [...prev, ...newFiles]);
    setBatchPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const removeBatchFile = useCallback((index: number) => {
    setBatchPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleBatchDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) addBatchFiles(e.dataTransfer.files);
  }, [addBatchFiles]);

  // ── Item image handlers ──
  const setItemImage = useCallback((assetId: number, file: File) => {
    const url = URL.createObjectURL(file);
    setItemPreviews(prev => {
      if (prev[assetId]) URL.revokeObjectURL(prev[assetId]);
      return { ...prev, [assetId]: url };
    });
    setItemImages(prev => ({ ...prev, [assetId]: file }));
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const removeSelected = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleSubmit = async () => {
    if (!recipientName.trim()) return toast.error('กรุณากรอกชื่อหน่วยงานผู้รับ');
    if (selectedIds.size === 0)  return toast.error('กรุณาเลือกทรัพย์สินอย่างน้อย 1 รายการ');

    setSubmitting(true);
    try {
      const assetIds = Array.from(selectedIds);
      const conds    = assetIds.map(id => conditions[id] || '');
      const res = await donationAPI.create({
        donationDate,
        recipientName:    recipientName.trim(),
        recipientAddress: recipientAddress.trim() || undefined,
        recipientContact: recipientContact.trim() || undefined,
        recipientPhone:   recipientPhone.trim()   || undefined,
        approvalRef:      approvalRef.trim()       || undefined,
        notes:            notes.trim()             || undefined,
        assetIds,
        conditions: conds,
      });
      toast.success('สร้างรายการบริจาคเรียบร้อย');

      const donation = res.data.data ?? res.data;
      const donationId: number = donation.id;

      // Upload batch-level images
      try {
        for (const file of batchFiles) {
          await donationAPI.uploadImage(donationId, file);
        }
      } catch {
        toast.error('อัปโหลดรูปภาพ (batch) บางรายการไม่สำเร็จ');
      }

      // Upload item-level images
      try {
        const items: any[] = donation.items ?? [];
        for (const [assetIdStr, file] of Object.entries(itemImages)) {
          const assetId = Number(assetIdStr);
          const item = items.find((it: any) => it.assetId === assetId);
          if (item) {
            await donationAPI.uploadItemImage(donationId, item.id, file);
          }
        }
      } catch {
        toast.error('อัปโหลดรูปภาพ (รายการ) บางรายการไม่สำเร็จ');
      }

      navigate('/donations');
    } catch {
      toast.error('ไม่สามารถสร้างรายการบริจาคได้');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter assets by search
  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assets;
    const q = assetSearch.toLowerCase();
    return assets.filter(a =>
      a.assetCode?.toLowerCase().includes(q) ||
      a.assetName?.toLowerCase().includes(q) ||
      a.serialNo?.toLowerCase().includes(q)  ||
      a.brand?.toLowerCase().includes(q)     ||
      a.model?.toLowerCase().includes(q)
    );
  }, [assets, assetSearch]);

  // Selected assets details
  const selectedAssets = useMemo(
    () => assets.filter(a => selectedIds.has(a.id)),
    [assets, selectedIds]
  );

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/donations')}>กลับ</Button>
        <Box>
          <Typography variant="h4" fontWeight={700}>สร้างรายการบริจาค</Typography>
          <Typography variant="body2" color="text.secondary">
            กรอกข้อมูลผู้รับและเลือกทรัพย์สินที่ปลดระวาง
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ── Left: Recipient Info ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1.5,
                  bgcolor: alpha('#6366F1', 0.1), display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#6366F1',
                }}>
                  <BusinessIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6" fontWeight={600}>ข้อมูลหน่วยงานผู้รับ</Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="ชื่อหน่วยงาน *"
                  fullWidth size="small"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  error={!recipientName.trim() && submitting}
                  helperText={!recipientName.trim() && submitting ? 'กรุณากรอกชื่อหน่วยงาน' : ''}
                />
                <TextField
                  label="ที่อยู่"
                  fullWidth size="small" multiline rows={2}
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                />
                <TextField
                  label="ผู้ติดต่อ"
                  fullWidth size="small"
                  value={recipientContact}
                  onChange={e => setRecipientContact(e.target.value)}
                />
                <TextField
                  label="เบอร์โทร"
                  fullWidth size="small"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                />
                <DatePicker
                  label="วันที่บริจาค"
                  format="DD/MM/YYYY"
                  value={donationDate ? dayjs(donationDate) : null}
                  onChange={(newVal) => setDonationDate(newVal ? newVal.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, InputLabelProps: { shrink: true } } }}
                />
                <TextField
                  label="เลขที่หนังสืออนุมัติ"
                  fullWidth size="small"
                  value={approvalRef}
                  onChange={e => setApprovalRef(e.target.value)}
                />
                <TextField
                  label="หมายเหตุ"
                  fullWidth size="small" multiline rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Box>

              {/* ── Batch Image Dropzone ── */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  📷 หลักฐานรูปภาพ (Batch)
                </Typography>
                <Box
                  onDrop={handleBatchDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => batchInputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: '#6366F1',
                    borderRadius: '8px',
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: alpha('#6366F1', 0.04),
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: alpha('#6366F1', 0.08) },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 32, color: '#6366F1', mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    คลิกหรือลากไฟล์รูปภาพมาวาง
                  </Typography>
                  <input
                    ref={batchInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => { if (e.target.files) addBatchFiles(e.target.files); e.target.value = ''; }}
                  />
                </Box>
                {batchPreviews.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
                    {batchPreviews.map((url, i) => (
                      <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                        <Box
                          component="img"
                          src={url}
                          sx={{
                            width: 64, height: 64, borderRadius: '8px',
                            objectFit: 'cover', border: '1px solid', borderColor: 'divider',
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeBatchFile(i)}
                          sx={{
                            position: 'absolute', top: -8, right: -8,
                            bgcolor: 'error.main', color: '#fff',
                            width: 20, height: 20,
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Selected summary */}
              {selectedAssets.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" fontWeight={600} color="success.dark">
                      รายการที่เลือกแล้ว ({selectedAssets.length})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 200, overflowY: 'auto' }}>
                    {selectedAssets.map(a => (
                      <Box
                        key={a.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1,
                          p: 1, borderRadius: 1,
                          bgcolor: alpha('#10B981', 0.05),
                          border: '0.5px solid', borderColor: alpha('#10B981', 0.2),
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" fontWeight={600} noWrap display="block">
                            {a.assetName || a.assetCode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {a.assetCode}
                          </Typography>
                        </Box>
                        <Tooltip title="ยกเลิกเลือก">
                          <Box
                            component="span"
                            onClick={() => removeSelected(a.id)}
                            sx={{ cursor: 'pointer', color: 'text.disabled', '&:hover': { color: 'error.main' }, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                          </Box>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Action buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={submitting || selectedIds.size === 0 || !recipientName.trim()}
                  sx={{ py: 1.25 }}
                >
                  {submitting ? 'กำลังสร้าง...' : `สร้างรายการบริจาค${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
                </Button>
                <Button variant="outlined" fullWidth onClick={() => navigate('/donations')}>
                  ยกเลิก
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Asset Selection ── */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1.5,
                  bgcolor: alpha('#f59e0b', 0.12), display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'primary.dark',
                }}>
                  <InventoryIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>เลือกทรัพย์สินที่ปลดระวาง</Typography>
                  <Typography variant="caption" color="text.secondary">
                    เฉพาะทรัพย์สินที่มีสถานะ "ปลดระวาง" เท่านั้น
                  </Typography>
                </Box>
                {selectedIds.size > 0 && (
                  <Chip
                    label={`เลือก ${selectedIds.size} รายการ`}
                    color="success" size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>

              {/* Search */}
              <TextField
                size="small"
                fullWidth
                placeholder="ค้นหาเลขครุภัณฑ์ ชื่อ Serial No. ยี่ห้อ..."
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <TableContainer sx={{ maxHeight: 520 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedIds.size > 0 && selectedIds.size < filteredAssets.length}
                          checked={filteredAssets.length > 0 && filteredAssets.every(a => selectedIds.has(a.id))}
                          onChange={selectAll}
                          disabled={loadingAssets}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>เลขครุภัณฑ์</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ชื่อทรัพย์สิน</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Serial No.</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ยี่ห้อ/รุ่น</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>สภาพ</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 48 }}>📷</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingAssets ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell padding="checkbox"><Skeleton variant="rectangular" width={20} height={20} /></TableCell>
                          {[1, 2, 3, 4, 5, 6].map(j => (
                            <TableCell key={j}><Skeleton variant="text" width="80%" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                          <InventoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {assetSearch ? 'ไม่พบทรัพย์สินที่ตรงกับการค้นหา' : 'ไม่มีทรัพย์สินที่ปลดระวางแล้ว'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssets.map(a => {
                        const isSelected = selectedIds.has(a.id);
                        return (
                          <TableRow
                            key={a.id}
                            hover
                            selected={isSelected}
                            sx={{
                              cursor: 'pointer',
                              ...(isSelected && {
                                bgcolor: `${alpha('#10B981', 0.06)} !important`,
                                '& .MuiTableCell-body': { borderColor: alpha('#10B981', 0.1) },
                              }),
                            }}
                            onClick={() => toggleSelect(a.id)}
                          >
                            <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleSelect(a.id)}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: isSelected ? 600 : 400 }}>
                              {a.assetCode || '—'}
                            </TableCell>
                            <TableCell>{a.assetName || '—'}</TableCell>
                            <TableCell>{a.serialNo || '—'}</TableCell>
                            <TableCell>{[a.brand, a.model].filter(Boolean).join(' ') || '—'}</TableCell>
                            <TableCell>
                              {isSelected ? (
                                <TextField
                                  size="small"
                                  placeholder="เช่น ชำรุดเล็กน้อย"
                                  value={conditions[a.id] || ''}
                                  onChange={e => setConditions(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  onClick={e => e.stopPropagation()}
                                  sx={{ minWidth: 130 }}
                                />
                              ) : (
                                <Typography variant="caption" color="text.disabled">—</Typography>
                              )}
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()} sx={{ px: 0.5 }}>
                              {isSelected ? (
                                <>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    ref={el => { itemInputRefs.current[a.id] = el; }}
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) setItemImage(a.id, file);
                                      e.target.value = '';
                                    }}
                                  />
                                  {itemPreviews[a.id] ? (
                                    <Box
                                      component="img"
                                      src={itemPreviews[a.id]}
                                      onClick={() => itemInputRefs.current[a.id]?.click()}
                                      sx={{
                                        width: 32, height: 32, borderRadius: '8px',
                                        objectFit: 'cover', cursor: 'pointer',
                                        border: '1px solid', borderColor: 'divider',
                                      }}
                                    />
                                  ) : (
                                    <IconButton
                                      size="small"
                                      onClick={() => itemInputRefs.current[a.id]?.click()}
                                      sx={{ color: '#6366F1' }}
                                    >
                                      <PhotoCameraIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                  )}
                                </>
                              ) : (
                                <Typography variant="caption" color="text.disabled">—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Footer count */}
              {!loadingAssets && filteredAssets.length > 0 && (
                <Box sx={{ pt: 1.5, mt: 1, borderTop: '0.5px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    แสดง {filteredAssets.length} จาก {assets.length} รายการ
                    {selectedIds.size > 0 && (
                      <> &nbsp;·&nbsp; <strong style={{ color: '#059669' }}>เลือกแล้ว {selectedIds.size} รายการ</strong></>
                    )}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
