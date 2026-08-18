import React, { useState, useEffect, useRef } from 'react';
import { pmAPI } from '../../../services/api';
import { Modal } from './Modal';

interface PMAdhocModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newRun: any) => void;
  initialSearch?: string;
}

export const PMAdhocModal: React.FC<PMAdhocModalProps> = ({ open, onClose, onSuccess, initialSearch }) => {
  const [adhocStep, setAdhocStep] = useState<'search' | 'template'>('search');
  const [adhocSearch, setAdhocSearch] = useState('');
  const [adhocResults, setAdhocResults] = useState<any[]>([]);
  const [adhocSearching, setAdhocSearching] = useState(false);
  const [adhocSearchError, setAdhocSearchError] = useState('');
  const [adhocAsset, setAdhocAsset] = useState<any>(null);

  // Template states
  const [adhocTemplates, setAdhocTemplates] = useState<any[]>([]);
  const [adhocTemplateId, setAdhocTemplateId] = useState<number | null>(null);
  const [adhocTemplatesLoading, setAdhocTemplatesLoading] = useState(false);
  const [adhocTemplatesError, setAdhocTemplatesError] = useState('');
  const [adhocCreating, setAdhocCreating] = useState(false);

  const searchTimer = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setAdhocStep('search');
      setAdhocSearch(initialSearch || '');
      setAdhocResults([]);
      setAdhocAsset(null);
      setAdhocTemplateId(null);
      
      // Load templates
      setAdhocTemplatesLoading(true);
      pmAPI.templates()
        .then((res: any) => {
          setAdhocTemplates(res.data || []);
          setAdhocTemplatesError('');
        })
        .catch(() => setAdhocTemplatesError('โหลด Template PM ไม่สำเร็จ'))
        .finally(() => setAdhocTemplatesLoading(false));
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!adhocSearch || adhocSearch.trim().length < 2) {
      setAdhocResults([]);
      setAdhocSearching(false);
      setAdhocSearchError('');
      return;
    }

    if (adhocStep !== 'search') return;

    setAdhocSearching(true);
    setAdhocSearchError('');

    searchTimer.current = setTimeout(() => {
      pmAPI.adhocSearch(adhocSearch.trim())
        .then(res => {
          setAdhocResults(res.data || []);
          setAdhocSearchError('');
        })
        .catch(() => setAdhocSearchError('เกิดข้อผิดพลาดในการค้นหาทรัพย์สิน'))
        .finally(() => setAdhocSearching(false));
    }, 400);

    return () => clearTimeout(searchTimer.current);
  }, [adhocSearch, adhocStep]);

  const handleCreateAdhoc = async () => {
    if (!adhocAsset || !adhocTemplateId) return;
    setAdhocCreating(true);
    try {
      const res = await pmAPI.adhocCreate({
        assetId: adhocAsset.id,
        templateId: adhocTemplateId,
      });
      const newRun = res.data.run;
      onSuccess(newRun);
    } catch (e: any) {
      alert(`❌ ${e.response?.data?.error || e.message || String(e)}`);
    } finally {
      setAdhocCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="➕ ทำ PM นอกแผน"
      maxWidth={560}
    >
      {adhocStep === 'search' ? (
        <div className="pmr-modal-section">
          <div style={{ fontSize: 13, color: '#515154', fontWeight: 500, marginBottom: 8 }}>
            🔍 ค้นหาเครื่องที่ต้องการทำ PM (รหัส / ชื่อ / S/N / ผู้ถือครอง)
          </div>
          <input
            className="pmr-input"
            style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '1px solid #d2d2d7', borderRadius: 8, boxSizing: 'border-box', marginBottom: 12 }}
            placeholder="พิมพ์อย่างน้อย 2 ตัวอักษร..."
            value={adhocSearch}
            onChange={(e) => setAdhocSearch(e.target.value)}
            autoFocus
          />

          {adhocSearching && (
            <div style={{ textAlign: 'center', color: '#0071e3', fontSize: 13, margin: 12 }}>
              ⏳ กำลังค้นหา...
            </div>
          )}

          {adhocSearchError && (
            <div style={{ color: '#b42318', background: '#fff1f0', border: '1px solid #ffd6d1', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
              {adhocSearchError}
            </div>
          )}

          {!adhocSearching && !adhocSearchError && adhocSearch.trim().length >= 2 && adhocResults.length === 0 && (
            <div style={{ textAlign: 'center', color: '#86868b', fontSize: 13, padding: 20 }}>
              ไม่พบทรัพย์สินที่ตรงกับคำค้นหา
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {adhocResults.map((a: any) => {
              const hasPM = a.hasPMThisYear;
              const pmRun = a.pmRunThisYear;
              return (
                <div
                  key={a.id}
                  style={{
                    background: hasPM ? '#f9fafb' : '#fff',
                    border: `1px solid ${hasPM ? '#e5e7eb' : '#d2d2d7'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: hasPM ? 'default' : 'pointer',
                    opacity: hasPM ? 0.7 : 1,
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                  onClick={() => {
                    if (hasPM) return;
                    setAdhocAsset(a);
                    setAdhocStep('template');
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <code style={{ fontSize: 12, fontWeight: 600, background: '#f5f5f7', padding: '2px 8px', borderRadius: 4, color: '#1d1d1f' }}>
                        {a.assetCode || '—'}
                      </code>
                      {a.type && (
                        <span style={{ fontSize: 10, color: '#86868b', background: '#f0f0f5', padding: '1px 6px', borderRadius: 4 }}>
                          {a.type}
                        </span>
                      )}
                    </div>
                    {a.assetName && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        {a.assetName}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#86868b' }}>
                      {a.brand} {a.model} {a.serialNo ? `· S/N: ${a.serialNo}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>
                      👤 {a.ownerName || '—'} · 📍 {a.departmentId || a.location || '—'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {hasPM ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: pmRun?.status === 'COMPLETED' ? '#eaf6ed' : '#fff9e6', color: pmRun?.status === 'COMPLETED' ? '#1c873b' : '#d97706', border: `1px solid ${pmRun?.status === 'COMPLETED' ? 'rgba(52,199,89,0.2)' : 'rgba(255,149,0,0.2)'}` }}>
                        {pmRun?.status === 'COMPLETED' ? '✅ ทำ PM แล้ว' : '🔄 กำลังทำ'}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid rgba(37,99,235,0.15)' }}>
                        ⚡ พร้อมทำ PM
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 24px' }}>
          {/* Back button */}
          <button
            type="button"
            className="pmr-btn pmr-btn-outline"
            style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: 12 }}
            onClick={() => setAdhocStep('search')}
          >
            ← กลับไปค้นหา
          </button>

          {/* Selected asset info */}
          {adhocAsset && (
            <div style={{ background: 'linear-gradient(135deg, rgba(0,113,227,0.04) 0%, rgba(52,199,89,0.04) 100%)', border: '1px solid rgba(0,113,227,0.15)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>เครื่องที่เลือก</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{adhocAsset.assetName || adhocAsset.assetCode}</div>
              <div style={{ fontSize: 12, color: '#515154', marginTop: 2 }}>{adhocAsset.brand} {adhocAsset.model} · S/N: {adhocAsset.serialNo || '—'}</div>
              <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>👤 {adhocAsset.ownerName || '—'} · 📍 {adhocAsset.departmentId || adhocAsset.location || '—'}</div>
            </div>
          )}

          {/* Template selection */}
          <div style={{ fontSize: 13, color: '#515154', fontWeight: 500 }}>
            📋 เลือก Template เช็คลิสต์ PM
          </div>

          {adhocTemplatesLoading ? (
            <div style={{ textAlign: 'center', color: '#86868b', fontSize: 13, padding: 20 }}>
              ⏳ กำลังโหลด Template...
            </div>
          ) : adhocTemplatesError ? (
            <div style={{ color: '#b42318', background: '#fff1f0', border: '1px solid #ffd6d1', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
              {adhocTemplatesError}
            </div>
          ) : adhocTemplates.filter((t: any) => t.active !== false).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#86868b', fontSize: 13, padding: 20 }}>
              ไม่พบ Template PM กรุณาสร้าง Template ก่อน
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {adhocTemplates
                .filter((t: any) => t.active !== false)
                .map((t: any) => (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      border: `2px solid ${adhocTemplateId === t.id ? '#0071e3' : '#e5e5ea'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: adhocTemplateId === t.id ? 'rgba(0,113,227,0.04)' : '#fff',
                    }}
                  >
                    <input
                      type="radio"
                      name="adhoc-template"
                      checked={adhocTemplateId === t.id}
                      onChange={() => setAdhocTemplateId(t.id)}
                      style={{ width: 18, height: 18, accentColor: '#0071e3' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#86868b' }}>{t.templateItems?.length || 0} ข้อ · ปี {t.year ? t.year + 543 : '—'}</div>
                    </div>
                  </label>
                ))}
            </div>
          )}

          {/* Create button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e5e5ea', paddingTop: 16 }}>
            <button type="button" className="pmr-btn pmr-btn-outline" onClick={onClose}>ยกเลิก</button>
            <button
              type="button"
              className="pmr-btn pmr-btn-success"
              disabled={!adhocTemplateId || adhocCreating}
              onClick={handleCreateAdhoc}
              style={{
                background: '#34c759', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {adhocCreating ? '⏳ กำลังสร้าง...' : '🔧 เริ่มทำ PM'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
