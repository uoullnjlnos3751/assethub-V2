import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, TextField, Tooltip, Typography, Autocomplete, Stack,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { assetLinkAPI, assetAPI } from '../../../services/api';
import { useConfirm } from '../../../contexts/ConfirmContext';

const LINK_TYPES = ['COMPONENT', 'CONNECTED', 'DEPENDS_ON'];
const LINK_TYPE_LABELS: Record<string, string> = {
  COMPONENT: 'เป็นส่วนประกอบ', CONNECTED: 'เชื่อมต่อกับ', DEPENDS_ON: 'ต้องพึ่งพา',
};

interface Props {
  assetId: number;
  canEdit: boolean;
}

export default function AssetLinksPanel({ assetId, canEdit }: Props) {
  const [children, setChildren] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState('COMPONENT');
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    assetLinkAPI.byAsset(assetId)
      .then(res => { setChildren(res.data.children || []); setParents(res.data.parents || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [assetId]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setOptions([]); return; }
    const timer = setTimeout(() => {
      assetAPI.list({ search: q, limit: 10 })
        .then(res => setOptions((res.data?.data || []).filter((a: any) => a.id !== assetId)))
        .catch(() => setOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, assetId]);

  const openDialog = () => { setTarget(null); setSearch(''); setLinkType('COMPONENT'); setNote(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!target) return;
    await assetLinkAPI.create({ parentId: assetId, childId: target.id, linkType, note: note || undefined });
    setDialogOpen(false);
    load();
  };

  const confirm = useConfirm();
  const handleRemove = async (linkId: number) => {
    if (!await confirm({
      title: 'ยกเลิกการเชื่อมโยงอุปกรณ์',
      detail: 'ทรัพย์สินทั้งสองยังอยู่ในระบบ แต่จะไม่ผูกกันอีกต่อไป',
      confirmLabel: 'ยกเลิกการเชื่อมโยง',
    })) return;
    await assetLinkAPI.delete(linkId);
    load();
  };

  if (loading) return null;
  if (!loading && children.length === 0 && parents.length === 0 && !canEdit) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>อุปกรณ์เชื่อมโยง (CMDB)</Typography>
        {canEdit && (
          <Button size="small" startIcon={<AddLinkIcon fontSize="small" />} onClick={openDialog}>เชื่อมโยงอุปกรณ์</Button>
        )}
      </Box>

      {parents.length === 0 && children.length === 0 ? (
        <Typography variant="caption" color="text.secondary">ยังไม่มีอุปกรณ์เชื่อมโยง</Typography>
      ) : (
        <Stack spacing={1}>
          {parents.map((l: any) => (
            <Box key={`p-${l.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" variant="outlined" label={`เป็นส่วนหนึ่งของ: ${l.parent?.assetName || l.parent?.assetCode || '—'}`} />
              <Typography variant="caption" color="text.secondary">({LINK_TYPE_LABELS[l.linkType] || l.linkType})</Typography>
              {canEdit && (
                <Tooltip title="ยกเลิกเชื่อมโยง">
                  <IconButton size="small" onClick={() => handleRemove(l.id)}><LinkOffIcon fontSize="small" /></IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
          {children.map((l: any) => (
            <Box key={`c-${l.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" color="primary" variant="outlined" label={`${l.child?.assetName || l.child?.assetCode || '—'}`} />
              <Typography variant="caption" color="text.secondary">({LINK_TYPE_LABELS[l.linkType] || l.linkType})</Typography>
              {canEdit && (
                <Tooltip title="ยกเลิกเชื่อมโยง">
                  <IconButton size="small" onClick={() => handleRemove(l.id)}><LinkOffIcon fontSize="small" /></IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>เชื่อมโยงอุปกรณ์</DialogTitle>
        <DialogContent sx={{ pt: '8px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            options={options}
            getOptionLabel={(o: any) => typeof o === 'string' ? o : `${o.assetCode || o.assetName || ''} · ${o.serialNo || ''}`}
            value={target}
            onChange={(e, val) => setTarget(val)}
            inputValue={search}
            onInputChange={(e, val) => setSearch(val)}
            isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="อุปกรณ์ที่จะเชื่อมโยง * (พิมพ์เพื่อค้นหา)" autoFocus />}
            noOptionsText={search.trim().length < 2 ? 'พิมพ์อย่างน้อย 2 ตัวอักษร' : 'ไม่พบทรัพย์สิน'}
          />
          <TextField select label="ประเภทความสัมพันธ์" value={linkType} onChange={e => setLinkType(e.target.value)}>
            {LINK_TYPES.map(t => <MenuItem key={t} value={t}>{LINK_TYPE_LABELS[t]}</MenuItem>)}
          </TextField>
          <TextField label="หมายเหตุ" value={note} onChange={e => setNote(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={!target}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
