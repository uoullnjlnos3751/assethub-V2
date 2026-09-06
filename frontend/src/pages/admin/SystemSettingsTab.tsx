import React, { useEffect, useState } from 'react';
import { Grid, Typography, TextField, Button, CircularProgress, Box, Alert, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme } from '@mui/material';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SectionCard } from '../../components/SectionCard';

type PrefixConfig = {
  company: string;
  monitorPrefix: string;
  printerPrefix: string;
  padding: number;
};

export default function SystemSettingsTab() {
  const theme = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefixes, setPrefixes] = useState<PrefixConfig[]>([]);
  const [displayFormat, setDisplayFormat] = useState('{AssetName} / {AssetCode}');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      const settings = res.data;
      
      const prefixesSetting = settings.find((s: any) => s.key === 'COMPANY_PREFIXES');
      if (prefixesSetting && prefixesSetting.value) {
        try {
          const parsed = JSON.parse(prefixesSetting.value);
          const parsedArray: PrefixConfig[] = Object.keys(parsed).map(key => ({
            company: key,
            monitorPrefix: parsed[key].monitorPrefix || '',
            printerPrefix: parsed[key].printerPrefix || '',
            padding: parsed[key].padding || 4,
          }));
          setPrefixes(parsedArray);
        } catch (e) {
          console.error('Failed to parse COMPANY_PREFIXES', e);
        }
      }

      const format = settings.find((s: any) => s.key === 'PM_DISPLAY_FORMAT');
      if (format) setDisplayFormat(format.value);

    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convert array back to object
      const prefixesObject: Record<string, any> = {};
      let hasError = false;

      prefixes.forEach(p => {
        if (!p.company.trim()) {
          hasError = true;
          return;
        }
        prefixesObject[p.company.trim().toUpperCase()] = {
          monitorPrefix: p.monitorPrefix.trim(),
          printerPrefix: p.printerPrefix.trim(),
          padding: Number(p.padding) || 4
        };
      });

      if (hasError) {
        toast.error('กรุณาระบุชื่อบริษัทให้ครบถ้วน');
        setSaving(false);
        return;
      }

      await api.put('/settings', {
        settings: [
          { key: 'COMPANY_PREFIXES', value: JSON.stringify(prefixesObject, null, 2), group: 'ASSET_GENERATION', description: 'รูปแบบรหัสนำหน้าและจำนวนหลักตัวเลขสำหรับแต่ละบริษัท' },
          { key: 'PM_DISPLAY_FORMAT', value: displayFormat, group: 'ASSET_GENERATION', description: 'รูปแบบการแสดงผลรหัสทรัพย์สินในหน้าทำ PM' }
        ]
      });

      toast.success('บันทึกการตั้งค่าระบบเสร็จสิ้น');
    } catch (err: any) {
      toast.error(err.message || 'บันทึกล้มเหลว');
    } finally {
      setSaving(false);
    }
  };

  const addPrefixRow = () => {
    setPrefixes([...prefixes, { company: '', monitorPrefix: '', printerPrefix: '', padding: 4 }]);
  };

  const removePrefixRow = (index: number) => {
    const newPrefixes = [...prefixes];
    newPrefixes.splice(index, 1);
    setPrefixes(newPrefixes);
  };

  const updatePrefixRow = (index: number, field: keyof PrefixConfig, value: string | number) => {
    const newPrefixes = [...prefixes];
    newPrefixes[index] = { ...newPrefixes[index], [field]: value };
    setPrefixes(newPrefixes);
  };

  if (loading) {
    return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <SectionCard title="ตั้งค่ารหัสทรัพย์สินอัตโนมัติ (Asset Generation)" icon={Settings}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              ค่าเหล่านี้จะถูกใช้งานตอนทำ PM ตรวจเช็คเครื่องหรือปริ้นเตอร์ หากผู้ใช้เลือกบริษัท ระบบจะสร้างรหัสทรัพย์สินตาม Prefix ที่ตั้งไว้ด้านล่าง
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>รูปแบบการแสดงผลหน้า PM (PM Display Format)</Typography>
                <TextField 
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={displayFormat}
                  onChange={(e) => setDisplayFormat(e.target.value)}
                  helperText="คำที่อนุญาต: {AssetName}, {AssetCode}"
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>รูปแบบรหัสนำหน้าตามบริษัท (COMPANY_PREFIXES)</Typography>
                  <Button size="small" variant="outlined" startIcon={<Plus size={16} />} onClick={addPrefixRow}>
                    เพิ่มบริษัท
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>สาขา/บริษัท (เช่น TRRHQ)</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>คำนำหน้า Monitor</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>คำนำหน้า Printer</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 150 }}>จำนวนหลักตัวเลข</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 80, textAlign: 'center' }}>ลบ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prefixes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            ยังไม่มีข้อมูลการตั้งค่า กรุณากดปุ่มเพิ่มบริษัท
                          </TableCell>
                        </TableRow>
                      ) : (
                        prefixes.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <TextField 
                                size="small" 
                                fullWidth 
                                placeholder="TRRHQ" 
                                value={row.company} 
                                onChange={e => updatePrefixRow(index, 'company', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField 
                                size="small" 
                                fullWidth 
                                placeholder="TRRHQ-MO-" 
                                value={row.monitorPrefix} 
                                onChange={e => updatePrefixRow(index, 'monitorPrefix', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField 
                                size="small" 
                                fullWidth 
                                placeholder="TRRHQ-PR-" 
                                value={row.printerPrefix} 
                                onChange={e => updatePrefixRow(index, 'printerPrefix', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField 
                                size="small" 
                                fullWidth 
                                type="number"
                                inputProps={{ min: 1, max: 10 }}
                                value={row.padding} 
                                onChange={e => updatePrefixRow(index, 'padding', parseInt(e.target.value) || 4)}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton aria-label="ลบ" size="small" color="error" onClick={() => removePrefixRow(index)}>
                                <Trash2 size={18} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  * จำนวนหลักตัวเลข (Padding) คือจำนวนเลข 0 ที่จะเติมข้างหน้า เช่น ถ้าตั้ง 4 จะรันเป็น 0001, ถ้าตั้ง 3 จะรันเป็น 001
                </Typography>
              </Grid>
            </Grid>
        </SectionCard>
      </Grid>
    </Grid>
  );
}
