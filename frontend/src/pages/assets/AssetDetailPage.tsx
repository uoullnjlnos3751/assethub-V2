import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Accordion, AccordionSummary, AccordionDetails, CircularProgress, Card, CardContent, Chip, Typography, alpha } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QRCode from 'react-qr-code';
import { assetAPI } from '../../services/api';

/* ─── Status helpers ──────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  Available: 'พร้อมใช้งาน', Borrowed: 'กำลังยืม', InUse: 'ใช้งานประจำ',
  Maintenance: 'ซ่อมบำรุง', Retired: 'ปลดระวาง', Lost: 'สูญหาย',
};
const STATUS_CLASS: Record<string, string> = {
  Available: 'p-ok', Borrowed: 'p-warn', InUse: 'p-purple',
  Maintenance: 'p-warn', Retired: 'p-gray', Lost: 'p-err',
};

const HISTORY_LABEL: Record<string, string> = {
  CREATE: 'เพิ่มทรัพย์สินเข้าระบบ', STATUS_CHANGE: 'เปลี่ยนสถานะ',
  OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง', LOCATION_CHANGE: 'เปลี่ยนสถานที่',
  CHECKOUT: 'ส่งมอบอุปกรณ์ Check-out', RETURN: 'คืนอุปกรณ์',
};

const HISTORY_ICON: Record<string, string> = {
  CREATE: '✨', STATUS_CHANGE: '✏️', OWNER_CHANGE: '👤',
  LOCATION_CHANGE: '📍', CHECKOUT: '📦', RETURN: '🔄',
};

const HISTORY_DOT: Record<string, string> = {
  CREATE: 'tl-dot-create', STATUS_CHANGE: 'tl-dot-edit',
  OWNER_CHANGE: 'tl-dot-edit', LOCATION_CHANGE: 'tl-dot-edit',
  CHECKOUT: 'tl-dot-borrow', RETURN: 'tl-dot-return',
};

const PM_LABEL: Record<string, string> = {
  DRAFT: 'ร่าง', IN_PROGRESS: 'กำลังดำเนินการ', COMPLETED: 'เสร็จสิ้น',
};

/* ─── Emoji icons by type ─────────────────────────────────────── */
function getTypeIcon(type: string): string {
  const t = type?.toLowerCase() || '';
  if (['notebook', 'laptop', 'macbook'].some(k => t.includes(k))) return '💻';
  if (['desktop', 'pc', 'workstation', 'all-in-one'].some(k => t.includes(k))) return '🖥';
  if (t.includes('server')) return '🗄';
  if (t.includes('monitor')) return '🖥';
  if (t.includes('printer')) return '🖨';
  if (['phone', 'tablet', 'smartphone', 'ipad'].some(k => t.includes(k))) return '📱';
  if (['switch', 'router', 'firewall', 'access point', 'ap', 'network'].some(k => t.includes(k))) return '🌐';
  if (t.includes('projector')) return '📽';
  if (t.includes('webcam')) return '📷';
  if (t.includes('speaker')) return '🔊';
  return '🔧';
}

/* ─── Spec item ───────────────────────────────────────────────── */
function SpecItem({ label, value, mono, colorClass }: {
  label: string; value?: string | number | null; mono?: boolean; colorClass?: string;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="spec-item">
      <div className="spec-lbl">{label}</div>
      <div className={`spec-val${mono ? ' mono' : ''}${colorClass ? ' ' + colorClass : ''}`}>
        {String(value)}
      </div>
    </div>
  );
}

function BoolBadge({ value, yes, no }: { value: boolean | null | undefined; yes?: string; no?: string }) {
  if (value === null || value === undefined) return null;
  return value
    ? <span className="toggle-chip tc-yes">✓ {yes || 'ใช่'}</span>
    : <span className="toggle-chip tc-no">✗ {no || 'ไม่ใช่'}</span>;
}

/* ─── Warranty progress bar ───────────────────────────────────── */
function WarrantyBar({ purchaseDate, warrantyEndDate }: { purchaseDate?: string; warrantyEndDate?: string }) {
  if (!purchaseDate || !warrantyEndDate) return null;
  const start = new Date(purchaseDate).getTime();
  const end = new Date(warrantyEndDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const daysLeft = Math.max(0, Math.round((end - now) / 86400000));
  const fillClass = pct >= 90 ? 'err' : pct >= 70 ? 'warn' : '';

  return (
    <div className="warranty-bar">
      <div className="wb-hd">
        <span className="wb-label">
          🛡 ประกัน: {new Date(purchaseDate).toLocaleDateString('th-TH')} → {new Date(warrantyEndDate).toLocaleDateString('th-TH')}
        </span>
        <span className="wb-val">
          {daysLeft > 0 ? `เหลือ ${daysLeft.toLocaleString('th-TH')} วัน (${Math.round(100 - pct)}%)` : 'หมดประกันแล้ว'}
        </span>
      </div>
      <div className="wb-track">
        <div className={`wb-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Spec sections by type ───────────────────────────────────── */
function SpecTab({ asset }: { asset: any }) {
  const t = (asset.type || '').toLowerCase();
  const cat = (asset.category?.name || '').toLowerCase();
  const detail = asset.detail || {};

  const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';
  const isMonitor = t.includes('monitor') || cat === 'จอภาพ';
  const isPhone = ['smartphone', 'tablet', 'ipad', 'mobile'].some(k => t.includes(k)) || cat === 'อุปกรณ์สื่อสาร';
  const isNetwork = ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => t.includes(k)) || cat === 'อุปกรณ์เครือข่าย';
  const isPrinter = t.includes('printer') || cat === 'เครื่องพิมพ์';

  return (
    <div className="glass" style={{ padding: '12px' }}>
      {/* General */}
      <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
          <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#6366f1,#8b5cf6)' } as any}></div>ข้อมูลพื้นฐานทรัพย์สิน</div>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
          <div className="spec-grid">
            <SpecItem label="เลขครุภัณฑ์" value={asset.assetCode} mono />
            <SpecItem label="ชื่อทรัพย์สิน" value={asset.assetName} />
            <SpecItem label="ประเภท" value={asset.type} />
            <SpecItem label="ยี่ห้อ" value={asset.brand} />
            <SpecItem label="รุ่น" value={asset.model} />
            <SpecItem label="Serial No." value={asset.serialNo} mono />
            <SpecItem label="Company" value={asset.company} />
            <SpecItem label="รหัสทรัพย์สินเดิม" value={asset.oldAssetCode} mono />
            <SpecItem label="Domain Name" value={asset.domainName} />
          </div>
        </AccordionDetails>
      </Accordion>

      {/* Computer Hardware */}
      {isComputer && !isMonitor && (
        <>
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar"></div>Hardware</div>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <div className="spec-grid">
                <SpecItem label="CPU" value={asset.cpu} />
                <SpecItem label="Generation" value={asset.cpuGeneration} />
                <SpecItem label="RAM" value={asset.ram} />
                <SpecItem label="RAM Slot 1" value={asset.ramSlot1} />
                <SpecItem label="RAM Slot 2" value={asset.ramSlot2} />
                <SpecItem label="Storage 1" value={asset.storage1} />
                <SpecItem label="Storage 2" value={asset.storage2} />
                <SpecItem label="GPU" value={asset.gpu} />
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#2563eb,#60a5fa)' } as any}></div>ระบบปฏิบัติการ</div>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <div className="spec-grid">
                <SpecItem label="OS Type" value={asset.osType} />
                <SpecItem label="OS Version" value={asset.osVersion} mono />
                <SpecItem label="S/N Computer" value={asset.snComputer} mono />
                <SpecItem label="Join Domain" value={asset.domainName} />
                <SpecItem label="Windows License" value={asset.windowsLicense} />
                <SpecItem label="MS Office" value={asset.officeLicense} />
                <SpecItem label="Antivirus" value={asset.antivirusStatus} />
              </div>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* Monitor */}
      {isMonitor && (
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar"></div>ข้อมูลจอภาพ</div>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <div className="spec-grid">
              <SpecItem label="ขนาดจอ (นิ้ว)" value={detail.screenSize} />
              <SpecItem label="ความละเอียด" value={detail.resolution} />
              <SpecItem label="Panel Type" value={detail.panelType} />
              <SpecItem label="Refresh Rate" value={detail.refreshRate} />
              <SpecItem label="พอร์ตเชื่อมต่อ" value={detail.ports} />
              {detail.hasSpeaker !== undefined && detail.hasSpeaker !== null && (
                <div className="spec-item"><div className="spec-lbl">ลำโพงในตัว</div><BoolBadge value={detail.hasSpeaker} yes="มี" no="ไม่มี" /></div>
              )}
              {detail.curved !== undefined && detail.curved !== null && (
                <div className="spec-item"><div className="spec-lbl">Curved</div><BoolBadge value={detail.curved} yes="จอโค้ง" no="จอแบน" /></div>
              )}
            </div>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Phone/Tablet */}
      {isPhone && (
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#7c3aed,#a855f7)' } as any}></div>ข้อมูลอุปกรณ์สื่อสาร</div>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <div className="spec-grid">
              <SpecItem label="IMEI 1" value={detail.imei1} mono />
              <SpecItem label="IMEI 2" value={detail.imei2} mono />
              <SpecItem label="เบอร์โทรศัพท์" value={detail.phoneNumber} />
              <SpecItem label="OS" value={detail.osType} />
              <SpecItem label="OS Version" value={detail.osVersion} />
              <SpecItem label="Storage" value={detail.storageCapacity} />
              <SpecItem label="RAM" value={detail.ram} />
              <SpecItem label="สี" value={detail.color} />
              <SpecItem label="SIM Provider" value={detail.simProvider} />
            </div>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Network */}
      {isNetwork && (
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#0891b2,#38bdf8)' } as any}></div>ข้อมูลอุปกรณ์เครือข่าย</div>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <div className="spec-grid">
              <SpecItem label="IP Address" value={detail.ipAddress} mono />
              <SpecItem label="MAC Address" value={detail.macAddress} mono />
              <SpecItem label="จำนวน Port" value={detail.portCount} />
              <SpecItem label="Port Speed" value={detail.portSpeed} />
              <SpecItem label="Firmware" value={detail.firmwareVersion} />
              <SpecItem label="WiFi Standard" value={detail.wifiStandard} />
            </div>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Printer */}
      {isPrinter && (
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#dc2626,#f87171)' } as any}></div>ข้อมูลเครื่องพิมพ์</div>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <div className="spec-grid">
              <SpecItem label="ประเภทเครื่องพิมพ์" value={detail.printerType} />
              <SpecItem label="ขนาดกระดาษ" value={detail.paperSizes} />
              <SpecItem label="รุ่นหมึก" value={detail.cartridgeModel} />
              <SpecItem label="IP Address" value={detail.ipAddress} mono />
              <SpecItem label="จำนวนหน้าที่พิมพ์" value={detail.pageCount} />
            </div>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Purchase / Warranty */}
      <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
          <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#059669,#34d399)' } as any}></div>จัดซื้อ / ประกัน</div>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
          <div className="spec-grid">
            <SpecItem label="วันที่ซื้อ" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('th-TH') : null} />
            <SpecItem label="วันหมดประกัน" value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString('th-TH') : null} colorClass="warn" />
            <SpecItem label="ราคาซื้อ" value={asset.purchasePrice != null ? `฿${Number(asset.purchasePrice).toLocaleString('th-TH')}` : null} />
            <SpecItem label="PO Number" value={asset.poNumber} mono />
            <SpecItem label="PR Number" value={asset.prNumber} mono />
            <SpecItem label="PO Date" value={asset.poDate ? new Date(asset.poDate).toLocaleDateString('th-TH') : null} />
            <SpecItem label="Vendor" value={asset.vendor} />
            <SpecItem label="งบประมาณ" value={asset.budget} />
            <SpecItem label="อายุอุปกรณ์" value={asset.age != null ? `${asset.age} ปี` : null} />
          </div>
        </AccordionDetails>
      </Accordion>

      {/* Owner */}
      <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
          <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#dc2626,#f87171)' } as any}></div>ผู้ถือครอง</div>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
          <div className="spec-grid">
            <SpecItem label="ชื่อผู้ใช้" value={asset.ownerName} />
            <SpecItem label="แผนก" value={asset.departmentId} />
            <SpecItem label="Location" value={asset.location} />
            <SpecItem label="ชั้น" value={asset.floor} />
          </div>
        </AccordionDetails>
      </Accordion>

      {/* Remark */}
      {asset.remark && (
        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#6b7280,#9ca3af)' } as any}></div>หมายเหตุ</div>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(248,247,255,.7)', border: '1px solid rgba(99,102,241,.07)', fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
              {asset.remark}
            </div>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Asset image */}
      {asset.image && (
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <div className="sec-hd" style={{ marginBottom: 0 }}><div className="sec-bar" style={{ '--sb': 'linear-gradient(180deg,#6366f1,#8b5cf6)' } as any}></div>รูปภาพทะเบียนทรัพย์สิน</div>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <img src={asset.image} alt="Asset" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(99,102,241,.12)' }} />
          </AccordionDetails>
        </Accordion>
      )}
    </div>
  );
}

/* ─── History tab ─────────────────────────────────────────────── */
function HistoryTab({ asset }: { asset: any }) {
  const history = asset.assetHistory || [];
  if (history.length === 0) return (
    <div className="glass" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>ไม่มีประวัติการเปลี่ยนแปลง</div>
  );
  return (
    <div className="glass" style={{ padding: '18px' }}>
      <div className="timeline">
        {history.map((h: any, i: number) => {
          const icon = HISTORY_ICON[h.actionType] || '📋';
          const dotClass = HISTORY_DOT[h.actionType] || 'tl-dot-edit';
          const label = HISTORY_LABEL[h.actionType] || h.actionType;
          const detail = [h.fromStatus, h.toStatus, h.fromOwner, h.toOwner, h.fromLoc, h.toLoc, h.note].filter(Boolean).join(' → ');
          return (
            <div className="tl-item" key={h.id ?? i}>
              {i < history.length - 1 && <div className="tl-line"></div>}
              <div className={`tl-dot ${dotClass}`}>{icon}</div>
              <div className="tl-body">
                <div className="tl-action">{label}</div>
                {detail && <div className="tl-detail">{detail}</div>}
                <div className="tl-meta">
                  <span>{new Date(h.createdAt).toLocaleString('th-TH')}</span>
                  {h.changedBy && <span className="tl-actor"><div className="ava-xs av-b">{String(h.changedBy).substring(0, 2).toUpperCase()}</div> {h.changedBy}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PM tab ──────────────────────────────────────────────────── */
function PMTab({ asset }: { asset: any }) {
  const runs = asset.pmRuns || [];
  if (runs.length === 0) return (
    <div className="glass" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>ยังไม่มีประวัติ PM</div>
  );
  return (
    <div className="glass" style={{ padding: '18px' }}>
      <div className="pm-list">
        {runs.map((r: any) => {
          const performer = r.performer?.displayName || r.performer?.adUsername || r.performer?.username || '-';
          const statusOk = r.status === 'COMPLETED';
          return (
            <div className="pm-item" key={r.id}>
              <div className="pm-item-hd">
                <div>
                  <div className="pm-year">
                    PM ปี {r.year}
                    <span className={`pill ${statusOk ? 'p-ok' : 'p-warn'}`} style={{ fontSize: '10px', marginLeft: '6px' }}>
                      {statusOk ? '✓' : '⏳'} {PM_LABEL[r.status] || r.status}
                    </span>
                  </div>
                  <div className="pm-staff">
                    <div className="ava-xs av-b" style={{ width: '20px', height: '20px', fontSize: '9px' }}>{performer.substring(0, 2).toUpperCase()}</div>
                    {performer} · {r.completedAt ? new Date(r.completedAt).toLocaleDateString('th-TH') : (r.performedAt ? new Date(r.performedAt).toLocaleDateString('th-TH') : '-')}
                  </div>
                </div>
              </div>
              {r.checklist && r.checklist.length > 0 && (
                <div className="pm-checks">
                  {r.checklist.map((c: any) => (
                    <div className="pm-check" key={c.id ?? c.label}>
                      <div className={`chk-ic ${c.checked ? 'chk-y' : 'chk-n'}`}>{c.checked ? '✓' : '✗'}</div>
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
              {r.score != null && (
                <div className="pm-score">
                  <span className="stars">{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span>
                  <span style={{ color: '#1e1b4b', fontWeight: 700 }}>{r.score}/5</span>
                  <span>· ความพึงพอใจผู้ใช้</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spec');
  const [showQR, setShowQR] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [similarAssets, setSimilarAssets] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      assetAPI.get(parseInt(id))
        .then((res) => setAsset(res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // recent view tracking
  useEffect(() => {
    if (!id) return;
    try {
      const key = 'assethub.recentAssets';
      const recent: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [parseInt(id), ...recent.filter(r => r !== parseInt(id))].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [id]);

  // favorite check
  useEffect(() => {
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('assethub.favoriteAssets') || '[]');
      setIsFavorite(favs.includes(parseInt(id!)));
    } catch { setIsFavorite(false); }
  }, [id]);

  // load similar assets
  useEffect(() => {
    if (!asset?.categoryId) return;
    assetAPI.list({ categoryId: asset.categoryId, limit: 5 })
      .then((res) => setSimilarAssets((res.data.data || []).filter((a: any) => a.id !== asset.id)))
      .catch(() => {});
  }, [asset]);

  /* Warranty calculation */
  const warrantyDaysLeft = useMemo(() => {
    if (!asset?.warrantyEndDate) return null;
    return Math.max(0, Math.round((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86400000));
  }, [asset]);

  const totalBorrows = asset?.pmRuns?.length ?? 0;
  const completedPMs = asset?.pmRuns?.filter((r: any) => r.status === 'COMPLETED').length ?? 0;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </div>
  );
  if (!asset) return <div style={{ padding: '32px', color: '#6b7280' }}>ไม่พบทรัพย์สิน</div>;

  const statusClass = STATUS_CLASS[asset.status] || 'p-gray';
  const statusLabel = STATUS_LABEL[asset.status] || asset.status;
  const icon = getTypeIcon(asset.type);
  const historyCount = asset.assetHistory?.length ?? 0;

  const toggleFavorite = () => {
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('assethub.favoriteAssets') || '[]');
      const idNum = parseInt(id!);
      if (isFavorite) {
        localStorage.setItem('assethub.favoriteAssets', JSON.stringify(favs.filter(f => f !== idNum)));
        setIsFavorite(false);
      } else {
        localStorage.setItem('assethub.favoriteAssets', JSON.stringify([idNum, ...favs]));
        setIsFavorite(true);
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* ── Inline CSS (scoped) ── */}
      <style>{`
        .ad-root{font-family:'Sarabun',sans-serif;position:relative}
        .ad-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0}
        .ad-o1{width:420px;height:420px;background:rgba(99,102,241,.08);top:-140px;left:-100px}
        .ad-o2{width:300px;height:300px;background:rgba(139,92,246,.07);bottom:-80px;right:-60px}
        .ad-grid-bg{position:fixed;inset:0;background-image:radial-gradient(circle,rgba(99,102,241,.08) 1px,transparent 1px);background-size:28px 28px;pointer-events:none;z-index:0}
        .ad-page{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:16px 20px 40px}

        .glass{background:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:14px;box-shadow:0 4px 24px rgba(99,102,241,.07),0 1px 3px rgba(0,0,0,.04)}

        /* breadcrumb */
        .bc{display:flex;align-items:center;gap:6px;font-size:12px;color:#9ca3af;margin-bottom:14px}
        .bc a{color:#6366f1;text-decoration:none;font-weight:500;cursor:pointer}
        .bc a:hover{text-decoration:underline}
        .bc-sep{color:#d1d5db}

        /* hero */
        .hero{padding:20px 24px;margin-bottom:16px}
        .hero-top{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap}
        .hero-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;box-shadow:0 4px 16px rgba(99,102,241,.3)}
        .hero-info{flex:1;min-width:0}
        .hero-name{font-size:18px;font-weight:700;color:#1e1b4b;line-height:1.2}
        .hero-sub{font-size:12px;color:#6b7280;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .hero-code{font-family:monospace;font-size:12px;font-weight:700;color:#4338ca;background:rgba(99,102,241,.08);padding:2px 8px;border-radius:6px}
        .hero-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:10px;font-size:12px;font-family:'Sarabun',sans-serif;cursor:pointer;font-weight:600;border:1px solid;transition:all .15s}
        .btn-primary{background:linear-gradient(135deg,#4f46e5,#7c3aed);border-color:rgba(124,58,237,.3);color:#fff;box-shadow:0 3px 10px rgba(99,102,241,.25)}
        .btn-ghost{background:rgba(255,255,255,.7);border-color:rgba(99,102,241,.2);color:#4338ca}
        .btn-ghost:hover{background:rgba(99,102,241,.06)}
        .btn-danger{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.2);color:#dc2626}

        /* pills */
        .pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .p-ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.22);color:#059669}
        .p-warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.22);color:#d97706}
        .p-err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#dc2626}
        .p-purple{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);color:#4338ca}
        .p-gray{background:rgba(107,114,128,.07);border:1px solid rgba(107,114,128,.18);color:#6b7280}
        .sdot{width:5px;height:5px;border-radius:50%;background:currentColor}

        /* quick stats */
        .qstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
        .qs{padding:12px 14px;text-align:center}
        .qs-val{font-size:18px;font-weight:800;color:#1e1b4b;line-height:1}
        .qs-lbl{font-size:10px;color:#9ca3af;margin-top:3px}

        /* warranty */
        .warranty-bar{background:rgba(255,255,255,.5);border:1px solid rgba(99,102,241,.12);border-radius:10px;padding:12px 14px;margin-bottom:16px}
        .wb-hd{display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px;flex-wrap:wrap;gap:6px}
        .wb-label{color:#9ca3af}
        .wb-val{color:#4338ca;font-weight:700}
        .wb-track{background:rgba(99,102,241,.1);border-radius:4px;height:6px}
        .wb-fill{height:6px;border-radius:4px;background:linear-gradient(90deg,#4f46e5,#7c3aed);transition:width .4s}
        .wb-fill.warn{background:linear-gradient(90deg,#d97706,#fbbf24)}
        .wb-fill.err{background:linear-gradient(90deg,#ef4444,#f87171)}

        /* tabs */
        .tabs{display:flex;gap:4px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.8);border-radius:12px;padding:4px;margin-bottom:16px;backdrop-filter:blur(12px);flex-wrap:wrap}
        .tab-btn{flex:1;min-width:70px;padding:8px 10px;border-radius:9px;border:none;background:none;font-size:12px;font-weight:600;color:#9ca3af;cursor:pointer;font-family:'Sarabun',sans-serif;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s;white-space:nowrap}
        .tab-btn.active{background:#fff;color:#4338ca;box-shadow:0 2px 8px rgba(99,102,241,.12)}
        .tab-btn:hover:not(.active){color:#6366f1;background:rgba(255,255,255,.5)}

        /* spec */
        .spec-section{margin-bottom:16px}
        .sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em}
        .sec-bar{width:3px;height:14px;border-radius:2px;flex-shrink:0;background:var(--sb,linear-gradient(180deg,#4f46e5,#7c3aed))}
        .spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        @media(max-width:600px){.spec-grid{grid-template-columns:1fr 1fr}.qstrip{grid-template-columns:1fr 1fr}}
        .spec-item{padding:10px 12px;border-radius:10px;background:rgba(248,247,255,.7);border:1px solid rgba(99,102,241,.07)}
        .spec-lbl{font-size:10px;color:#9ca3af;margin-bottom:3px;font-weight:500}
        .spec-val{font-size:13px;color:#1e1b4b;font-weight:600}
        .spec-val.mono{font-family:monospace;font-size:12px;color:#4338ca}
        .spec-val.warn{color:#d97706}
        .spec-val.err{color:#dc2626}
        .toggle-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}
        .tc-yes{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.22);color:#059669}
        .tc-no{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);color:#dc2626}

        /* timeline */
        .timeline{display:flex;flex-direction:column;gap:0}
        .tl-item{display:flex;gap:12px;position:relative}
        .tl-item:not(:last-child) .tl-line{position:absolute;left:15px;top:32px;bottom:0;width:1px;background:rgba(99,102,241,.12)}
        .tl-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:2px;border:2px solid;position:relative;z-index:1}
        .tl-dot-create{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3)}
        .tl-dot-edit{background:rgba(59,130,246,.1);border-color:rgba(59,130,246,.25)}
        .tl-dot-borrow{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.28)}
        .tl-dot-return{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.25)}
        .tl-dot-pm{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.25)}
        .tl-body{flex:1;padding-bottom:16px}
        .tl-action{font-size:12px;font-weight:700;color:#1e1b4b}
        .tl-detail{font-size:11.5px;color:#6b7280;margin-top:2px;line-height:1.5}
        .tl-meta{font-size:10.5px;color:#d1d5db;margin-top:3px;display:flex;gap:10px;flex-wrap:wrap}
        .tl-actor{display:inline-flex;align-items:center;gap:4px;color:#9ca3af}
        .ava-xs{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff}
        .av-b{background:linear-gradient(135deg,#3b82f6,#6366f1)}
        .av-p{background:linear-gradient(135deg,#7c3aed,#a855f7)}

        /* PM */
        .pm-list{display:flex;flex-direction:column;gap:8px}
        .pm-item{padding:14px 16px;border-radius:12px;border:1px solid rgba(99,102,241,.1);background:rgba(248,247,255,.6)}
        .pm-item-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .pm-year{font-size:13px;font-weight:700;color:#1e1b4b}
        .pm-checks{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}
        @media(max-width:500px){.pm-checks{grid-template-columns:1fr 1fr}}
        .pm-check{display:flex;align-items:center;gap:5px;font-size:11px;color:#374151}
        .chk-ic{width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
        .chk-y{background:rgba(16,185,129,.15);color:#059669;border:1px solid rgba(16,185,129,.25)}
        .chk-n{background:rgba(239,68,68,.1);color:#dc2626;border:1px solid rgba(239,68,68,.2)}
        .pm-score{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(99,102,241,.07);font-size:11px;color:#9ca3af}
        .stars{color:#f59e0b;font-size:13px}
        .pm-staff{font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;margin-top:2px}
      `}</style>

      <div className="ad-root">
        <div className="ad-orb ad-o1"></div>
        <div className="ad-orb ad-o2"></div>
        <div className="ad-grid-bg"></div>

        <div className="ad-page">
          {/* Breadcrumb */}
          <div className="bc">
            <a onClick={() => navigate('/assets')}>ทรัพย์สิน IT</a>
            <span className="bc-sep">›</span>
            <span>{asset.assetCode}</span>
          </div>

          {/* Hero card */}
          <div className="glass hero">
            <div className="hero-top">
              <div className="hero-icon">{icon}</div>
              <div className="hero-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="hero-name">{asset.brand} {asset.model}</div>
                  <span className={`pill ${statusClass}`}><span className="sdot"></span>{statusLabel}</span>
                </div>
                <div className="hero-sub">
                  <span className="hero-code">{asset.assetCode}</span>
                  {asset.assetName && <span className="hero-code" style={{ background: 'rgba(99,102,241,.1)', color: '#6366f1' }}>📝 {asset.assetName}</span>}
                  {asset.type && <span>{asset.type}</span>}
                  {asset.location && <><span>·</span><span>{asset.location}{asset.floor ? ` ชั้น ${asset.floor}` : ''}</span></>}
                  {asset.departmentId && <><span>·</span><span>แผนก {asset.departmentId}</span></>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {asset.age != null && (
                    <div className="hero-code" style={{ background: 'rgba(245,158,11,.1)', color: '#b45309' }}>อายุ {asset.age} ปี</div>
                  )}
                  {asset.serialNo && (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>S/N: {asset.serialNo}</div>
                  )}
                </div>
              </div>
              {asset.purchasePrice != null && (
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>
                    ฿{Number(asset.purchasePrice).toLocaleString('th-TH')}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>ราคาซื้อ</div>
                </div>
              )}
            </div>

            <div className="hero-actions">
              <button className="btn btn-ghost" onClick={() => navigate(`/assets/${id}/edit`)}>✏️ แก้ไข</button>
              <button className={`btn ${isFavorite ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleFavorite}>{isFavorite ? '⭐' : '☆'} ดาวโปรด</button>
              <button className="btn btn-ghost" style={{ background: 'rgba(245,158,11,.08)', borderColor: 'rgba(245,158,11,.3)', color: '#b45309' }} onClick={() => setShowQR(true)}>📲 QR Code</button>
              <button className="btn btn-ghost" onClick={() => navigate(`/assets/print-qr?ids=${id}`)}>🖨 พิมพ์สติ๊กเกอร์</button>
              <button className="btn btn-ghost" onClick={() => navigate('/assets')}>← กลับรายการ</button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="qstrip">
            <div className="glass qs">
              <div className="qs-val">{historyCount}</div>
              <div className="qs-lbl">ประวัติการเปลี่ยนแปลง</div>
            </div>
            <div className="glass qs">
              <div className="qs-val" style={{ color: '#7c3aed' }}>{totalBorrows}</div>
              <div className="qs-lbl">บันทึก PM</div>
            </div>
            <div className="glass qs">
              <div className="qs-val" style={{ color: '#059669' }}>{completedPMs}</div>
              <div className="qs-lbl">PM เสร็จแล้ว</div>
            </div>
            <div className="glass qs">
              <div className="qs-val" style={{ color: warrantyDaysLeft === 0 ? '#dc2626' : warrantyDaysLeft != null && warrantyDaysLeft < 180 ? '#d97706' : '#4f46e5' }}>
                {warrantyDaysLeft != null ? warrantyDaysLeft.toLocaleString('th-TH') : '—'}
              </div>
              <div className="qs-lbl">วันหมดประกัน</div>
            </div>
          </div>

          {/* Warranty bar */}
          <WarrantyBar purchaseDate={asset.purchaseDate} warrantyEndDate={asset.warrantyEndDate} />

          {/* Tabs */}
          <div className="tabs">
            {[
              { key: 'spec', label: '🔧 สเปก' },
              { key: 'history', label: '📋 ประวัติ' },
              { key: 'pm', label: '🛠 PM' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          {activeTab === 'spec' && <SpecTab asset={asset} />}
          {activeTab === 'history' && <HistoryTab asset={asset} />}
          {activeTab === 'pm' && <PMTab asset={asset} />}

          {/* Similar assets */}
          {similarAssets.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className="sec-hd" style={{ marginBottom: '12px' }}><div className="sec-bar"></div>ทรัพย์สินใกล้เคียงในหมวดหมู่เดียวกัน</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {similarAssets.slice(0, 4).map((a: any) => (
                  <div key={a.id} onClick={() => navigate(`/assets/${a.id}`)}
                    style={{ cursor: 'pointer', padding: '10px 14px', borderRadius: '10px', background: 'rgba(248,247,255,.7)', border: '1px solid rgba(99,102,241,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e1b4b' }}>{a.assetCode}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{a.brand} {a.model} · {a.serialNo}</div>
                    </div>
                    <span className={`pill ${STATUS_CLASS[a.status] || 'p-gray'}`} style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                      <span className="sdot"></span>{STATUS_LABEL[a.status] || a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QR Modal ───────────────────────────────────────────── */}
      {showQR && (
        <div
          onClick={() => setShowQR(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '28px',
              minWidth: '260px', textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,.2)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
              QR Code — {asset.assetCode}
            </div>
            <div style={{ display: 'inline-block', padding: '12px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '10px' }}>
              <QRCode
                value={`${window.location.origin}/assets/${asset.id}`}
                size={160}
                level="M"
              />
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280' }}>
              {[asset.brand, asset.model].filter(Boolean).join(' ') || asset.assetName}
            </div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
              S/N: {asset.serialNo}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setShowQR(false); navigate(`/assets/print-qr?ids=${id}`); }}
              >
                🖨 พิมพ์สติ๊กเกอร์
              </button>
              <button className="btn btn-ghost" onClick={() => setShowQR(false)}>
                ✕ ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
