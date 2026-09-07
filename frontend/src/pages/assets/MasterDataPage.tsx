import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, alpha, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useToast } from '../../contexts/ToastContext';

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
type StatusOption = { code: string; name: string };

interface MasterDataItem {
  id: number;
  name: string;
  code?: string;
  description?: string | null;
  company?: string;
  isActive: boolean;
  assetCount?: number;
}

type MasterDataPageProps = {
  title: string;
  subtitle: string;
  itemLabel: string;
  icon?: string;
  accentColor?: string;
  fetchItems: () => Promise<any>;
  createItem: (data: any) => Promise<any>;
  updateItem: (id: number, data: any) => Promise<any>;
  deleteItem: (id: number) => Promise<any>;
  importItems?: () => Promise<any>;
  statusOptions?: StatusOption[];
  showCompanyField?: boolean;
  showCodeField?: boolean;
};

const emptyForm = { code: '', name: '', company: '', description: '', isActive: true };

/* ─────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────── */
export default function MasterDataPage({
  title, subtitle, itemLabel, icon = '📋', accentColor,
  fetchItems, createItem, updateItem, deleteItem,
  importItems, statusOptions, showCompanyField, showCodeField,
}: MasterDataPageProps) {
  const theme = useTheme();
  const accent = accentColor || theme.palette.primary.main;
  const toast = useToast();
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [filtered, setFiltered] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MasterDataItem | null>(null);

  const isStatusPage = Boolean(statusOptions?.length);

  /* ── Data ── */
  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchItems();
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setItems(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    ) : items);
  }, [search, items]);

  /* ── Dialog ── */
  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, code: statusOptions?.[0]?.code || '' });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      code: item.code || statusOptions?.[0]?.code || '',
      name: item.name || '',
      company: item.company || '',
      description: item.description || '',
      isActive: item.isActive ?? true,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (isStatusPage && !form.code.trim()) { setError('กรุณาเลือกรหัสสถานะ'); return; }
    if (!form.name.trim()) { setError(`กรุณาระบุ${itemLabel}`); return; }
    setSaving(true); setError('');
    try {
      const data = {
        code: isStatusPage ? form.code.trim() : showCodeField ? form.code.trim() || null : undefined,
        name: form.name.trim(),
        company: showCompanyField ? form.company.trim() || null : undefined,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editingItem) {
        await updateItem(editingItem.id, data);
        toast.success(`แก้ไข "${form.name}" สำเร็จ`);
      } else {
        await createItem(data);
        toast.success(`เพิ่ม "${form.name}" สำเร็จ`);
      }
      setDialogOpen(false);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || `ไม่สามารถบันทึก${itemLabel}ได้`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    try {
      await deleteItem(item.id);
      setDeleteConfirm(null);
      loadItems();
      toast.success(`ลบ "${item.name}" สำเร็จ`);
    } catch (err: any) {
      setDeleteConfirm(null);
      toast.error(`❌ ${err.response?.data?.error || `ไม่สามารถลบ${itemLabel}ได้`}`);
    }
  };

  const handleImport = async () => {
    if (!importItems) return;
    setImporting(true);
    try {
      const res = await importItems();
      await loadItems();
      toast.success(`นำเข้าสำเร็จ ${res?.data?.imported ?? ''} รายการ`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'นำเข้าไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  const activeCount = items.filter(i => i.isActive !== false).length;
  const inactiveCount = items.length - activeCount;

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            bgcolor: alpha(accent, 0.08), border: `1.5px solid ${alpha(accent, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
          }}>{icon}</Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>{title}</Typography>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, mt: 0.25 }}>{subtitle}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {importItems && (
            <Button variant="outlined" size="small" onClick={handleImport} disabled={importing}>
              {importing ? '⏳' : '🔄'} นำเข้าจากทรัพย์สิน
            </Button>
          )}
          <Button variant="contained" size="small" onClick={openCreate} sx={{ bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' } }}>
            ＋ เพิ่ม{itemLabel}
          </Button>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ display: 'flex', gap: 1.25, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.75, py: 1.25, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', flex: 1, minWidth: 100 }}>
          <Typography sx={{ fontSize: 22 }}>📦</Typography>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: accent, lineHeight: 1.2 }}>{items.length}</Typography>
            <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled }}>ทั้งหมด</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.75, py: 1.25, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', flex: 1, minWidth: 100 }}>
          <Typography sx={{ fontSize: 22 }}>✅</Typography>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: theme.palette.success.main, lineHeight: 1.2 }}>{activeCount}</Typography>
            <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled }}>ใช้งาน</Typography>
          </Box>
        </Box>
        {inactiveCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.75, py: 1.25, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', flex: 1, minWidth: 100 }}>
            <Typography sx={{ fontSize: 22 }}>🔒</Typography>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: theme.palette.text.disabled, lineHeight: 1.2 }}>{inactiveCount}</Typography>
              <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled }}>ปิดใช้งาน</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.75, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" sx={{ flex: 1, minWidth: 180 }}
          placeholder={`ค้นหา${itemLabel}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>
          แสดง {filtered.length}/{items.length}
        </Typography>
      </Box>

      {/* ── Table ── */}
      <TableContainer sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center', color: accent, fontSize: 13 }}>⏳ กำลังโหลด...</Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: theme.palette.text.disabled, fontSize: 13 }}>
            {search ? `ไม่พบ "${search}"` : `ยังไม่มี${itemLabel}`}<br />
            <Box component="span" sx={{ fontSize: 11 }}>กดปุ่ม "+ เพิ่ม" เพื่อเพิ่มรายการใหม่</Box>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                {(isStatusPage || showCodeField) && <TableCell>รหัส</TableCell>}
                <TableCell>{itemLabel}</TableCell>
                {showCompanyField && <TableCell>Company</TableCell>}
                <TableCell>รายละเอียด</TableCell>
                <TableCell>ทรัพย์สิน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="center" sx={{ width: 110 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ color: theme.palette.text.disabled, fontSize: 11 }}>{idx + 1}</TableCell>
                  {(isStatusPage || showCodeField) && (
                    <TableCell>
                      <Box component="span" sx={{
                        fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.palette.info.dark,
                        bgcolor: alpha(theme.palette.info.main, 0.08), px: '7px', py: '2px', borderRadius: '5px',
                      }}>{item.code || '—'}</Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.8rem' }}>{item.name}</Typography>
                  </TableCell>
                  {showCompanyField && (
                    <TableCell><Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>{item.company || '—'}</Typography></TableCell>
                  )}
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Box component="span" sx={{ display: 'block', fontSize: 11, color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description || <Box component="span" sx={{ color: theme.palette.text.disabled }}>—</Box>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.assetCount != null ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 11, fontWeight: 600, color: theme.palette.text.secondary }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, display: 'inline-block' }} />
                        {item.assetCount} รายการ
                      </Box>
                    ) : <Box component="span" sx={{ color: theme.palette.text.disabled }}>—</Box>}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.isActive !== false ? '● ใช้งาน' : '○ ปิด'}
                      sx={item.isActive !== false ? {
                        bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      } : {
                        bgcolor: theme.palette.background.default, color: theme.palette.text.disabled, border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Button
                        size="small" onClick={() => openEdit(item)}
                        sx={{
                          minWidth: 0, px: 1, fontSize: 10, fontWeight: 600,
                          bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.dark,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.15) },
                        }}
                      >✏️ แก้ไข</Button>
                      <Button
                        size="small" onClick={() => setDeleteConfirm(item)}
                        sx={{
                          minWidth: 0, px: 1, fontSize: 10, fontWeight: 600,
                          bgcolor: alpha(theme.palette.error.main, 0.06), color: theme.palette.error.main,
                          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) },
                        }}
                      >🗑</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* ── Pagination hint ── */}
      {items.length > 0 && (
        <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled, mt: 1, textAlign: 'right' }}>
          {filtered.length} รายการ {search && `(กรอง "${search}")`}
        </Typography>
      )}

      {/* ── Create / Edit Modal ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{editingItem ? `✏️ แก้ไข${itemLabel}` : `➕ เพิ่ม${itemLabel}`}</Typography>
          <IconButton aria-label="ปิด" size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            {error && (
              <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, borderRadius: '8px', px: 1.5, py: 1, fontSize: 11, color: theme.palette.error.main }}>
                ⚠️ {error}
              </Box>
            )}

            {isStatusPage && (
              <Select
                fullWidth size="small"
                value={form.code}
                onChange={e => {
                  const nextCode = e.target.value as string;
                  const opt = statusOptions?.find(s => s.code === nextCode);
                  setForm(p => ({ ...p, code: nextCode, name: p.name || opt?.name || '' }));
                }}
              >
                {statusOptions?.map(s => (
                  <MenuItem key={s.code} value={s.code}>{s.code} — {s.name}</MenuItem>
                ))}
              </Select>
            )}

            {showCodeField && !isStatusPage && (
              <TextField
                fullWidth size="small" label="รหัส"
                placeholder="รหัสแผนก (ไม่บังคับ)"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              />
            )}

            <TextField
              autoFocus={!isStatusPage}
              fullWidth size="small"
              label={`${itemLabel} *`}
              placeholder={`ระบุ${itemLabel}`}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && !isStatusPage && handleSave()}
            />

            {showCompanyField && (
              <TextField
                fullWidth size="small" label="Company"
                placeholder="ชื่อบริษัท"
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
              />
            )}

            <TextField
              fullWidth multiline minRows={3} size="small"
              label="รายละเอียด"
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.primary, fontWeight: 500 }}>เปิดใช้งาน</Typography>
              <Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            sx={{ minWidth: 80, bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' } }}
          >
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Modal ── */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>🗑 ยืนยันการลบ</Typography>
          <IconButton aria-label="ปิด" size="small" onClick={() => setDeleteConfirm(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: theme.palette.text.primary, mb: 0.75 }}>
            ต้องการลบ <strong>"{deleteConfirm?.name}"</strong> ใช่หรือไม่?
          </Typography>
          <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>
            การลบไม่สามารถย้อนกลับได้ และอาจกระทบข้อมูลทรัพย์สินที่เชื่อมอยู่
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm)}>🗑 ลบเลย</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
