import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Checkbox, CircularProgress, Chip,
  Snackbar, Alert, IconButton, Tooltip, useTheme, alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Search as SearchLucide, Inbox } from 'lucide-react';
import { SectionCard } from '../../components/SectionCard';
import { custodyAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CustodyAsset {
  id: number;
  assetCode: string | null;
  assetName: string | null;
  serialNo: string | null;
  type: string | null;
  brand: string | null;
  model: string | null;
  company: string | null;
  ownerName: string | null;
  departmentId: string | null;
  custodyHolder: string | null;
  custodyNote: string | null;
  custodyUpdatedAt: string | null;
}

interface Holder {
  code: string;
  label: string;
  company: string;
}

const MIN_QUERY = 3;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return ms < 0 ? 0 : Math.floor(ms / 86_400_000);
}

function describe(a: CustodyAsset): string {
  return [a.brand, a.model].filter(Boolean).join(' ') || a.type || '—';
}

export default function CustodyIntakePage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [holders, setHolders] = useState<Holder[]>([]);
  const [holder, setHolder] = useState<string>('');

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustodyAsset[]>([]);

  const [held, setHeld] = useState<CustodyAsset[]>([]);
  const [loadingHeld, setLoadingHeld] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const heldIds = useMemo(() => new Set(held.map(a => a.id)), [held]);
  const activeHolderLabel = holders.find(h => h.code === holder)?.label || 'จุดรับฝาก';

  useEffect(() => {
    custodyAPI.holders()
      .then(res => {
        const list: Holder[] = res.data?.data || [];
        setHolders(list);
        if (list.length > 0) setHolder(list[0].code);
      })
      .catch(() => setToast({ msg: 'โหลดรายชื่อจุดรับฝากไม่สำเร็จ', severity: 'error' }));
  }, []);

  const loadHeld = useCallback(() => {
    setLoadingHeld(true);
    custodyAPI.held()
      .then(res => setHeld(res.data?.data || []))
      .catch(() => setToast({ msg: 'โหลดรายการที่รับฝากไม่สำเร็จ', severity: 'error' }))
      .finally(() => setLoadingHeld(false));
  }, []);

  useEffect(() => { loadHeld(); }, [loadHeld]);

  // Debounced search. The server enforces the 3-character floor and the 25-row
  // cap too — this is just to avoid firing a request per keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      custodyAPI.search(q)
        .then(res => setResults(res.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const applyCustody = async (asset: CustodyAsset, nextHolder: string | null) => {
    setBusyId(asset.id);
    try {
      await custodyAPI.set(asset.id, { holder: nextHolder });
      setResults(prev => prev.map(a => (a.id === asset.id ? { ...a, custodyHolder: nextHolder } : a)));
      loadHeld();
      setToast({
        msg: nextHolder
          ? `บันทึกแล้ว: ${asset.assetCode || asset.serialNo} อยู่ที่ ${activeHolderLabel}`
          : `เอาออกแล้ว: ${asset.assetCode || asset.serialNo}`,
        severity: 'success',
      });
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'บันทึกไม่สำเร็จ', severity: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const emptyRow = (text: string) => (
    <TableRow>
      <TableCell colSpan={7} align="center" sx={{ py: 4, color: theme.palette.text.disabled, fontSize: '0.8rem' }}>
        {text}
      </TableCell>
    </TableRow>
  );

  const headCellSx = { fontSize: '0.72rem', fontWeight: 700, color: theme.palette.text.secondary, whiteSpace: 'nowrap' as const };
  const cellSx = { fontSize: '0.78rem', color: theme.palette.text.primary };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, mx: 'auto' }}>
      <Box>
        <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: theme.palette.text.primary }}>
          เครื่องที่รับฝาก
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary, mt: 0.5 }}>
          ค้นหาเครื่องที่พนักงานนำมาคืน แล้วติ๊กว่าเครื่องอยู่ที่ {activeHolderLabel} — ฝ่าย IT จะเห็นรายการนี้ทันที
        </Typography>
      </Box>

      <SectionCard title="ค้นหาเครื่องเพื่อรับฝาก" icon={SearchLucide}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="พิมพ์รหัสทรัพย์สิน, Serial Number หรือชื่อพนักงาน (อย่างน้อย 3 ตัวอักษร)"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
              </InputAdornment>
            ),
            endAdornment: searching ? <CircularProgress size={16} /> : null,
          }}
          sx={{ mb: 1.5 }}
        />

        {query.trim().length > 0 && query.trim().length < MIN_QUERY ? (
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled, py: 2, textAlign: 'center' }}>
            พิมพ์อีก {MIN_QUERY - query.trim().length} ตัวอักษร
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={headCellSx} />
                  <TableCell sx={headCellSx}>รหัสทรัพย์สิน</TableCell>
                  <TableCell sx={headCellSx}>Serial No.</TableCell>
                  <TableCell sx={headCellSx}>อุปกรณ์</TableCell>
                  <TableCell sx={headCellSx}>บริษัท</TableCell>
                  <TableCell sx={headCellSx}>ผู้ครอบครองเดิม</TableCell>
                  <TableCell sx={headCellSx}>สถานะรับฝาก</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.length === 0
                  ? emptyRow(query.trim().length >= MIN_QUERY && !searching ? 'ไม่พบเครื่องที่ตรงกับคำค้น' : 'พิมพ์เพื่อค้นหาเครื่อง')
                  : results.map(a => {
                      const isHeld = heldIds.has(a.id) || !!a.custodyHolder;
                      return (
                        <TableRow key={a.id} hover selected={isHeld}>
                          <TableCell padding="checkbox">
                            {busyId === a.id ? (
                              <CircularProgress size={16} sx={{ ml: 1.25 }} />
                            ) : (
                              <Checkbox
                                size="small"
                                checked={isHeld}
                                onChange={() => applyCustody(a, isHeld ? null : holder)}
                                disabled={!holder}
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{a.assetCode || '—'}</TableCell>
                          <TableCell sx={cellSx}>{a.serialNo || '—'}</TableCell>
                          <TableCell sx={cellSx}>{describe(a)}</TableCell>
                          <TableCell sx={cellSx}>{a.company || '—'}</TableCell>
                          <TableCell sx={cellSx}>{a.ownerName || '—'}</TableCell>
                          <TableCell>
                            {isHeld ? (
                              <Chip size="small" label="รับฝากแล้ว" sx={{
                                height: 20, fontSize: '0.68rem', fontWeight: 700,
                                bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main,
                              }} />
                            ) : (
                              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.disabled }}>ยังไม่รับฝาก</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <SectionCard title={`เครื่องที่อยู่กับ ${activeHolderLabel} ตอนนี้ (${held.length} เครื่อง)`} icon={Inbox}>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>รหัสทรัพย์สิน</TableCell>
                <TableCell sx={headCellSx}>Serial No.</TableCell>
                <TableCell sx={headCellSx}>อุปกรณ์</TableCell>
                <TableCell sx={headCellSx}>บริษัท</TableCell>
                <TableCell sx={headCellSx}>ผู้ครอบครองเดิม</TableCell>
                {isAdmin && <TableCell sx={headCellSx}>จุดรับฝาก</TableCell>}
                <TableCell sx={headCellSx} align="right">ฝากไว้</TableCell>
                <TableCell sx={headCellSx} align="center">เอาออก</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingHeld ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={22} /></TableCell>
                </TableRow>
              ) : held.length === 0 ? (
                emptyRow('ยังไม่มีเครื่องที่รับฝากไว้')
              ) : (
                held.map(a => {
                  const days = daysSince(a.custodyUpdatedAt);
                  return (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{a.assetCode || '—'}</TableCell>
                      <TableCell sx={cellSx}>{a.serialNo || '—'}</TableCell>
                      <TableCell sx={cellSx}>{describe(a)}</TableCell>
                      <TableCell sx={cellSx}>{a.company || '—'}</TableCell>
                      <TableCell sx={cellSx}>{a.ownerName || '—'}</TableCell>
                      {isAdmin && (
                        <TableCell sx={cellSx}>
                          {holders.find(h => h.code === a.custodyHolder)?.label || a.custodyHolder || '—'}
                        </TableCell>
                      )}
                      <TableCell sx={cellSx} align="right">
                        {days === null ? '—' : days === 0 ? 'วันนี้' : `${days} วัน`}
                      </TableCell>
                      <TableCell align="center">
                        {busyId === a.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Tooltip title="เอาออกจากรายการรับฝาก">
                            <IconButton size="small" onClick={() => applyCustody(a, null)}>
                              <DeleteOutlineIcon sx={{ fontSize: 17, color: theme.palette.error.main }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity || 'success'} variant="filled" onClose={() => setToast(null)} sx={{ fontSize: '0.8rem' }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
