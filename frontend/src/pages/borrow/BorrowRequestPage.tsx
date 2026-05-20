import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Alert, Divider, List, ListItem, ListItemText,
  InputAdornment, IconButton, Checkbox, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DevicesIcon from '@mui/icons-material/Devices';
import { assetAPI, borrowAPI, inventoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function BorrowRequestPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<any[]>([]);
  const initialAssetId = searchParams.get('assetId');
  const [selected, setSelected] = useState<number[]>(initialAssetId ? [parseInt(initialAssetId)] : []);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const navigate = useNavigate();

  // Inventory items state
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Array<{ item: any; qty: number }>>([]);

  const borrowDays = parseInt(import.meta.env.VITE_BORROW_DUE_DAYS || '3');

  useEffect(() => {
    assetAPI.list({ status: 'Available', limit: 200 })
      .then((res) => setAssets(res.data.data || []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const foundAssets = selected.map((id) => assets.find((a: any) => a.id === id)).filter(Boolean);
    setSelectedAssets(foundAssets);
  }, [selected]);

  useEffect(() => {
    if (activeTab === 1) {
      setInvLoading(true);
      inventoryAPI.list({ limit: 200 })
        .then((res) => setInventoryItems(res.data.data || []))
        .catch(() => setInventoryItems([]))
        .finally(() => setInvLoading(false));
    }
  }, [activeTab]);

  const toggleInventorySelect = (item: any) => {
    setSelectedInventory((prev) => {
      if (prev.find((s) => s.item.id === item.id)) {
        return prev.filter((s) => s.item.id !== item.id);
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateInvQty = (itemId: number, qty: number) => {
    setSelectedInventory((prev) =>
      prev.map((s) => (s.item.id === itemId ? { ...s, qty: Math.max(1, qty) } : s))
    );
  };

  const removeInventoryItem = (itemId: number) => {
    setSelectedInventory((prev) => prev.filter((s) => s.item.id !== itemId));
  };

  const filteredAssets = assets.filter((a) =>
    searchTerm === '' ||
    a.assetCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.serialNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeSelected = (id: number) => {
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const handleSubmit = async () => {
    if (selected.length === 0 && selectedInventory.length === 0) {
      setError('กรุณาเลือกทรัพย์สินหรือวัสดุอย่างน้อย 1 รายการ');
      return;
    }
    if (!purpose.trim()) {
      setError('กรุณากรอกวัตถุประสงค์การยืม');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await borrowAPI.createRequest({
        assetIds: selected,
        inventoryItems: selectedInventory.map((s) => ({ inventoryItemId: s.item.id, quantity: s.qty })),
        purpose,
        notes,
        location,
        dueDate: dueDate || new Date(Date.now() + borrowDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setSuccess('สร้างคำขอยืมสำเร็จ');
      setTimeout(() => navigate('/borrow/my-requests'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          ยืมทรัพย์สิน
        </Typography>
        <Typography variant="body1" color="text.secondary">
          เลือกทรัพย์สินที่ต้องการยืม และระบุรายละเอียดการยืม
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Form Section */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                ข้อมูลการยืม
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="วัตถุประสงค์การยืม *"
                  fullWidth
                  multiline
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="เช่น ใช้ในการประชุม, ใช้สำหรับ Project XYZ"
                  error={purpose.trim() === '' && submitting}
                  helperText={purpose.trim() === '' && submitting ? 'จำเป็นต้องกรอก' : ''}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="สถานที่/หน่วยงานที่ใช้งาน"
                  fullWidth
                  size="small"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น สำนักงานใหญ่ ชั้น 5, โรงงาน A"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="หมายเหตุเพิ่มเติม"
                  fullWidth
                  multiline
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="กำหนดคืนเมื่อ"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0],
                  }}
                  helperText={`ค่าเริ่มต้น: ${borrowDays} วัน นับจากวันนี้`}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Asset/Inventory Selection */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={activeTab === 0 ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<DevicesIcon />}
                  onClick={() => setActiveTab(0)}
                >
                  ทรัพย์สิน IT ({assets.length})
                </Button>
                <Button
                  variant={activeTab === 1 ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<Inventory2Icon />}
                  onClick={() => setActiveTab(1)}
                >
                  วัสดุสิ้นเปลือง ({inventoryItems.length})
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {activeTab === 0 ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      label="ค้นหาทรัพย์สิน"
                      fullWidth
                      size="small"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                          <InputAdornment position="end">
                            <ClearIcon
                              sx={{ cursor: 'pointer' }}
                              onClick={() => setSearchTerm('')}
                            />
                          </InputAdornment>
                        ),
                      }}
                      placeholder="รหัส, Serial, ยี่ห้อ, รุ่น"
                    />
                  </Box>

                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={`พบทั้งหมด ${filteredAssets.length} รายการ`} variant="outlined" color="primary" />
                    <Chip label={`เลือกแล้ว ${selected.length}`} color="success" variant="filled" />
                  </Box>

                  <TableContainer sx={{ maxHeight: 350, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                          <TableCell padding="checkbox" width={40}></TableCell>
                          <TableCell width={100}>รหัส</TableCell>
                          <TableCell width={100}>Serial No.</TableCell>
                          <TableCell>ยี่ห้อ/รุ่น</TableCell>
                          <TableCell width={100}>สถานที่</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAssets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                              <Typography color="text.secondary">
                                {assets.length === 0 ? 'ไม่มีทรัพย์สินที่พร้อมให้ยืม' : 'ไม่พบผลการค้นหา'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAssets.map((a) => (
                            <TableRow key={a.id} hover selected={selected.includes(a.id)} onClick={() => toggleSelect(a.id)} sx={{ cursor: 'pointer' }}>
                              <TableCell padding="checkbox"><Checkbox checked={selected.includes(a.id)} /></TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>{a.assetCode}</TableCell>
                              <TableCell>{a.serialNo || '-'}</TableCell>
                              <TableCell>{`${a.brand || ''} ${a.model || ''}`.trim() || '-'}</TableCell>
                              <TableCell>{a.location || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <>
                  {invLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 350, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'rgba(46, 125, 50, 0.05)' }}>
                            <TableCell padding="checkbox" width={40}></TableCell>
                            <TableCell>ชื่อรายการ</TableCell>
                            <TableCell>หมวด</TableCell>
                            <TableCell>คงเหลือ</TableCell>
                            <TableCell>หน่วย</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inventoryItems.filter((i) => i.availableQuantity > 0).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">ไม่มีวัสดุคงเหลือให้ยืม</Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            inventoryItems.filter((i) => i.availableQuantity > 0).map((item) => (
                              <TableRow key={item.id} hover selected={selectedInventory.some((s) => s.item.id === item.id)} onClick={() => toggleInventorySelect(item)} sx={{ cursor: 'pointer' }}>
                                <TableCell padding="checkbox"><Checkbox checked={selectedInventory.some((s) => s.item.id === item.id)} /></TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                                <TableCell><Chip label={item.category} size="small" variant="outlined" /></TableCell>
                                <TableCell>{item.availableQuantity}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                สรุปการยืม
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>ผู้ขอ</Typography>
                <Typography variant="body1" fontWeight={600}>{user?.displayName || user?.adUsername || '-'}</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>จำนวนรายการที่เลือก</Typography>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {selected.length + selectedInventory.length}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                รายการที่เลือก:
              </Typography>

              <Box sx={{ mb: 3, maxHeight: 300, overflow: 'auto' }}>
                {selectedAssets.length === 0 && selectedInventory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    ยังไม่มีการเลือกรายการ
                  </Typography>
                ) : (
                  <>
                    {selectedAssets.map((asset) => (
                      <Box key={asset.id} sx={{ p: 1.5, mb: 1, backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>{asset.assetCode}</Typography>
                          <Typography variant="caption" color="text.secondary">{asset.serialNo}</Typography>
                        </Box>
                        <Button size="small" color="error" onClick={() => removeSelected(asset.id)}><DeleteIcon fontSize="small" /></Button>
                      </Box>
                    ))}
                    {selectedInventory.map(({ item, qty }) => (
                      <Box key={item.id} sx={{ p: 1.5, mb: 1, backgroundColor: 'rgba(46, 125, 50, 0.05)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={qty}
                              onChange={(e) => updateInvQty(item.id, parseInt(e.target.value) || 1)}
                              inputProps={{ min: 1, max: item.availableQuantity }}
                              sx={{ width: 70, '& input': { fontSize: '0.8rem', py: 0.5 } }}
                            />
                            <Typography variant="caption" color="text.secondary">{item.unit}</Typography>
                          </Box>
                        </Box>
                        <Button size="small" color="error" onClick={() => removeInventoryItem(item.id)}><DeleteIcon fontSize="small" /></Button>
                      </Box>
                    ))}
                  </>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleSubmit}
                disabled={submitting || selected.length === 0 || !purpose.trim()}
                sx={{ mb: 1 }}
              >
                {submitting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <span>กำลังส่ง...</span>
                  </Box>
                ) : (
                  'ส่งคำขอยืม'
                )}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => navigate('/borrow/my-requests')}
              >
                ยกเลิก
              </Button>

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  ℹ️ กำหนดคืนอัตโนมัติใน <strong>{borrowDays} วัน</strong> นับจากวันที่ยืม
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
