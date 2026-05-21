import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import ImportAssetsButton from '../../components/ImportAssetsButton';
import { assetAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────────────
   Export columns (unchanged from original)
───────────────────────────────────────────────────────────────── */
const exportColumns = [
  ['assetCode', 'รหัสทรัพย์สิน'],
  ['serialNo', 'Serial Number'],
  ['type', 'ประเภทอุปกรณ์'],
  ['brand', 'ยี่ห้อ (Brand)'],
  ['model', 'รุ่น (Model)'],
  ['company', 'Company'],
  ['oldAssetCode', 'Computer Name เดิม'],
  ['ownerName', 'ผู้ถือครอง'],
  ['departmentId', 'แผนก'],
  ['location', 'Location'],
  ['floor', 'Floor'],
  ['status', 'สถานะ'],
  ['domainName', 'Domain Name'],
  ['osType', 'OS'],
  ['osVersion', 'Windows'],
  ['officeLicense', 'MS Office'],
  ['antivirusStatus', 'Antivirus'],
  ['cpu', 'CPU'],
  ['cpuGeneration', 'Generation'],
  ['gpu', 'GPU'],
  ['ram', 'RAM'],
  ['ramSlot1', 'RAM Slot1'],
  ['ramSlot2', 'RAM Slot2'],
  ['storage1', 'Storage 1'],
  ['storage2', 'Storage 2'],
  ['prNumber', 'PR No.'],
  ['budget', 'งบประมาณ'],
  ['poDate', 'PO Date'],
  ['poNumber', 'PO No.'],
  ['vendor', 'Vendor'],
  ['purchaseDate', 'วันที่ซื้อ'],
  ['age', 'อายุ (ปี)'],
  ['remark', 'หมายเหตุ'],
] as const;

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().split('T')[0];
};

const buildRows = (assets: any[]) => assets.map((asset) => {
  const row: Record<string, any> = {};
  exportColumns.forEach(([field, label]) => {
    row[label] = field === 'purchaseDate' || field === 'poDate' ? formatDate(asset[field]) : asset[field] ?? '';
  });
  return row;
});

const writeWorkbook = (sheetsData: Record<string, Record<string, any>[]>, fileName: string) => {
  const wb = XLSX.utils.book_new();
  const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyRow]);
    ws['!cols'] = exportColumns.map(([, label]) => ({ wch: Math.max(label.length + 4, 14) }));
    let safeName = sheetName.replace(/[\\/*?:[\]]/g, '').substring(0, 31);
    if (!safeName) safeName = 'Sheet';
    let finalName = safeName;
    let counter = 1;
    while (wb.SheetNames.includes(finalName)) {
      finalName = `${safeName.substring(0, 28)}_${counter}`;
      counter++;
    }
    XLSX.utils.book_append_sheet(wb, ws, finalName);
  }
  XLSX.writeFile(wb, fileName);
};

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */
function ActionCard({
  icon, color, title, desc, children, badge,
}: {
  icon: string; color: string; title: string; desc: string;
  children: React.ReactNode; badge?: string;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Card header stripe */}
      <div style={{ height: '4px', background: color }} />
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: `${color}18`, border: `1.5px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{title}</span>
              {badge && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 7px',
                  borderRadius: '99px', background: `${color}18`, color,
                }}>{badge}</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
        {/* Actions */}
        <div style={{ marginTop: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, disabled, variant = 'outline', color = '#0ea5e9',
}: {
  icon: string; label: string; onClick: () => void;
  disabled?: boolean; variant?: 'solid' | 'outline'; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Sarabun, sans-serif', fontSize: '12px', fontWeight: 600,
        opacity: disabled ? 0.55 : 1, transition: 'all .15s',
        ...(variant === 'solid'
          ? { background: color, border: `1px solid ${color}`, color: '#fff' }
          : { background: '#fff', border: `1px solid #e2e8f0`, color: '#475569' }),
      }}
      onMouseEnter={e => {
        if (!disabled) {
          if (variant === 'solid') { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)'; }
          else { (e.currentTarget as HTMLButtonElement).style.borderColor = color; (e.currentTarget as HTMLButtonElement).style.color = color; }
        }
      }}
      onMouseLeave={e => {
        if (variant === 'solid') { (e.currentTarget as HTMLButtonElement).style.filter = ''; }
        else { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────── */
export default function ImportExportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAllAssets = async () => {
    const res = await assetAPI.list({ limit: 10000 });
    return res.data.data || [];
  };

  const exportExcel = async () => {
    setLoading(true); setError(''); setProgress('กำลังดึงข้อมูลทรัพย์สิน...');
    try {
      const assets = await fetchAllAssets();
      setProgress(`กำลัง build ${assets.length} รายการ...`);
      const rows = buildRows(assets);
      const sheetsData: Record<string, Record<string, any>[]> = {};
      rows.forEach((row, index) => {
        const type = assets[index].type || 'Other';
        if (!sheetsData[type]) sheetsData[type] = [];
        sheetsData[type].push(row);
      });
      if (Object.keys(sheetsData).length === 0) sheetsData['Assets'] = [];
      writeWorkbook(sheetsData, `assets-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast(`✅ ส่งออก Excel สำเร็จ ${assets.length} รายการ`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setLoading(false); setProgress('');
    }
  };

  const exportCsv = async () => {
    setLoading(true); setError(''); setProgress('กำลัง export CSV...');
    try {
      const assets = await fetchAllAssets();
      const rows = buildRows(assets);
      const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyRow]);
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', blankrows: false });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✅ ส่งออก CSV สำเร็จ ${assets.length} รายการ`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setLoading(false); setProgress('');
    }
  };

  const downloadTemplate = async () => {
    setLoading(true); setError('');
    try {
      const res = await assetAPI.deviceTypes();
      const types = res.data.map((t: any) => t.name);
      if (types.length === 0) types.push('Computer', 'Monitor');
      const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
      const sheetsData: Record<string, Record<string, any>[]> = {};
      types.forEach((type: string) => {
        sheetsData[type] = [{ ...emptyRow, 'ประเภทอุปกรณ์': type }];
      });
      writeWorkbook(sheetsData, 'asset-import-template.xlsx');
      showToast('✅ ดาวน์โหลด Template สำเร็จ');
    } catch {
      setError('ไม่สามารถดาวน์โหลด Template ได้');
    } finally {
      setLoading(false);
    }
  };

  const totalCols = exportColumns.length;

  return (
    <>
      <style>{`
        .iep-root { font-family: 'Sarabun', sans-serif; }
        .iep-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; z-index: 9999;
          box-shadow: 0 8px 24px rgba(0,0,0,.2); pointer-events: none;
          animation: iepFadeUp .2s ease; }
        @keyframes iepFadeUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .iep-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .iep-col-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
          background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 5px;
          font-size: 10px; color: #475569; font-family: monospace; }
      `}</style>

      <div className="iep-root">
        {/* ── Page header ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#f0f9ff', border: '1.5px solid #bae6fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>📊</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>นำเข้า / ส่งออก (Import / Export)</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>ศูนย์รวมการนำเข้าและส่งออกข้อมูลทะเบียนทรัพย์สินทั้งหมด</div>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
            padding: '10px 14px', fontSize: '12px', color: '#dc2626', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {/* ── Progress ── */}
        {progress && (
          <div style={{
            background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px',
            padding: '10px 14px', fontSize: '12px', color: '#0369a1', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> {progress}
          </div>
        )}

        {/* ── 3-column action cards ── */}
        <div className="iep-grid" style={{ marginBottom: '24px' }}>

          {/* Import */}
          <ActionCard
            icon="📥" color="#0ea5e9"
            title="นำเข้าทรัพย์สิน"
            badge="IMPORT"
            desc="รองรับไฟล์ Excel (.xlsx) และ CSV เพื่อนำเข้าข้อมูลทรัพย์สินหลายรายการพร้อมกัน"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <ImportAssetsButton />
              <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                💡 ใช้ Template ด้านขวาเพื่อเตรียมข้อมูลให้ถูกต้อง
              </div>
            </div>
          </ActionCard>

          {/* Export */}
          <ActionCard
            icon="📤" color="#10b981"
            title="ส่งออกข้อมูลทั้งหมด"
            badge="EXPORT"
            desc={`ส่งออกข้อมูลทรัพย์สินครบ ${totalCols} ฟิลด์ แยก Sheet ตามประเภทอุปกรณ์ สำหรับรายงานหรือสำรองข้อมูล`}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <ActionBtn
                icon="📊" label="Excel (.xlsx)"
                variant="solid" color="#10b981"
                onClick={exportExcel} disabled={loading}
              />
              <ActionBtn
                icon="📄" label="CSV"
                onClick={exportCsv} disabled={loading}
              />
            </div>
          </ActionCard>

          {/* Template */}
          <ActionCard
            icon="📋" color="#8b5cf6"
            title="Template นำเข้า"
            badge="TEMPLATE"
            desc="ดาวน์โหลดแบบฟอร์มคอลัมน์มาตรฐานพร้อม Sheet แยกตามประเภทอุปกรณ์ที่มีในระบบ"
          >
            <ActionBtn
              icon="⬇️" label="ดาวน์โหลด Template"
              variant="solid" color="#8b5cf6"
              onClick={downloadTemplate} disabled={loading}
            />
          </ActionCard>
        </div>

        {/* ── Columns reference table ── */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden',
        }}>
          <div style={{
            background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '14px' }}>📑</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>คอลัมน์ที่รองรับในการนำเข้า/ส่งออก</span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 9px',
              borderRadius: '99px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
            }}>{totalCols} คอลัมน์</span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {exportColumns.map(([field, label]) => (
                <div key={field} className="iep-col-tag" title={`field: ${field}`}>
                  <span style={{ color: '#94a3b8' }}>{field}</span>
                  <span style={{ color: '#cbd5e1' }}>→</span>
                  <span style={{ color: '#334155', fontFamily: 'Sarabun, sans-serif' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            background: '#fefce8', borderTop: '1px solid #fde68a',
            padding: '10px 16px', fontSize: '11px', color: '#92400e',
            display: 'flex', alignItems: 'flex-start', gap: '6px',
          }}>
            <span>⚠️</span>
            <div>
              <strong>หมายเหตุ:</strong> ไฟล์ที่นำเข้าต้องมีคอลัมน์ <code style={{ background: '#fef9c3', padding: '1px 5px', borderRadius: '4px' }}>รหัสทรัพย์สิน</code> เสมอ
              · ข้อมูลที่มีรหัสซ้ำจะถูก<strong>อัปเดต</strong> ข้อมูลที่ไม่มีรหัสจะถูก<strong>สร้างใหม่</strong>
              · วันที่ให้ใช้รูปแบบ YYYY-MM-DD
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="iep-toast">{toast}</div>}
    </>
  );
}
