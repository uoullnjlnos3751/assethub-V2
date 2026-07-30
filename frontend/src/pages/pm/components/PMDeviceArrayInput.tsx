import React, { useState, useEffect } from 'react';
import { pmAPI, assetAPI } from '../../../services/api';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import imageCompression from 'browser-image-compression';

interface PMDeviceData {
  _assetId?: number;
  assetCode?: string;
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

export const PMDeviceArrayInput: React.FC<PMDeviceArrayInputProps> = ({ type, value, onChange, parentAsset, readOnly = false }) => {
  const [devices, setDevices] = useState<PMDeviceData[]>([]);
  const [hasAny, setHasAny] = useState<'yes' | 'no' | null>(null);
  const [previewCodes, setPreviewCodes] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES);
  const [displayFormat, setDisplayFormat] = useState<string>('{AssetName} / {AssetCode}');

  const isPrinter = type === 'printer';
  const labelSingular = isPrinter ? 'เครื่องพิมพ์' : 'จอมอนิเตอร์';
  const labelHeader = isPrinter ? '📠 Printer เครื่องที่' : '🖥️ Monitor จอที่';
  const buttonAdd = isPrinter ? '+ เพิ่ม Printer ตัวต่อไป' : '+ เพิ่มจอ Monitor ตัวต่อไป';
  const buttonYes = isPrinter ? '✓ มีเครื่องพิมพ์' : '✓ มีจอมอนิเตอร์';
  const buttonNo = isPrinter ? '✗ ไม่มีเครื่องพิมพ์' : '✗ ไม่มีจอ';

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
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          className={`pmr-radio ${hasAny === 'yes' ? 'sel-yes' : ''}`}
          onClick={() => !readOnly && handleToggleYesNo('yes')}
          disabled={readOnly}
        >{buttonYes}</button>
        <button
          type="button"
          className={`pmr-radio ${hasAny === 'no' ? 'sel-no' : ''}`}
          onClick={() => !readOnly && handleToggleYesNo('no')}
          disabled={readOnly}
        >{buttonNo}</button>
      </div>

      {hasAny === 'yes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {devices.map((d, idx) => (
            <div key={idx} style={{ padding: 16, border: '1px solid #d2d2d7', borderRadius: 8, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{labelHeader} {idx + 1}</span>
                  {d.source === 'glpi' && (
                    <span style={{ background: '#def7ec', color: '#03543f', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🟢 จาก GLPI API</span>
                  )}
                  {d.source === 'itam' && (
                    <span style={{ background: '#e1effe', color: '#1e429f', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🔵 จาก ITAM DB (คลัง)</span>
                  )}
                  {d.source === 'history' && (
                    <span style={{ background: '#fef08a', color: '#713f12', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🟡 จากประวัติ PM</span>
                  )}
                </div>
                {!readOnly && idx > 0 && (
                  <button type="button" onClick={() => removeDevice(idx)} style={{ color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>ลบเครื่องนี้</button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Photo Upload */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {d.photoFilename ? (
                    <img src={resolveMediaUrl(`/uploads/pm/${d.photoFilename}`)} alt={labelSingular} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ccc' }} />
                  ) : (
                    <div style={{ width: 60, height: 60, background: '#f5f5f7', borderRadius: 6, border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</div>
                  )}
                  {!readOnly && (
                    <label className="pmr-btn pmr-btn-outline" style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer', display: 'inline-block' }}>
                      ถ่ายภาพหรืออัปโหลด
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handlePhotoUpload(idx, e.target.files[0]);
                        }
                      }} />
                    </label>
                  )}
                </div>

                {/* Fields */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#86868b', marginBottom: 4 }}>ชื่อทรัพย์สิน / รหัสทรัพย์สิน</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        disabled={readOnly} 
                        value={d._assetId ? (d.assetCode || '') : (d.assetCode !== undefined ? d.assetCode : (previewCodes[idx] || ''))} 
                        placeholder={previewCodes[idx] ? `${previewCodes[idx]} (รหัสระบบอัตโนมัติ)` : 'กำลังประมวลผล...'}
                        onChange={(e) => updateField(idx, 'assetCode', e.target.value)}
                        style={{ 
                          width: '100%', padding: '6px 10px', fontSize: 12, 
                          border: '1px solid #d2d2d7', borderRadius: 6, 
                          background: d._assetId ? '#f0fdf4' : '#fff', 
                          color: d._assetId ? '#15803d' : '#333', 
                          fontWeight: d._assetId ? 600 : 400 
                        }} 
                      />
                      {d._assetId ? (
                        <div style={{ fontSize: 10, color: '#15803d', marginTop: 4 }}>✅ เชื่อมโยงกับทรัพย์สินในระบบแล้ว (ลิงก์สำเร็จ)</div>
                      ) : (
                        <div style={{ fontSize: 10, color: '#86868b', marginTop: 4 }}>แสดงรหัสมาตรฐานอัตโนมัติ | พิมพ์เพื่อแก้ไขเองได้</div>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          updateField(idx, 'assetCode', previewCodes[idx] || '');
                        }}
                        style={{
                          padding: '0 8px', fontSize: 11, background: '#e0f2fe', color: '#0369a1',
                          border: '1px solid #bae6fd', borderRadius: 6, cursor: 'pointer',
                          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2
                        }}
                        title="ใช้รหัสมาตรฐานอัตโนมัติจากระบบ"
                      >
                        🔄 ใช้รหัสระบบ
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#86868b', marginBottom: 4 }}>บริษัท (Company)</label>
                  <select disabled={readOnly} value={d.company} onChange={e => updateField(idx, 'company', e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d2d2d7', borderRadius: 6 }}>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#86868b', marginBottom: 4 }}>Serial No. <span style={{ color: '#ff3b30' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" disabled={readOnly} placeholder="ระบุ Serial No. (จำเป็น)" value={d.serialNo} onChange={e => updateField(idx, 'serialNo', e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #d2d2d7', borderRadius: 6 }} />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleCheckSerial(idx, d.serialNo)}
                        style={{ padding: '0 8px', fontSize: 11, background: '#f5f5f7', border: '1px solid #d2d2d7', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                      >
                        🔍 เช็คประวัติ
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#86868b', marginBottom: 4 }}>ยี่ห้อ (Brand)</label>
                  <select disabled={readOnly} value={d.brand} onChange={e => updateField(idx, 'brand', e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d2d2d7', borderRadius: 6 }}>
                    <option value="">-- เลือกยี่ห้อ --</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {isPrinter && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#86868b', marginBottom: 4 }}>ประเภท (Printer Type)</label>
                    <select disabled={readOnly} value={d.printerType || ''} onChange={e => updateField(idx, 'printerType', e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d2d2d7', borderRadius: 6 }}>
                      <option value="">-- เลือกประเภท --</option>
                      {PRINTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: isPrinter ? 'span 1' : '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 10, color: '#86868b', marginBottom: 4 }}>รุ่น (Model)</label>
                  <input type="text" disabled={readOnly} placeholder="ระบุชื่อรุ่น" value={d.model} onChange={e => updateField(idx, 'model', e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d2d2d7', borderRadius: 6 }} />
                </div>

                {/* Readonly Info */}
                <div style={{ gridColumn: '1 / -1', background: '#f5f5f7', padding: '8px 12px', borderRadius: 6, fontSize: 11, color: '#555' }}>
                  <strong>ผู้ถือครอง:</strong> {parentAsset?.ownerName || '-'}{' '}
                  <strong>แผนก:</strong> {parentAsset?.departmentId || '-'}
                </div>

                {/* Monitor Specs from GLPI / DB if present */}
                {!isPrinter && (d.screenSize || d.ports || d.hasSpeaker) && (
                  <div style={{ gridColumn: '1 / -1', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 6, fontSize: 11, color: '#1e40af', marginTop: -4 }}>
                    <strong>🖥️ สเปคจอ:</strong>{' '}
                    {d.screenSize && <span style={{ marginRight: 8 }}>📐 ขนาด {d.screenSize}</span>}
                    {d.ports && <span style={{ marginRight: 8 }}>🔌 พอร์ต: {d.ports}</span>}
                    {d.hasSpeaker && <span>🔊 มีลำโพงในตัว</span>}
                  </div>
                )}

              </div>
            </div>
          ))}

          {!readOnly && (
            <button type="button" onClick={addDevice} style={{ padding: '8px', border: '1px dashed #d2d2d7', borderRadius: 8, background: '#fafafa', cursor: 'pointer', fontSize: 12, color: '#007aff', fontWeight: 500 }}>
              {buttonAdd}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
