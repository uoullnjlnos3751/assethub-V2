import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, TextField, Grid, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, InputAdornment, alpha, Skeleton, Divider, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { donationAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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
  const navigate = useNavigate();
  const toast    = useToast();

  useEffect(() => {
    donationAPI.retiredAssets()
      .then(res => setAssets(res.data.data))
      .catch(() => toast.error('ไม่สามารถโหลดข้อมูลทรัพย์สินได้'))
      .finally(() => setLoadingAssets(false));
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
      await donationAPI.create({
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
                <TextField
                  label="วันที่บริจาค"
                  type="date" fullWidth size="small"
                  value={donationDate}
                  onChange={e => setDonationDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingAssets ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell padding="checkbox"><Skeleton variant="rectangular" width={20} height={20} /></TableCell>
                          {[1, 2, 3, 4, 5].map(j => (
                            <TableCell key={j}><Skeleton variant="text" width="80%" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
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
