import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { assetAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────────────
   Types & constants
───────────────────────────────────────────────────────────────── */
const ORIGIN = window.location.origin;

type PaperSize = 'A4' | 'A5';
type StickerSize = 'S' | 'L';
type ColCount = 2 | 3 | 4;
type LabelStyle = 'default' | 'dark' | 'minimal';

interface Settings {
  paper: PaperSize;
  sticker: StickerSize;
  cols: ColCount;
  labelStyle: LabelStyle;
  showName: boolean;
  showCode: boolean;
  showOwner: boolean;
  showDept: boolean;
  showStatus: boolean;
  extraText: string;
  baseUrl: string;
  extraFields: string[];  // dynamic additional fields
}

const defaultSettings: Settings = {
  paper: 'A4',
  sticker: 'S',
  cols: 3,
  labelStyle: 'default',
  showName: true,
  showCode: true,
  showOwner: true,
  showDept: true,
  showStatus: true,
  extraText: 'สำนักงานใหญ่',
  baseUrl: `${ORIGIN}/assets/`,
  extraFields: [],
};

/* ─────────────────────────────────────────────────────────────────
   Available fields catalog (all asset fields that can be added)
───────────────────────────────────────────────────────────────── */
interface FieldDef {
  key: string;
  label: string;
  group: string;
  getter: (a: any) => string | null | undefined;
}

const AVAILABLE_FIELDS: FieldDef[] = [
  // ── ข้อมูลทั่วไป ─────────────────────────
  { key: 'serialNo',       label: 'Serial No.',      group: 'ทั่วไป',     getter: a => a.serialNo },
  { key: 'oldAssetCode',   label: 'รหัสเดิม',         group: 'ทั่วไป',     getter: a => a.oldAssetCode },
  { key: 'type',           label: 'ประเภท',           group: 'ทั่วไป',     getter: a => a.type },
  { key: 'brand',          label: 'ยี่ห้อ',            group: 'ทั่วไป',     getter: a => a.brand },
  { key: 'model',          label: 'รุ่น',              group: 'ทั่วไป',     getter: a => a.model },
  { key: 'company',        label: 'บริษัท',           group: 'ทั่วไป',     getter: a => a.company },
  // ── ตำแหน่ง ──────────────────────────────
  { key: 'location',       label: 'สถานที่',           group: 'ตำแหน่ง',   getter: a => a.location },
  { key: 'floor',          label: 'ชั้น',              group: 'ตำแหน่ง',   getter: a => a.floor },
  // ── การจัดซื้อ ────────────────────────────
  { key: 'vendor',         label: 'ผู้จัดจำหน่าย',    group: 'จัดซื้อ',   getter: a => a.vendor },
  { key: 'poNumber',       label: 'เลขที่ PO',         group: 'จัดซื้อ',   getter: a => a.poNumber },
  { key: 'purchaseDate',   label: 'วันที่ซื้อ',         group: 'จัดซื้อ',   getter: a => a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) : null },
  { key: 'warrantyEndDate',label: 'วันหมดประกัน',      group: 'จัดซื้อ',   getter: a => a.warrantyEndDate ? new Date(a.warrantyEndDate).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) : null },
  { key: 'budget',         label: 'งบประมาณ',         group: 'จัดซื้อ',   getter: a => a.budget },
  // ── สเปกคอมพิวเตอร์ ──────────────────────
  { key: 'cpu',            label: 'CPU',              group: 'สเปก IT',   getter: a => a.cpu },
  { key: 'ram',            label: 'RAM',              group: 'สเปก IT',   getter: a => a.ram },
  { key: 'osVersion',      label: 'OS Version',       group: 'สเปก IT',   getter: a => a.osVersion },
  { key: 'domainName',     label: 'Domain',           group: 'สเปก IT',   getter: a => a.domainName },
  { key: 'storage1',       label: 'Storage',          group: 'สเปก IT',   getter: a => a.storage1 },
  // ── หมายเหตุ ─────────────────────────────
  { key: 'remark',         label: 'หมายเหตุ',          group: 'อื่นๆ',     getter: a => a.remark },
];

/* ─────────────────────────────────────────────────────────────────
   FieldPicker component
───────────────────────────────────────────────────────────────── */
function FieldPicker({
  selected, onChange, isDark,
}: {
  selected: string[];
  onChange: (keys: string[]) => void;
  isDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  // Group by category
  const groups = AVAILABLE_FIELDS.reduce<Record<string, FieldDef[]>>((acc, f) => {
    if (search && !f.label.toLowerCase().includes(search.toLowerCase()) && !f.key.toLowerCase().includes(search.toLowerCase())) return acc;
    if (!acc[f.group]) acc[f.group] = [];
    acc[f.group].push(f);
    return acc;
  }, {});

  const selectedDefs = AVAILABLE_FIELDS.filter(f => selected.includes(f.key));

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Selected chips */}
      {selectedDefs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {selectedDefs.map(f => (
            <div key={f.key} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '99px',
              background: '#f0f9ff', border: '1px solid #bae6fd',
              fontSize: '11px', color: '#0369a1',
            }}>
              <span>{f.label}</span>
              <button
                onClick={() => toggle(f.key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7dd3fc', fontSize: '11px', padding: '0', lineHeight: 1 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          width: '100%', padding: '7px 12px', borderRadius: '8px',
          border: `1.5px dashed ${open ? '#0ea5e9' : '#cbd5e1'}`,
          background: open ? '#f0f9ff' : '#fafafa',
          color: open ? '#0369a1' : '#64748b',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Sarabun, sans-serif', transition: 'all .15s',
        }}
      >
        <span style={{ fontSize: '14px' }}>＋</span>
        เพิ่มฟิลด์ข้อมูล
        {selected.length > 0 && (
          <span style={{
            marginLeft: 'auto', background: '#0ea5e9', color: '#fff',
            fontSize: '10px', borderRadius: '99px', padding: '1px 7px', fontWeight: 700,
          }}>{selected.length}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 999,
          maxHeight: '280px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาฟิลด์..."
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px',
                padding: '5px 8px', fontSize: '11px', fontFamily: 'Sarabun, sans-serif',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Groups */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {Object.entries(groups).map(([group, fields]) => (
              <div key={group}>
                <div style={{
                  padding: '5px 10px 3px', fontSize: '9px', fontWeight: 700,
                  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em',
                  background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
                }}>{group}</div>
                {fields.map(f => {
                  const checked = selected.includes(f.key);
                  return (
                    <div
                      key={f.key}
                      onClick={() => toggle(f.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 10px', cursor: 'pointer',
                        background: checked ? '#f0f9ff' : '#fff',
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background .1s',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '4px',
                        border: `1.5px solid ${checked ? '#0ea5e9' : '#cbd5e1'}`,
                        background: checked ? '#0ea5e9' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all .15s',
                      }}>
                        {checked && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: '#334155', flex: 1 }}>{f.label}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{f.key}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {Object.keys(groups).length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>ไม่พบฟิลด์</div>
            )}
          </div>
          {/* Footer */}
          <div style={{
            borderTop: '1px solid #f1f5f9', padding: '6px 10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>เลือกแล้ว {selected.length} ฟิลด์</span>
            <button
              onClick={() => { onChange([]); setOpen(false); }}
              style={{
                fontSize: '10px', color: '#ef4444', background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
              }}
            >ล้างทั้งหมด</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sticker component (Layout A compact)
───────────────────────────────────────────────────────────────── */
function Sticker({ asset, settings, size }: { asset: any; settings: Settings; size: 'preview' | 'print' }) {
  const qrVal = `${settings.baseUrl}${asset.id}`;
  const name = [asset.brand, asset.model].filter(Boolean).join(' ') || asset.assetName || '—';
  const isDark = settings.labelStyle === 'dark';
  const isMinimal = settings.labelStyle === 'minimal';
  const isLarge = settings.sticker === 'L';

  const px = size === 'print' ? (
    isLarge ? {
      root: { width: '60mm', height: '30mm', fontSize: '9px' },
      qr: 68,
    } : {
      root: { width: '50mm', height: '19mm', fontSize: '7px' },
      qr: 42,
    }
  ) : (
    isLarge ? {
      root: { width: '240px', height: '120px', fontSize: '9.5px' },
      qr: 80,
    } : {
      root: { width: '160px', height: '80px', fontSize: '7.5px' },
      qr: 54,
    }
  );

  // Resolve extra fields for this asset
  const extraFieldDefs = (settings.extraFields || []).map(k => AVAILABLE_FIELDS.find(f => f.key === k)).filter(Boolean) as FieldDef[];

  const textColor = isDark ? '#cbd5e1' : '#374151';
  const dimColor  = isDark ? '#94a3b8' : '#6b7280';
  const codeColor = isDark ? '#e2e8f0' : '#0f172a';

  return (
    <div style={{
      ...px.root,
      border: isDark ? 'none' : '1px solid #d1d5db',
      borderRadius: '4px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#1e293b' : '#fff',
      fontFamily: 'Arial, sans-serif',
      flexShrink: 0,
      boxSizing: 'border-box',
      boxShadow: size === 'preview' ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
    }}>
      {/* Header */}
      <div style={{
        background: isDark ? '#0f172a' : '#0ea5e9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isLarge ? '3px 8px' : '1.5px 5px', flexShrink: 0,
      }}>
        <span style={{ fontSize: isLarge ? '9.5px' : '7px', fontWeight: 900, color: isDark ? '#38bdf8' : '#fff', letterSpacing: '0.05em' }}>IT</span>
        <span style={{ fontSize: isLarge ? '8px' : '6px', color: isDark ? '#94a3b8' : 'rgba(255,255,255,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isLarge ? '150px' : '90px' }}>
          {asset.company || 'TRR Group'}
        </span>
        {!isMinimal && (
          <span style={{ fontSize: isLarge ? '7.5px' : '5.5px', padding: isLarge ? '1px 6px' : '0.5px 4px', borderRadius: '99px', background: isDark ? '#1e40af' : 'rgba(255,255,255,.25)', color: isDark ? '#93c5fd' : '#fff', fontWeight: 700 }}>
            IT
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, padding: isLarge ? '6px 8px' : '3px 4px', gap: isLarge ? '8px' : '4px', overflow: 'hidden' }}>
        {/* QR */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QRCode value={qrVal} size={px.qr} level="M" fgColor={isDark ? '#e2e8f0' : '#000'} bgColor={isDark ? '#1e293b' : '#fff'} />
        </div>
        {/* Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: isLarge ? '3px' : '1.5px', overflow: 'hidden', minWidth: 0 }}>
          {/* ── Default fields ── */}
          {settings.showCode && (
            <div style={{ fontFamily: 'Courier New, monospace', fontSize: isLarge ? '11px' : '8.5px', fontWeight: 900, color: codeColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {asset.assetCode || '—'}
            </div>
          )}
          {settings.showName && (
            <div style={{ fontSize: isLarge ? '9px' : '7px', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name.length > 24 ? name.slice(0, 23) + '…' : name}
            </div>
          )}
          {settings.showOwner && asset.ownerName && (
            <div style={{ fontSize: isLarge ? '8px' : '6px', color: dimColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {asset.ownerName}
            </div>
          )}
          {settings.showDept && asset.departmentId && (
            <div style={{ fontSize: isLarge ? '8px' : '6px', color: dimColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🏢 {asset.departmentId}
            </div>
          )}
          {/* ── Extra dynamic fields ── */}
          {extraFieldDefs.map(f => {
            const val = f.getter(asset);
            if (!val) return null;
            return (
              <div key={f.key} style={{ fontSize: isLarge ? '8px' : '6px', color: dimColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', gap: '2px' }}>
                <span style={{ color: isDark ? '#64748b' : '#9ca3af', flexShrink: 0 }}>{f.label}:</span>
                <span>{String(val).length > 18 ? String(val).slice(0, 17) + '…' : val}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: isDark ? '#0f172a' : '#f8fafc',
        borderTop: isDark ? '0.5px solid #334155' : '0.5px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isLarge ? '3px 8px' : '1px 5px', flexShrink: 0,
      }}>
        <span style={{ fontSize: isLarge ? '7.5px' : '5.5px', color: isDark ? '#475569' : '#9ca3af' }}>IT Asset Mgmt</span>
        <span style={{ fontSize: isLarge ? '7.5px' : '5.5px', color: isDark ? '#475569' : '#9ca3af' }}>
          {settings.showStatus ? (asset.status || '') : ''}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Toggle switch
───────────────────────────────────────────────────────────────── */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: value ? '#0ea5e9' : '#d1d5db',
        position: 'relative', cursor: 'pointer',
        transition: 'background .2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '2px',
        left: value ? '18px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Card selector (paper / sticker / columns)
───────────────────────────────────────────────────────────────── */
function CardOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClick} style={{
      border: active ? '2px solid #0ea5e9' : '1.5px solid #e5e7eb',
      borderRadius: '8px', padding: '8px 6px', textAlign: 'center',
      cursor: 'pointer', background: active ? '#f0f9ff' : '#fff',
      transition: 'all .15s', flex: 1,
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PrintQRPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Asset list (all loaded)
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetPage, setAssetPage] = useState(1);
  const [assetTotal, setAssetTotal] = useState(0);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const PAGE_SIZE = 30;

  // Settings
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Derived
  const selectedAssets = allAssets.filter(a => selectedIds.includes(a.id));
  const sheetsNeeded = Math.ceil(selectedAssets.length / (settings.cols * (settings.paper === 'A4' ? 3 : 2)));

  /* Load assets */
  const loadAssets = useCallback((search: string, type: string, page: number) => {
    setLoadingAssets(true);
    const params: any = { search, limit: PAGE_SIZE, page };
    if (type) params.type = type;
    assetAPI.list(params)
      .then(res => {
        const items = res.data?.data || res.data?.items || [];
        const total = res.data?.total || res.data?.count || 0;
        setAllAssets(prev => page === 1 ? items : [...prev, ...items]);
        setAssetTotal(total);
      })
      .catch(() => { })
      .finally(() => setLoadingAssets(false));
  }, []);

  useEffect(() => {
    assetAPI.deviceTypes()
      .then(res => setDeviceTypes(res.data || []))
      .catch(() => {});
    loadAssets('', '', 1);
  }, [loadAssets]);

  // Pre-select from query params
  useEffect(() => {
    const ids = searchParams.get('ids');
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean);
      setSelectedIds(idList);
    }
  }, [searchParams]);

  const debounceRef = useRef<any>(null);
  const handleSearch = (val: string) => {
    setAssetSearch(val);
    setAssetPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadAssets(val, selectedType, 1), 400);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setAssetPage(1);
    loadAssets(assetSearch, type, 1);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const visibleIds = allAssets.map(a => a.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected
      ? prev.filter(id => !visibleIds.includes(id))
      : [...new Set([...prev, ...visibleIds])]
    );
  };

  const handlePrint = () => window.print();

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings(prev => ({ ...prev, [k]: v }));

  /* ── Sticker grid for preview ─ */
  const gridCols = settings.cols;

  return (
    <>
      <style>{`
        /* ─ Base ─ */
        .pqr { font-family: 'Sarabun', sans-serif; min-height: 100vh; background: #f1f5f9; display: flex; flex-direction: column; }

        /* ─ Topbar ─ */
        .pqr-top { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0 20px; height: 52px; display: flex; align-items: center; gap: 16px; flex-shrink: 0; z-index: 50; }
        .pqr-logo { display: flex; align-items: center; gap: 8px; }
        .pqr-logo-mark { width: 30px; height: 30px; background: #0ea5e9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 900; }
        .pqr-logo-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .pqr-logo-sub { font-size: 10px; color: #94a3b8; }
        .pqr-divider { width: 1px; height: 28px; background: #e2e8f0; }
        .pqr-page-title { font-size: 13px; font-weight: 600; color: #334155; }
        .pqr-breadcrumb { font-size: 11px; color: #94a3b8; }
        .pqr-spacer { flex: 1; }
        .pqr-stat { text-align: center; padding: 0 14px; border-right: 1px solid #f1f5f9; }
        .pqr-stat-val { font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1; }
        .pqr-stat-lbl { font-size: 10px; color: #94a3b8; margin-top: 1px; }
        .pqr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; font-family: 'Sarabun', sans-serif; transition: all .15s; white-space: nowrap; }
        .btn-dl { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .btn-dl:hover { background: #e2e8f0; }
        .btn-print-main { background: #0ea5e9; color: #fff; }
        .btn-print-main:hover { background: #0284c7; }
        .btn-print-main:disabled { opacity: .45; cursor: not-allowed; }

        /* ─ Body layout ─ */
        .pqr-body { display: flex; flex: 1; overflow: hidden; }

        /* ─ Left sidebar ─ */
        .pqr-left { width: 290px; min-width: 290px; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
        .pqr-section { border-bottom: 1px solid #f1f5f9; padding: 12px 16px; }
        .pqr-section-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }

        /* Asset selector */
        .asset-search { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; box-sizing: border-box; }
        .asset-search:focus { border-color: #0ea5e9; }
        .asset-list { overflow-y: auto; max-height: 200px; margin-top: 8px; border: 1px solid #f1f5f9; border-radius: 8px; }
        .asset-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer; border-bottom: 1px solid #f8fafc; transition: background .1s; }
        .asset-item:last-child { border-bottom: none; }
        .asset-item:hover { background: #f8fafc; }
        .asset-item.selected { background: #f0f9ff; }
        .asset-cb { width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
        .asset-cb.checked { background: #0ea5e9; border-color: #0ea5e9; }
        .asset-code { font-family: monospace; font-size: 10px; font-weight: 700; color: #0ea5e9; min-width: 58px; }
        .asset-name { font-size: 11px; color: #334155; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asset-dept { font-size: 10px; color: #94a3b8; }
        .sel-actions { display: flex; gap: 8px; margin-top: 8px; }
        .sel-btn { font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer; font-family: 'Sarabun', sans-serif; transition: all .1s; }
        .sel-btn:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
        .sel-btn.danger:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

        /* Settings scrollable */
        .pqr-settings-scroll { overflow-y: auto; flex: 1; }

        /* Card options */
        .card-options { display: flex; gap: 8px; }
        .card-opt { flex: 1; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 6px; text-align: center; cursor: pointer; background: #fff; transition: all .15s; }
        .card-opt.active { border-color: #0ea5e9; background: #f0f9ff; }
        .card-opt-icon { font-size: 18px; margin-bottom: 3px; }
        .card-opt-label { font-size: 10px; font-weight: 600; color: #334155; }
        .card-opt-sub { font-size: 9px; color: #94a3b8; margin-top: 1px; }

        /* Columns */
        .col-options { display: flex; gap: 8px; }
        .col-opt { flex: 1; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 4px; cursor: pointer; background: #fff; transition: all .15s; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .col-opt.active { border-color: #0ea5e9; background: #f0f9ff; }
        .col-dots { display: flex; gap: 2px; }
        .col-dot { width: 6px; height: 8px; border-radius: 1px; background: #cbd5e1; }
        .col-opt.active .col-dot { background: #0ea5e9; }
        .col-label { font-size: 10px; font-weight: 600; color: #64748b; }
        .col-opt.active .col-label { color: #0ea5e9; }

        /* Toggle row */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f8fafc; }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-lbl { font-size: 12px; color: #334155; }

        /* Select */
        .pqr-select { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; background: #fff; outline: none; color: #334155; }
        .pqr-select:focus { border-color: #0ea5e9; }

        /* Input */
        .pqr-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; box-sizing: border-box; color: #334155; }
        .pqr-input:focus { border-color: #0ea5e9; }

        /* ─ Right preview ─ */
        .pqr-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .pqr-preview-head { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .pqr-preview-title { font-size: 13px; font-weight: 600; color: #334155; }
        .pqr-preview-meta { display: flex; gap: 10px; align-items: center; }
        .meta-badge { font-size: 10px; padding: 3px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; font-weight: 500; }
        .meta-badge.dark { background: #0f172a; color: #38bdf8; border-color: #1e293b; }
        .meta-badge.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .pqr-preview-body { flex: 1; overflow-y: auto; padding: 20px; background: #f8fafc; }
        .preview-paper { background: #fff; margin: 0 auto; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.08); min-height: 300px; max-width: 700px; }
        .preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #94a3b8; gap: 8px; }
        .preview-empty-icon { font-size: 40px; }
        .sticker-grid-preview { display: grid; gap: 10px; }

        /* Bottom bar */
        .pqr-bottom { background: #fff; border-top: 1px solid #e2e8f0; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .pqr-hint { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
        .bottom-actions { display: flex; gap: 8px; }

        /* ─ Selected chips ─ */
        .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; max-height: 72px; overflow-y: auto; }
        .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 99px; background: #f0f9ff; border: 1px solid #bae6fd; font-size: 10px; color: #0369a1; }
        .chip-x { background: none; border: none; cursor: pointer; color: #7dd3fc; font-size: 11px; padding: 0; line-height: 1; }
        .chip-x:hover { color: #ef4444; }

        /* ─ Load more ─ */
        .load-more { text-align: center; padding: 8px; font-size: 11px; color: #0ea5e9; cursor: pointer; border-top: 1px solid #f1f5f9; }
        .load-more:hover { background: #f0f9ff; }

        .print-only-grid { display: none !important; }

        /* ─ PRINT ─ */
        @media print {
          /* ① Force color output */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* ② Hide EVERYTHING in the whole page (including Layout sidebar/topbar) */
          body * { visibility: hidden !important; }

          /* ③ Show ONLY the sticker zone and its children */
          #print-zone,
          #print-zone * { visibility: visible !important; }

          /* ④ Place the zone at top-left filling the page */
          #print-zone {
            visibility: visible !important;
            display: grid !important;
            grid-template-columns: repeat(${gridCols}, 1fr) !important;
            gap: 4mm !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: #fff !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
          }

          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="pqr">

        {/* ── TOP BAR ─────────────────────────────────────────── */}
        <div className="pqr-top">
          {/* Logo */}
          <div className="pqr-logo">
            <div className="pqr-logo-mark">QR</div>
            <div>
              <div className="pqr-logo-name">AssetQR</div>
              <div className="pqr-logo-sub">ระบบพิมพ์สติ๊กเกอร์</div>
            </div>
          </div>

          <div className="pqr-divider" />

          <div>
            <div className="pqr-page-title">พิมพ์ QR Code</div>
            <div className="pqr-breadcrumb">ทรัพย์สิน › พิมพ์ Layout › Print / Download PDF</div>
          </div>

          <div className="pqr-spacer" />

          {/* Stats */}
          <div className="pqr-stat">
            <div className="pqr-stat-val">{selectedIds.length}</div>
            <div className="pqr-stat-lbl">รายการ</div>
          </div>
          <div className="pqr-stat">
            <div className="pqr-stat-val">{sheetsNeeded || 1}</div>
            <div className="pqr-stat-lbl">แผ่นกระดาษ</div>
          </div>
          <div className="pqr-stat" style={{ borderRight: 'none' }}>
            <div className="pqr-stat-val">{selectedIds.length}</div>
            <div className="pqr-stat-lbl">Label ทั้งหมด</div>
          </div>

          <div className="pqr-divider" />

          {/* Actions */}
          <button className="pqr-btn btn-dl" onClick={() => navigate('/assets')}>
            ← กลับ
          </button>
          <button
            className="pqr-btn btn-print-main"
            onClick={handlePrint}
            disabled={selectedIds.length === 0}
          >
            🖨 ส่งพิมพ์
          </button>
        </div>

        {/* ── BODY ────────────────────────────────────────────── */}
        <div className="pqr-body">

          {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
          <div className="pqr-left">

            {/* ─ Asset selector ─ */}
            <div className="pqr-section">
              <div className="pqr-section-title">📦 เลือกรายการอุปกรณ์</div>

              {/* เลือกตามประเภทอุปกรณ์ */}
              <div style={{ marginBottom: '8px' }}>
                <select
                  className="pqr-select"
                  value={selectedType}
                  onChange={e => handleTypeChange(e.target.value)}
                  style={{ fontWeight: 600, borderColor: '#cbd5e1' }}
                >
                  <option value="">📁 ทุกประเภทอุปกรณ์ (All Types)</option>
                  {deviceTypes.map(t => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <input
                className="asset-search"
                placeholder="🔍 ค้นหาจากรหัส, ชื่อ, S/N..."
                value={assetSearch}
                onChange={e => handleSearch(e.target.value)}
              />

              {/* Select all / clear */}
              <div className="sel-actions">
                <button className="sel-btn" onClick={toggleAll}>
                  {allAssets.every(a => selectedIds.includes(a.id)) ? '✕ ยกเลิกทั้งหมด' : '✓ เลือกทั้งหมด'}
                </button>
                <button className="sel-btn danger" onClick={() => setSelectedIds([])}>ล้าง</button>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto', alignSelf: 'center' }}>
                  {selectedIds.length}/{assetTotal}
                </span>
              </div>

              {/* Asset list */}
              <div className="asset-list">
                {loadingAssets && allAssets.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>กำลังโหลด...</div>
                ) : allAssets.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>ไม่พบรายการ</div>
                ) : (
                  <>
                    {allAssets.map(asset => {
                      const checked = selectedIds.includes(asset.id);
                      return (
                        <div
                          key={asset.id}
                          className={`asset-item${checked ? ' selected' : ''}`}
                          onClick={() => toggleSelect(asset.id)}
                        >
                          <div className={`asset-cb${checked ? ' checked' : ''}`}>
                            {checked && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900 }}>✓</span>}
                          </div>
                          <div className="asset-code">{asset.assetCode}</div>
                          <div className="asset-name">
                            {[asset.brand, asset.model].filter(Boolean).join(' ') || asset.assetName || '—'}
                          </div>
                          <div className="asset-dept">{asset.departmentId || ''}</div>
                        </div>
                      );
                    })}
                    {allAssets.length < assetTotal && (
                      <div
                        className="load-more"
                        onClick={() => {
                          const next = assetPage + 1;
                          setAssetPage(next);
                          loadAssets(assetSearch, selectedType, next);
                        }}
                      >
                        {loadingAssets ? 'กำลังโหลด...' : `โหลดเพิ่ม (${assetTotal - allAssets.length} รายการ)`}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Selected chips */}
              {selectedIds.length > 0 && (
                <div className="chip-list">
                  {selectedAssets.slice(0, 12).map(a => (
                    <div key={a.id} className="chip">
                      <span>{a.assetCode}</span>
                      <button className="chip-x" onClick={e => { e.stopPropagation(); toggleSelect(a.id); }}>✕</button>
                    </div>
                  ))}
                  {selectedAssets.length > 12 && (
                    <div className="chip" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }}>
                      +{selectedAssets.length - 12} รายการ
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─ Settings (scrollable) ─ */}
            <div className="pqr-settings-scroll">

              {/* Paper size */}
              <div className="pqr-section">
                <div className="pqr-section-title">📄 ขนาดกระดาษ</div>
                <div className="card-options">
                  {(['A4', 'A5'] as PaperSize[]).map(p => (
                    <div key={p} className={`card-opt${settings.paper === p ? ' active' : ''}`} onClick={() => set('paper', p)}>
                      <div className="card-opt-icon">{p === 'A4' ? '📋' : '📄'}</div>
                      <div className="card-opt-label">{p}</div>
                      <div className="card-opt-sub">{p === 'A4' ? '210×297mm' : '148×210mm'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticker size */}
              <div className="pqr-section">
                <div className="pqr-section-title">🏷️ ขนาดสติ๊กเกอร์</div>
                <div className="card-options">
                  <div className={`card-opt${settings.sticker === 'S' ? ' active' : ''}`} onClick={() => set('sticker', 'S')}>
                    <div className="card-opt-icon">🔖</div>
                    <div className="card-opt-label">สติ๊กเกอร์ S</div>
                    <div className="card-opt-sub">50×19mm</div>
                  </div>
                  <div className={`card-opt${settings.sticker === 'L' ? ' active' : ''}`} onClick={() => set('sticker', 'L')}>
                    <div className="card-opt-icon">🏷️</div>
                    <div className="card-opt-label">สติ๊กเกอร์ L</div>
                    <div className="card-opt-sub">60×30mm</div>
                  </div>
                </div>
              </div>

              {/* Columns */}
              <div className="pqr-section">
                <div className="pqr-section-title">⚏ จำนวนคอลัมน์</div>
                <div className="col-options">
                  {([2, 3, 4] as ColCount[]).map(c => (
                    <div key={c} className={`col-opt${settings.cols === c ? ' active' : ''}`} onClick={() => set('cols', c)}>
                      <div className="col-dots">
                        {Array(c).fill(0).map((_, i) => <div key={i} className="col-dot" />)}
                      </div>
                      <div className="col-label">{c} คอลัมน์</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Label style */}
              <div className="pqr-section">
                <div className="pqr-section-title">🎨 สไตล์ Label</div>
                <select className="pqr-select" value={settings.labelStyle} onChange={e => set('labelStyle', e.target.value as LabelStyle)}>
                  <option value="default">แบบขาว (QR + สีฟ้า)</option>
                  <option value="dark">แบบมืด (Dark Label)</option>
                  <option value="minimal">แบบเรียบ (Minimal)</option>
                </select>
              </div>

              {/* Field toggles */}
              <div className="pqr-section">
                <div className="pqr-section-title">📋 ข้อมูลที่แสดงบน Label</div>
                {[
                  { key: 'showCode',   label: 'รหัสอุปกรณ์',         desc: 'assetCode' },
                  { key: 'showName',   label: 'ชื่ออุปกรณ์',          desc: 'brand + model' },
                  { key: 'showOwner',  label: 'ชื่อผู้ดูแลทรัพย์สิน', desc: 'ownerName' },
                  { key: 'showDept',   label: 'หน่วยงาน',             desc: 'departmentId' },
                  { key: 'showStatus', label: 'สถานะ',                desc: 'status' },
                ].map(f => (
                  <div key={f.key} className="toggle-row">
                    <div>
                      <div className="toggle-lbl">{f.label}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>{f.desc}</div>
                    </div>
                    <Toggle
                      value={settings[f.key as keyof Settings] as boolean}
                      onChange={v => set(f.key as keyof Settings, v)}
                    />
                  </div>
                ))}
              </div>

              {/* Extra dynamic fields */}
              <div className="pqr-section">
                <div className="pqr-section-title" style={{ marginBottom: '10px' }}>➕ เพิ่มฟิลด์ข้อมูล</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>
                  เลือกฟิลด์เพิ่มเติมจาก {AVAILABLE_FIELDS.length} ฟิลด์ที่มี
                </div>
                <FieldPicker
                  selected={settings.extraFields ?? []}
                  onChange={keys => set('extraFields', keys)}
                />
                {(settings.extraFields?.length ?? 0) > 0 && (
                  <div style={{ marginTop: '8px', padding: '6px 8px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '10px', color: '#92400e' }}>
                    ⚠️ สติ๊กเกอร์ขนาดเล็กรองรับได้ ~4 บรรทัด ฟิลด์เกินจะถูกซ่อน
                  </div>
                )}
              </div>

              {/* Extra text */}
              <div className="pqr-section">
                <div className="pqr-section-title">✏️ ข้อความเพิ่ม</div>
                <input
                  className="pqr-input"
                  placeholder="สำนักงานใหญ่"
                  value={settings.extraText}
                  onChange={e => set('extraText', e.target.value)}
                />
              </div>

              {/* Base URL */}
              <div className="pqr-section">
                <div className="pqr-section-title">🔗 Base URL สำหรับ QR</div>
                <input
                  className="pqr-input"
                  placeholder={`${ORIGIN}/assets/`}
                  value={settings.baseUrl}
                  onChange={e => set('baseUrl', e.target.value)}
                />
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '5px' }}>
                  QR จะเป็น: {settings.baseUrl}{'{id}'}
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT PREVIEW ─────────────────────────────────── */}
          <div className="pqr-right">

            {/* Preview header */}
            <div className="pqr-preview-head">
              <div>
                <div className="pqr-preview-title">👁 ตัวอย่างก่อนพิมพ์</div>
              </div>
              <div className="pqr-preview-meta">
                <span className="meta-badge">{settings.paper}</span>
                <span className="meta-badge">{settings.cols} คอลัมน์</span>
                <span className="meta-badge">{selectedIds.length} Labels</span>
                <span className={`meta-badge${settings.labelStyle === 'dark' ? ' dark' : settings.labelStyle === 'minimal' ? '' : ' blue'}`}>
                  {settings.labelStyle === 'dark' ? '🌙 Dark Label' : settings.labelStyle === 'minimal' ? '⬜ Minimal' : '☀️ Default'}
                </span>
                <span className="meta-badge">100%</span>

                {/* Select all / clear shortcut */}
                <button className="sel-btn" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={toggleAll}>
                  เลือกทั้งหมด
                </button>
                <button className="sel-btn danger" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => setSelectedIds([])}>
                  ล้าง
                </button>
              </div>
            </div>

            {/* Preview body */}
            <div className="pqr-preview-body">
              <div className="preview-paper">
                {selectedAssets.length === 0 ? (
                  <div className="preview-empty">
                    <div className="preview-empty-icon">🖨️</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ยังไม่ได้เลือกรายการ</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>เลือกอุปกรณ์จากแผงด้านซ้ายเพื่อดูตัวอย่าง</div>
                  </div>
                ) : (
                  <>
                    {/* Screen-only Preview grid */}
                    <div
                      className="sticker-grid-preview"
                      style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                    >
                      {selectedAssets.map(asset => (
                        <Sticker key={`prev-${asset.id}`} asset={asset} settings={settings} size="preview" />
                      ))}
                    </div>

                    {/* Hidden print-only grid (uses exact mm sizes) */}
                    <div
                      id="print-zone"
                      className="print-only-grid"
                    >
                      {selectedAssets.map(asset => (
                        <Sticker key={`print-${asset.id}`} asset={asset} settings={settings} size="print" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="pqr-bottom">
              <div className="pqr-hint">
                📌 คลิก Label เพื่อดูรายละเอียด
                &nbsp;·&nbsp;
                <span style={{ color: '#0ea5e9', cursor: 'pointer' }} onClick={() => navigate('/assets')}>ไปที่รายการอุปกรณ์</span>
              </div>
              <div className="bottom-actions">
                <button className="pqr-btn btn-dl" disabled style={{ opacity: .5 }}>📸 PNG</button>
                <button className="pqr-btn btn-dl" disabled style={{ opacity: .5 }}>📄 PDF</button>
                <button
                  className="pqr-btn btn-print-main"
                  onClick={handlePrint}
                  disabled={selectedIds.length === 0}
                >
                  🖨 พิมพ์ ({selectedIds.length} ดวง)
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
