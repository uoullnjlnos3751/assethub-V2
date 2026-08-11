import React, { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Select, MenuItem, InputLabel, FormControl,
  Typography, Avatar, Chip, alpha, useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { pmAPI, assetAPI } from '../../../services/api';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import imageCompression from 'browser-image-compression';

interface PMDeviceData {
  _assetId?: number;
  assetCode?: string;
  accountingCode?: string;
  hasMonitor?: boolean;
  hasPrinter?: boolean;
  company: string;
  brand: string;
  model: string;
  serialNo: string;
  printerType?: string;
  photoFilename?: string;
  source?: 'glpi' | 'itam' | 'history';
  screenSize?: string | null;
  ports?: string | null;
  hasSpeaker?: boolean;
}

interface PMDeviceArrayInputProps {
  type: 'monitor' | 'printer';
  value: string;
  onChange: (value: string) => void;
  parentAsset: any;
  readOnly?: boolean;
}

const MONITOR_BRANDS = ['Dell', 'HP', 'Lenovo', 'Samsung', 'LG', 'Acer', 'Asus', 'AOC', 'Philips', 'BenQ', 'Other'];
const PRINTER_BRANDS = ['HP', 'Epson', 'Canon', 'Brother', 'FujiXerox', 'Ricoh', 'Lexmark', 'OKI', 'Kyocera', 'Other'];
const PRINTER_TYPES = ['Laser', 'Inkjet', 'Dot Matrix', 'Thermal', 'Label', 'Other'];
const DEFAULT_COMPANIES = ['TRRHQ', 'TRR', 'TRRCORP', 'TRRT', 'PS', 'SSEC', 'TMI', 'TRM', 'TRRL', 'TRRP', 'TRW', 'TEG', 'TRRSK'];

const SOURCE_META: Record<string, { label: string; colorKey: 'success' | 'info' | 'warning' }> = {
  glpi: { label: '🟢 จาก GLPI API', colorKey: 'success' },
  itam: { label: '🔵 จาก ITAM DB (คลัง)', colorKey: 'info' },
  history: { label: '🟡 จากประวัติ PM', colorKey: 'warning' },
};

export const PMDeviceArrayInput: React.FC<PMDeviceArrayInputProps> = ({ type, value, onChange, parentAsset, readOnly = false }) => {
  const theme = useTheme();
  const [devices, setDevices] = useState<PMDeviceData[]>([]);
  const [hasAny, setHasAny] = useState<'yes' | 'no' | null>(null);
  const [previewCodes, setPreviewCodes] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES);
  const [displayFormat, setDisplayFormat] = useState<string>('{AssetName} / {AssetCode}');

  const isPrinter = type === 'printer';
  const labelSingular = isPrinter ? 'เครื่องพิมพ์' : 'จอมอนิเตอร์';
  const labelHeader = isPrinter ? '📠 Printer เครื่องที่' : '🖥️ Monitor จอที่';
  const buttonAdd = isPrinter ? '+ เพิ่ม Printer ตัวต่อไป' : '+ เพิ่มจอ Monitor ตัวต่อไป';
  const buttonYes = isPrinter ? 'มีเครื่องพิมพ์' : 'มีจอมอนิเตอร์';
  const buttonNo = isPrinter ? 'ไม่มีเครื่องพิมพ์' : 'ไม่มีจอ';

  const BRANDS = isPrinter ? PRINTER_BRANDS : MONITOR_BRANDS;

  useEffect(() => {
    assetAPI.companyOptions().then(res => {
      if (res.data && res.data.length > 0) {
        // Filter out long names (like Thai names) and keep only English alphanumeric acronyms
        const filtered = res.data.filter((c: string) => /^[A-Za-z0-9\s]+$/.test(c) && c.length <= 10);
        // Merge with DEFAULT_COMPANIES to ensure we always have the standard ones
        const combined = Array.from(new Set([...DEFAULT_COMPANIES, ...filtered]));
        setCompanies(combined);
      }
    }).catch(() => {});

    // Fetch display format setting
    pmAPI.getDisplayFormat?.()?.then((res: any) => {
      if (res.data && res.data.value) setDisplayFormat(res.data.value);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPreviews = async () => {
      const codes: string[] = [];
      let hasChanges = false;
      for (let i = 0; i < devices.length; i++) {
        const d = devices[i];
        const currentCode = previewCodes[i] || '';
        codes[i] = currentCode;
        if (!d._assetId && d.company) {
          const comp = d.company.toUpperCase().replace(/\s/g, '');
          const hasCorrectPrefix = currentCode && (
            isPrinter
              ? (
                  (comp === 'TRRHQ' || comp === 'TRR' ? currentCode.startsWith('TRRHQ-PR-') : false) ||
                  (comp === 'TRRCORP' ? currentCode.startsWith('TRRCORP-P') : false) ||
                  (comp === 'PS' ? currentCode.startsWith('PS-P') : false) ||
                  (comp === 'HQ-TRRT' || comp === 'TRRT' ? currentCode.startsWith('HQ-TRRT-P') : false) ||
                  currentCode.startsWith(`${comp}-P`)
                )
              : (
                  (comp === 'TRRHQ' || comp === 'TRR' ? currentCode.startsWith('TRRHQ-MO-') : false) ||
                  (comp === 'TRRCORP' ? currentCode.startsWith('TRRCORP-M') : false) ||
                  (comp === 'PS' ? currentCode.startsWith('PS-M') : false) ||
                  (comp === 'HQ-TRRT' || comp === 'TRRT' ? currentCode.startsWith('HQ-TRRT-M') : false) ||
                  currentCode.startsWith(`${comp}-M`)
                )
          );

          if (hasCorrectPrefix) {
            continue;
          }

          try {
            const res = isPrinter
              ? await pmAPI.previewPrinterCode(d.company, i)
              : await pmAPI.previewMonitorCode(d.company, i);
            if (res.data && res.data.code) {
              codes[i] = res.data.code;
              hasChanges = true;
            } else {
              codes[i] = isPrinter
                ? ((comp === 'TRRHQ' || comp === 'TRR') ? 'TRRHQ-PR-XXXX' : comp === 'TRRCORP' ? 'TRRCORP-PXXX' : comp === 'PS' ? 'PS-PXXX' : (comp === 'HQ-TRRT' || comp === 'TRRT') ? 'HQ-TRRT-PXXX' : `${comp}-PXXX`)
                : ((comp === 'TRRHQ' || comp === 'TRR') ? 'TRRHQ-MO-XXXX' : comp === 'TRRCORP' ? 'TRRCORP-MXXX' : comp === 'PS' ? 'PS-MXXX' : (comp === 'HQ-TRRT' || comp === 'TRRT') ? 'HQ-TRRT-MXXX' : `${comp}-MXXX`);
              hasChanges = true;
            }
          } catch(e) {
            console.error('previewCode error:', e);
            codes[i] = isPrinter
              ? ((comp === 'TRRHQ' || comp === 'TRR') ? 'TRRHQ-PR-XXXX' : comp === 'TRRCORP' ? 'TRRCORP-PXXX' : comp === 'PS' ? 'PS-PXXX' : (comp === 'HQ-TRRT' || comp === 'TRRT') ? 'HQ-TRRT-PXXX' : `${comp}-PXXX`)
              : ((comp === 'TRRHQ' || comp === 'TRR') ? 'TRRHQ-MO-XXXX' : comp === 'TRRCORP' ? 'TRRCORP-MXXX' : comp === 'PS' ? 'PS-MXXX' : (comp === 'HQ-TRRT' || comp === 'TRRT') ? 'HQ-TRRT-MXXX' : `${comp}-MXXX`);
            hasChanges = true;
          }
        } else {
          const expectedVal = d.assetCode || '';
          if (codes[i] !== expectedVal) {
            codes[i] = expectedVal;
            hasChanges = true;
          }
        }
      }
      const isDifferent = codes.length !== previewCodes.length || codes.some((val, idx) => val !== previewCodes[idx]);
      if (active && isDifferent) {
        setPreviewCodes(codes);
      }
    };
    fetchPreviews();
    return () => { active = false; };
  }, [devices, type]);

  useEffect(() => {
    try {
      if (value) {
        if (value === 'no') {
          setHasAny('no');
        } else {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = parsed.map((d: any) => ({
              ...d,
              serialNo: d.serialNo || d.serial || ''
            }));
            setDevices(mapped);
            setHasAny('yes');
          }
        }
      } else {
        setHasAny(null);
        setDevices([]);
      }
    } catch (e) {
      if (value === 'no') setHasAny('no');
    }
  }, [value]);

  const updateParent = (newDevices: PMDeviceData[]) => {
    setDevices(newDevices);
    onChange(JSON.stringify(newDevices));
  };

  const handleCheckSerial = async (index: number, serialNo: string) => {
    if (!serialNo || !serialNo.trim()) {
      alert('⚠️ กรุณากรอก Serial No. ก่อนกดยืนยันการเช็คประวัติ');
      return;
    }
    try {
      const res = await pmAPI.checkSerial(serialNo);
      if (res.data && res.data.found) {
        const asset = res.data.asset;
        const newD = [...devices];
        if (asset) {
          const namePart = asset.assetName || '';
          const codePart = asset.assetCode || '';

          let formatted = displayFormat
            .replace('{AssetName}', namePart)
            .replace('{AssetCode}', codePart);

          if (!namePart && codePart) formatted = codePart;
          else if (!namePart && !codePart) formatted = '';

          newD[index].assetCode = formatted.trim() === '/' ? '' : formatted;
          newD[index]._assetId = asset.id;
          if (asset.brand) newD[index].brand = asset.brand;
          if (asset.model) newD[index].model = asset.model;
          if (asset.monitorDetail) {
            newD[index].screenSize = asset.monitorDetail.screenSize;
            newD[index].ports = asset.monitorDetail.ports;
            newD[index].hasSpeaker = !!asset.monitorDetail.hasSpeaker;
          }
        }
        updateParent(newD);
        alert('✅ ค้นพบข้อมูลในระบบ เชื่อมโยงข้อมูลสำเร็จ!');
      } else {
        alert('❌ ไม่พบ Serial No. นี้ในระบบ');
      }
    } catch(e: any) {
      alert('❌ เกิดข้อผิดพลาดในการตรวจสอบ: ' + (e.response?.data?.error || e.message || String(e)));
    }
  };

  const handleToggleYesNo = (choice: 'yes' | 'no') => {
    setHasAny(choice);
    if (choice === 'yes') {
      if (devices.length === 0) {
        updateParent([{
          [isPrinter ? 'hasPrinter' : 'hasMonitor']: true,
          company: parentAsset?.company || 'TRR HQ',
          brand: '',
          model: '',
          serialNo: ''
        } as any]);
      } else {
        onChange(JSON.stringify(devices));
      }
    } else {
      onChange('no');
    }
  };

  const addDevice = () => {
    updateParent([...devices, {
      [isPrinter ? 'hasPrinter' : 'hasMonitor']: true,
      company: parentAsset?.company || 'TRR HQ',
      brand: '',
      model: '',
      serialNo: ''
    } as any]);
  };

  const removeDevice = (index: number) => {
    const newD = [...devices];
    newD.splice(index, 1);
    updateParent(newD);
    if (newD.length === 0) {
      setHasAny(null);
      onChange('');
    }
  };

  const updateField = (index: number, field: keyof PMDeviceData, val: any) => {
    const newD = [...devices];
    const item = { ...newD[index] };
    (item as any)[field] = val;

    // If the serialNo is modified, it's a different device! Clear _assetId and assetCode
    if (field === 'serialNo' && item._assetId) {
      delete item._assetId;
      delete item.assetCode;
      delete item.source;
    }

    // Allow user to edit assetCode without resetting the asset linkage
    if (field === 'assetCode') {
      item.assetCode = val;
    }

    newD[index] = item;
    updateParent(newD);
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    try {

      // Compress image before upload
      const options = {
        maxSizeMB: 0.5, // limit to ~500KB
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const formData = new FormData();
      formData.append('file', compressedFile, file.name);
      const res = await pmAPI.uploadTempFile(formData);
      updateField(index, 'photoFilename', res.data.filename);
    } catch (err) {
      console.error('Upload error', err);
      alert('อัปโหลดรูปภาพไม่สำเร็จ');
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5 }}>
        <Button
          variant={hasAny === 'yes' ? 'contained' : 'outlined'}
          color={hasAny === 'yes' ? 'success' : 'inherit'}
          size="small"
          startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          onClick={() => !readOnly && handleToggleYesNo('yes')}
          disabled={readOnly}
        >{buttonYes}</Button>
        <Button
          variant={hasAny === 'no' ? 'contained' : 'outlined'}
          color={hasAny === 'no' ? 'error' : 'inherit'}
          size="small"
          startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
          onClick={() => !readOnly && handleToggleYesNo('no')}
          disabled={readOnly}
        >{buttonNo}</Button>
      </Box>

      {hasAny === 'yes' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {devices.map((d, idx) => {
            const sourceMeta = d.source ? SOURCE_META[d.source] : null;
            return (
              <Box key={idx} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', bgcolor: theme.palette.background.paper }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: theme.palette.text.primary }}>{labelHeader} {idx + 1}</Typography>
                    {sourceMeta && (
                      <Chip
                        label={sourceMeta.label}
                        size="small"
                        sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: alpha(theme.palette[sourceMeta.colorKey].main, 0.12),
                          color: theme.palette[sourceMeta.colorKey].main,
                        }}
                      />
                    )}
                  </Box>
                  {!readOnly && idx > 0 && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                      onClick={() => removeDevice(idx)}
                      sx={{ minHeight: 'auto', py: 0.25 }}
                    >ลบเครื่องนี้</Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                  {/* Photo Upload */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {d.photoFilename ? (
                      <Avatar
                        variant="rounded"
                        src={resolveMediaUrl(`/uploads/pm/${d.photoFilename}`)}
                        alt={labelSingular}
                        sx={{ width: 60, height: 60, borderRadius: '8px', border: `1px solid ${theme.palette.divider}` }}
                      />
                    ) : (
                      <Box sx={{
                        width: 60, height: 60, bgcolor: theme.palette.action.hover, borderRadius: '8px',
                        border: `1px dashed ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <PhotoCameraIcon sx={{ color: theme.palette.text.disabled, fontSize: 22 }} />
                      </Box>
                    )}
                    {!readOnly && (
                      <Button component="label" size="small" variant="outlined" sx={{ fontSize: '0.75rem' }}>
                        ถ่ายภาพหรืออัปโหลด
                        <input type="file" accept="image/*" hidden onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handlePhotoUpload(idx, e.target.files[0]);
                          }
                        }} />
                      </Button>
                    )}
                  </Box>

                  {/* Fields */}
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary, mb: 0.5 }}>ชื่อทรัพย์สิน / รหัสทรัพย์สิน</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          disabled={readOnly}
                          value={d._assetId ? (d.assetCode || '') : (d.assetCode !== undefined ? d.assetCode : (previewCodes[idx] || ''))}
                          placeholder={previewCodes[idx] ? `${previewCodes[idx]} (รหัสระบบอัตโนมัติ)` : 'กำลังประมวลผล...'}
                          onChange={(e) => updateField(idx, 'assetCode', e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: d._assetId ? alpha(theme.palette.success.main, 0.08) : undefined,
                              color: d._assetId ? theme.palette.success.main : undefined,
                              fontWeight: d._assetId ? 600 : 400,
                            },
                          }}
                        />
                        {d._assetId ? (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.success.main }}>✅ เชื่อมโยงกับทรัพย์สินในระบบแล้ว (ลิงก์สำเร็จ)</Typography>
                        ) : (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.text.secondary }}>แสดงรหัสมาตรฐานอัตโนมัติ | พิมพ์เพื่อแก้ไขเองได้</Typography>
                        )}
                      </Box>
                      {!readOnly && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SyncIcon sx={{ fontSize: 14 }} />}
                          onClick={() => updateField(idx, 'assetCode', previewCodes[idx] || '')}
                          title="ใช้รหัสมาตรฐานอัตโนมัติจากระบบ"
                          sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap', px: 1 }}
                        >
                          ใช้รหัสระบบ
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary, mb: 0.5 }}>เลขครุภัณฑ์ (ฝ่ายบัญชี) — ถ้ามี</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      disabled={readOnly}
                      value={d.accountingCode || ''}
                      placeholder="กรอกถ้าเห็นป้ายเลขครุภัณฑ์ติดที่เครื่อง ไม่ทราบเว้นว่างไว้ได้"
                      onChange={(e) => updateField(idx, 'accountingCode', e.target.value)}
                    />
                  </Box>

                  <FormControl size="small" fullWidth disabled={readOnly}>
                    <InputLabel>บริษัท (Company)</InputLabel>
                    <Select label="บริษัท (Company)" value={d.company} onChange={e => updateField(idx, 'company', e.target.value)}>
                      {companies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary, mb: 0.5 }}>
                      Serial No. <Box component="span" sx={{ color: theme.palette.error.main }}>*</Box>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      <TextField
                        fullWidth
                        size="small"
                        disabled={readOnly}
                        placeholder="ระบุ Serial No. (จำเป็น)"
                        value={d.serialNo}
                        onChange={e => updateField(idx, 'serialNo', e.target.value)}
                      />
                      {!readOnly && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SearchIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleCheckSerial(idx, d.serialNo)}
                          sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap', px: 1 }}
                        >
                          เช็คประวัติ
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <FormControl size="small" fullWidth disabled={readOnly}>
                    <InputLabel>ยี่ห้อ (Brand)</InputLabel>
                    <Select label="ยี่ห้อ (Brand)" value={d.brand} onChange={e => updateField(idx, 'brand', e.target.value)}>
                      <MenuItem value="">-- เลือกยี่ห้อ --</MenuItem>
                      {BRANDS.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </Select>
                  </FormControl>

                  {isPrinter && (
                    <FormControl size="small" fullWidth disabled={readOnly}>
                      <InputLabel>ประเภท (Printer Type)</InputLabel>
                      <Select label="ประเภท (Printer Type)" value={d.printerType || ''} onChange={e => updateField(idx, 'printerType', e.target.value)}>
                        <MenuItem value="">-- เลือกประเภท --</MenuItem>
                        {PRINTER_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    fullWidth
                    size="small"
                    label="รุ่น (Model)"
                    disabled={readOnly}
                    placeholder="ระบุชื่อรุ่น"
                    value={d.model}
                    onChange={e => updateField(idx, 'model', e.target.value)}
                  />

                  {/* Readonly Info */}
                  <Box sx={{ bgcolor: theme.palette.action.hover, p: 1.25, borderRadius: '8px', fontSize: '0.7rem', color: theme.palette.text.secondary }}>
                    <Box component="strong" sx={{ color: theme.palette.text.primary }}>ผู้ถือครอง:</Box> {parentAsset?.ownerName || '-'}{' '}
                    <Box component="strong" sx={{ color: theme.palette.text.primary }}>แผนก:</Box> {parentAsset?.departmentId || '-'}
                  </Box>

                  {/* Monitor Specs from GLPI / DB if present */}
                  {!isPrinter && (d.screenSize || d.ports || d.hasSpeaker) && (
                    <Box sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                      p: 1.25, borderRadius: '8px', fontSize: '0.7rem', color: theme.palette.info.main,
                    }}>
                      <Box component="strong">🖥️ สเปคจอ:</Box>{' '}
                      {d.screenSize && <Box component="span" sx={{ mr: 1 }}>📐 ขนาด {d.screenSize}</Box>}
                      {d.ports && <Box component="span" sx={{ mr: 1 }}>🔌 พอร์ต: {d.ports}</Box>}
                      {d.hasSpeaker && <Box component="span">🔊 มีลำโพงในตัว</Box>}
                    </Box>
                  )}

                </Box>
              </Box>
            );
          })}

          {!readOnly && (
            <Button
              onClick={addDevice}
              variant="outlined"
              startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderStyle: 'dashed',
                py: 1,
                color: theme.palette.primary.main,
              }}
            >
              {buttonAdd}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};
