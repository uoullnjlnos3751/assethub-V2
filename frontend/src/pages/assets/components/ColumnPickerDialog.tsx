import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { ColumnConfig, COLUMN_CATEGORIES, defaultColumnConfig } from '../assetListConfig';

/* ─── Column picker dialog (ตั้งค่าคอลัมน์ที่แสดงในตาราง) ──────────── */
export default function ColumnPickerDialog({
  open,
  onClose,
  columnConfig,
  setColumnConfig,
  columnSearch,
  setColumnSearch,
}: {
  open: boolean;
  onClose: () => void;
  columnConfig: ColumnConfig[];
  setColumnConfig: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
  columnSearch: string;
  setColumnSearch: (v: string) => void;
}) {
  const theme = useTheme();
  const visibleCount = columnConfig.filter((config) => config.visible).length;

  const toggleColumn = (field: string) => {
    setColumnConfig((current) => current.map((config) => {
      if (config.field !== field) return config;
      if (config.visible && visibleCount <= 1) return config;
      return { ...config, visible: !config.visible };
    }));
  };

  const moveColumn = (field: string, direction: 'up' | 'down') => {
    setColumnConfig((current) => {
      const index = current.findIndex((config) => config.field === field);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const resetColumns = () => setColumnConfig(defaultColumnConfig);

  const columnCategoryNames = useMemo(() => Array.from(new Set(Object.values(COLUMN_CATEGORIES))), []);
  const filteredColumnConfig = useMemo(() => {
    const q = columnSearch.trim().toLowerCase();
    if (!q) return columnConfig;
    return columnConfig.filter((c) =>
      c.label.toLowerCase().includes(q) || (COLUMN_CATEGORIES[c.field] || '').toLowerCase().includes(q)
    );
  }, [columnConfig, columnSearch]);

  return (
    <Dialog open={open} onClose={() => { onClose(); setColumnSearch(''); }} fullWidth maxWidth="sm">
      <DialogTitle>จัดคอลัมน์ที่แสดง</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          เลือกหัวข้อจากข้อมูล Asset ทั้งหมดในฐานข้อมูล และใช้ปุ่มลูกศรเพื่อสลับตำแหน่งคอลัมน์
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="ค้นหาคอลัมน์..."
          value={columnSearch}
          onChange={(e) => setColumnSearch(e.target.value)}
          sx={{ mb: 1.5 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          {columnCategoryNames.map((cat) => {
            const fieldsInCat = columnConfig.filter((c) => COLUMN_CATEGORIES[c.field] === cat).map((c) => c.field);
            const allVisible = fieldsInCat.length > 0 && fieldsInCat.every((f) => columnConfig.find((c) => c.field === f)?.visible);
            return (
              <Chip
                key={cat}
                label={cat}
                size="small"
                variant={allVisible ? 'filled' : 'outlined'}
                color={allVisible ? 'primary' : 'default'}
                onClick={() => setColumnConfig((current) => current.map((c) => fieldsInCat.includes(c.field) ? { ...c, visible: !allVisible } : c))}
                sx={{ cursor: 'pointer', fontWeight: 600 }}
              />
            );
          })}
        </Box>
        <List dense disablePadding>
          {filteredColumnConfig.map((config) => {
            const index = columnConfig.findIndex((c) => c.field === config.field);
            return (
              <ListItem key={config.field} divider>
                <Checkbox
                  edge="start"
                  checked={config.visible}
                  onChange={() => toggleColumn(config.field)}
                  disabled={config.visible && visibleCount <= 1}
                />
                <ListItemText
                  primary={config.label}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Box component="span" sx={{
                        fontSize: '0.62rem', fontWeight: 700, px: 0.75, py: 0.1, borderRadius: 0.75,
                        bgcolor: alpha(theme.palette.text.secondary, 0.1), color: 'text.secondary',
                      }}>
                        {COLUMN_CATEGORIES[config.field] || 'อื่นๆ'}
                      </Box>
                      <span>{config.visible ? 'แสดงในตาราง' : 'ซ่อนจากตาราง'}</span>
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton aria-label="ย้ายขึ้น" size="small" onClick={() => moveColumn(config.field, 'up')} disabled={index === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton aria-label="ย้ายลง" size="small" onClick={() => moveColumn(config.field, 'down')} disabled={index === columnConfig.length - 1}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Button startIcon={<RestartAltIcon />} onClick={resetColumns}>คืนค่าเริ่มต้น</Button>
        <Button variant="contained" onClick={() => { onClose(); setColumnSearch(''); }}>เสร็จสิ้น</Button>
      </DialogActions>
    </Dialog>
  );
}
