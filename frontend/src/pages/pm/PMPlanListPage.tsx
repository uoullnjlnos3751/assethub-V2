import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI, assetAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
interface PlanForm {
  year: number;
  company: string;
  site: string;
  deptTask: string;
  deviceType: string;
  lead: string;
  plannedDeviceCount: number;
  startDate: string;
  endDate: string;
  templateId: string;
}

const THAI_YEAR = new Date().getFullYear() + 543;

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function progressColor(pct: number) {
  if (pct >= 100) return '#10b981';
  if (pct >= 50) return '#0ea5e9';
  if (pct >= 20) return '#f59e0b';
  return '#ef4444';
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
      zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', padding: '2px 6px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMPlanListPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [locOptions, setLocOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [generateEligibility, setGenerateEligibility] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [generateModal, setGenerateModal] = useState<{ open: boolean; plan: any }>({ open: false, plan: null });
  const [genMsg, setGenMsg] = useState('');
  const [toast, setToast] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState<PlanForm>({
    year: new Date().getFullYear(),
    company: '',
    site: '',
    deptTask: '',
    deviceType: '',
    lead: '',
    plannedDeviceCount: 10,
    startDate: '',
    endDate: '',
    templateId: '',
  });

  const [form, setForm] = useState<PlanForm>({
    year: new Date().getFullYear(),
    company: '',
    site: '',
    deptTask: '',
    deviceType: '',
    lead: '',
    plannedDeviceCount: 10,
    startDate: '',
    endDate: '',
    templateId: '',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      pmAPI.plans(),
      pmAPI.templates(),
      assetAPI.departmentOptions(),
      assetAPI.locationOptions(),
      assetAPI.companyOptions(),
      assetAPI.typeOptions(),
    ]).then(([p, t, d, l, c, ty]) => {
      setPlans(p.data || []);
      setTemplates(t.data || []);
      setDeptOptions((d.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setLocOptions((l.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setCompanyOptions((c.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setTypeOptions((ty.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const companyVal = (form.company === '__ALL__' || !form.company) ? '' : form.company;
    const siteVal = (form.site === '__ALL__' || !form.site) ? '' : form.site;
    const deptVal = (form.deptTask === '__ALL__' || !form.deptTask) ? '' : form.deptTask;
    const typeVal = (form.deviceType === '__ALL__' || !form.deviceType) ? '' : form.deviceType;
    if (!companyVal && !siteVal && !deptVal && !typeVal) {
      setEligibility(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setEligibilityLoading(true);
      pmAPI.eligibility({
        year: form.year,
        company: companyVal || undefined,
        site: siteVal || undefined,
        deptTask: deptVal || undefined,
        deviceType: typeVal || undefined,
        plannedDeviceCount: form.plannedDeviceCount,
      })
        .then((res) => {
          const data = res.data;
          setEligibility(data);
          setForm((prev) => (
            prev.plannedDeviceCount === 10 && data.available > 0
              ? { ...prev, plannedDeviceCount: data.available }
              : prev
          ));
        })
        .catch(() => setEligibility(null))
        .finally(() => setEligibilityLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [modalOpen, form.year, form.company, form.site, form.deptTask, form.deviceType, form.plannedDeviceCount]);

  useEffect(() => {
    const plan = generateModal.plan;
    if (!generateModal.open || !plan) {
      setGenerateEligibility(null);
      return;
    }
    pmAPI.eligibility({
      year: plan.year,
      company: plan.company || undefined,
      site: plan.site || undefined,
      deptTask: plan.deptTask || undefined,
      deviceType: plan.deviceType || undefined,
      plannedDeviceCount: plan.plannedDeviceCount,
    })
      .then((res) => setGenerateEligibility(res.data))
      .catch(() => setGenerateEligibility(null));
  }, [generateModal.open, generateModal.plan]);

  const handleCreate = async () => {
    if (!form.startDate || !form.endDate) { showToast('⚠️ กรุณากำหนดวันเริ่มและวันสิ้นสุด'); return; }
    
    // Normalize target values
    const companyVal = (form.company === '__ALL__' || !form.company) ? '' : form.company;
    const siteVal = (form.site === '__ALL__' || !form.site) ? '' : form.site;
    const deptVal = (form.deptTask === '__ALL__' || !form.deptTask) ? '' : form.deptTask;
    const typeVal = (form.deviceType === '__ALL__' || !form.deviceType) ? '' : form.deviceType;

    if (!companyVal && !siteVal && !deptVal && !typeVal) {
      showToast('⚠️ กรุณาระบุ บริษัท, สถานที่, แผนก หรือ ประเภทอุปกรณ์ อย่างใดอย่างหนึ่ง');
      return;
    }

    setSaving(true);
    try {
      await pmAPI.createPlan({
        year: form.year,
        company: companyVal,
        site: siteVal,
        deptTask: deptVal,
        deviceType: typeVal,
        lead: form.lead,
        plannedDeviceCount: form.plannedDeviceCount,
        startDate: form.startDate,
        endDate: form.endDate,
        templateId: form.templateId ? parseInt(form.templateId) : undefined,
      });
      showToast('✅ สร้างแผน PM สำเร็จ');
      setModalOpen(false);
      setForm({
        year: new Date().getFullYear(),
        company: '',
        site: '',
        deptTask: '',
        deviceType: '',
        lead: '',
        plannedDeviceCount: 10,
        startDate: '',
        endDate: '',
        templateId: '',
      });
      fetchAll();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'สร้างแผนไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  const handleOpenEdit = (plan: any) => {
    setSelectedPlanForEdit(plan);
    setEditForm({
      year: plan.year,
      company: plan.company || '',
      site: plan.site || '',
      deptTask: plan.deptTask || '',
      deviceType: plan.deviceType || '',
      lead: plan.lead || '',
      plannedDeviceCount: plan.plannedDeviceCount || 0,
      startDate: plan.startDate ? plan.startDate.substring(0, 10) : '',
      endDate: plan.endDate ? plan.endDate.substring(0, 10) : '',
      templateId: plan.templateId ? String(plan.templateId) : '',
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedPlanForEdit) return;
    if (!editForm.startDate || !editForm.endDate) { showToast('⚠️ กรุณากำหนดวันเริ่มและวันสิ้นสุด'); return; }

    const companyVal = (editForm.company === '__ALL__' || !editForm.company) ? '' : editForm.company;
    const siteVal = (editForm.site === '__ALL__' || !editForm.site) ? '' : editForm.site;
    const deptVal = (editForm.deptTask === '__ALL__' || !editForm.deptTask) ? '' : editForm.deptTask;
    const typeVal = (editForm.deviceType === '__ALL__' || !editForm.deviceType) ? '' : editForm.deviceType;

    if (!companyVal && !siteVal && !deptVal && !typeVal) {
      showToast('⚠️ กรุณาระบุ บริษัท, สถานที่, แผนก หรือ ประเภทอุปกรณ์ อย่างใดอย่างหนึ่ง');
      return;
    }

    setSaving(true);
    try {
      await pmAPI.updatePlan(selectedPlanForEdit.id, {
        year: editForm.year,
        company: companyVal,
        site: siteVal,
        deptTask: deptVal,
        deviceType: typeVal,
        lead: editForm.lead,
        plannedDeviceCount: editForm.plannedDeviceCount,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        templateId: editForm.templateId ? parseInt(editForm.templateId) : undefined,
      });
      showToast('✅ อัปเดตแผน PM สำเร็จ');
      setEditModalOpen(false);
      fetchAll();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'แก้ไขแผนไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (planId: number) => {
    if (!window.confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบแผน PM นี้?\nการลบจะลบข้อมูลงาน PM ทั้งหมด (รวมถึงงานที่เสร็จสิ้นแล้ว) ในแผนงานนี้ด้วย และไม่สามารถกู้คืนได้')) {
      return;
    }

    setSaving(true);
    try {
      await pmAPI.deletePlan(planId);
      showToast('✅ ลบแผน PM สำเร็จ');
      fetchAll();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'ลบแผนไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  const handleGenerate = async () => {
    try {
      const res = await pmAPI.generate(generateModal.plan.id);
      setGenMsg(res.data?.message || 'สร้างงาน PM สำเร็จ');
      fetchAll();
    } catch (err: any) {
      setGenMsg(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const filteredPlans = plans.filter(p => p.year === filterYear);
  const totalPlanned = filteredPlans.reduce((s: number, p: any) => s + (p.plannedDeviceCount || 0), 0);
  const totalRuns = filteredPlans.reduce((s: number, p: any) => s + (p.runs?.length || p.totalCount || 0), 0);
  const totalDone = filteredPlans.reduce((s: number, p: any) => s + (p.runs?.filter((r: any) => r.status === 'COMPLETED').length || p.completedCount || 0), 0);
  const overallPct = totalRuns > 0 ? Math.round(totalDone / totalRuns * 100) : 0;

  const yearOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <>
      <style>{`
        .pmp-root { font-family: 'Sarabun', sans-serif; }
        .pmp-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px;
          font-size: 12px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,.2);
          animation: pmpFadeUp .2s ease; pointer-events: none; }
        @keyframes pmpFadeUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .pmp-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif;
          transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pmp-btn-primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
        .pmp-btn-primary:hover { background: #0284c7; }
        .pmp-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pmp-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .pmp-btn-success { background: #10b981; border-color: #059669; color: #fff; }
        .pmp-btn:disabled { opacity: .5; cursor: not-allowed; }
        .pmp-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; color: #334155;
          box-sizing: border-box; background: #fff; }
        .pmp-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .pmp-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; cursor: pointer; }
        .pmp-label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
        .pmp-mode-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1.5px solid #e2e8f0;
          background: #fff; cursor: pointer; font-family: 'Sarabun', sans-serif; font-size: 12px;
          font-weight: 600; color: #64748b; transition: all .15s; text-align: center; }
        .pmp-mode-btn.active { border-color: #0ea5e9; background: #f0f9ff; color: #0369a1; }
        .pmp-plan-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          overflow: hidden; transition: box-shadow .15s; }
        .pmp-plan-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
        .pmp-plan-stripe { height: 4px; }
        .pmp-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px;
          border-radius: 99px; font-size: 10px; font-weight: 700; }
      `}</style>

      <div className="pmp-root">

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📋</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>แผน PM (PM Plans)</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>วางแผนและกำหนดกลุ่มเป้าหมาย Preventive Maintenance</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="pmp-input pmp-select" style={{ width: 110 }} value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>ปี {y + 543}</option>)}
            </select>
            <button className="pmp-btn pmp-btn-primary" onClick={() => setModalOpen(true)}>＋ สร้างแผน PM</button>
          </div>
        </div>

        {/* ── Stats Summary ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { icon: '📋', label: 'แผน PM', val: filteredPlans.length, color: '#0ea5e9' },
            { icon: '🎯', label: 'เป้าหมาย', val: totalPlanned, color: '#8b5cf6' },
            { icon: '✅', label: 'เสร็จแล้ว', val: totalDone, color: '#10b981' },
            { icon: '⏳', label: 'รอดำเนินการ', val: totalRuns - totalDone, color: '#f59e0b' },
            { icon: '📊', label: 'ความคืบหน้า', val: `${overallPct}%`, color: progressColor(overallPct) },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Overall progress bar ── */}
        {totalRuns > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>ความคืบหน้ารวม ปี {filterYear + 543}</span>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: progressColor(overallPct), width: `${overallPct}%`, transition: 'width .4s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(overallPct), minWidth: 40 }}>{overallPct}%</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{totalDone}/{totalRuns} เครื่อง</span>
          </div>
        )}

        {/* ── Plan Cards ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0ea5e9' }}>⏳ กำลังโหลด...</div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>ยังไม่มีแผน PM ปี {filterYear + 543}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 16 }}>กดปุ่ม "สร้างแผน PM" เพื่อเริ่มต้น</div>
            <button className="pmp-btn pmp-btn-primary" onClick={() => setModalOpen(true)}>＋ สร้างแผน PM แรก</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {filteredPlans.map((plan: any) => {
              const runs = plan.runs || [];
              const total = plan.totalCount ?? runs.length;
              const done = plan.completedCount ?? runs.filter((r: any) => r.status === 'COMPLETED').length;
              const pct = total > 0 ? Math.round(done / total * 100) : 0;
              const labelParts = [plan.company, plan.site].filter(Boolean);
              const siteLabel = labelParts.length > 0 ? labelParts.join(' - ') : '';
              const deptLabel = plan.deptTask || 'ทุกแผนก';

              // Timeline
              const start = plan.startDate ? new Date(plan.startDate) : null;
              const end = plan.endDate ? new Date(plan.endDate) : null;
              const today = new Date();
              const isActive = start && end && today >= start && today <= end;
              const isOverdue = end && today > end && pct < 100;
              const isDone = pct >= 100;

              return (
                <div className="pmp-plan-card" key={plan.id}>
                  <div className="pmp-plan-stripe" style={{ background: '#0ea5e9' }} />
                  <div style={{ padding: '14px 16px' }}>
                    {/* Plan header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0ea5e915', border: '1px solid #0ea5e930', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          📋
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{deptLabel}</div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginTop: 1 }}>🏢 {siteLabel || 'ทุกบริษัท/ทุกสถานที่'}</div>
                          {plan.deviceType && <div style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600, marginTop: 2 }}>💻 {plan.deviceType}</div>}
                        </div>
                      </div>
                      <span className="pmp-badge" style={{
                        ...(isDone ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
                          : isOverdue ? { background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca' }
                          : isActive ? { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }
                          : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }),
                      }}>
                        {isDone ? '✅ เสร็จสิ้น' : isOverdue ? '⚠️ เกินกำหนด' : isActive ? '🔄 กำลังดำเนิน' : '📅 กำหนดการ'}
                      </span>
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>ความคืบหน้า</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(pct) }}>{pct}% ({done}/{total})</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: progressColor(pct), width: `${pct}%`, transition: 'width .4s' }} />
                      </div>
                    </div>

                    {/* Info row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                      {[
                        { lbl: '🎯 เป้าหมาย', val: `${plan.plannedDeviceCount} เครื่อง` },
                        { lbl: '👤 ผู้รับผิดชอบ', val: plan.lead || '—' },
                        { lbl: '📅 เริ่ม', val: fmtDate(plan.startDate) },
                        { lbl: '🏁 สิ้นสุด', val: fmtDate(plan.endDate) },
                      ].map(i => (
                        <div key={i.lbl} style={{ background: '#f8fafc', borderRadius: 6, padding: '5px 8px' }}>
                          <div style={{ fontSize: 9, color: '#94a3b8' }}>{i.lbl}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{i.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {total === 0 ? (
                        <button
                          className="pmp-btn pmp-btn-success"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => { setGenerateModal({ open: true, plan }); setGenMsg(''); }}
                        >
                          ⚡ Generate งาน PM
                        </button>
                      ) : (
                        <button
                          className="pmp-btn pmp-btn-primary"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => navigate('/pm/runs')}
                        >
                          📋 ดูงาน PM ({total})
                        </button>
                      )}
                      <button
                        className="pmp-btn pmp-btn-outline"
                        onClick={() => navigate('/pm')}
                        title="ดู Dashboard"
                      >📊</button>

                      <button
                        className="pmp-btn pmp-btn-outline"
                        onClick={() => handleOpenEdit(plan)}
                        title="แก้ไขแผน PM"
                      >✏️</button>

                      <button
                        className="pmp-btn pmp-btn-outline"
                        style={{
                          borderColor: '#fecaca',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleDelete(plan.id)}
                        title="ลบแผน PM (ระวัง: ลบข้อมูลที่ตรวจแล้วด้วย)"
                      >🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Plan Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="📋 สร้างแผน PM ใหม่">
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Year */}
          <div>
            <label className="pmp-label">ปีที่วางแผน (พ.ศ.)</label>
            <select className="pmp-input pmp-select" value={form.year} onChange={e => setForm(p => ({ ...p, year: +e.target.value }))}>
              {yearOptions.map(y => <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>)}
            </select>
          </div>

          {/* Company selector */}
          <div>
            <label className="pmp-label">บริษัท (Company)</label>
            <select className="pmp-input pmp-select" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}>
              <option value="">📌 ทุกบริษัท (All Companies)</option>
              {companyOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Location selector */}
          <div>
            <label className="pmp-label">สถานที่ / ไซต์ (Location/Site)</label>
            <select className="pmp-input pmp-select" value={form.site} onChange={e => setForm(p => ({ ...p, site: e.target.value }))}>
              <option value="">📌 ทุกสถานที่ (All Locations)</option>
              {locOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Department selector */}
          <div>
            <label className="pmp-label">แผนก (Department)</label>
            <select className="pmp-input pmp-select" value={form.deptTask} onChange={e => setForm(p => ({ ...p, deptTask: e.target.value }))}>
              <option value="">📌 ทุกแผนก (All Departments)</option>
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Device Type selector */}
          <div>
            <label className="pmp-label">ประเภทอุปกรณ์ (Device Type)</label>
            <select className="pmp-input pmp-select" value={form.deviceType} onChange={e => setForm(p => ({ ...p, deviceType: e.target.value }))}>
              <option value="">📌 ทุกประเภท (All Types)</option>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {(eligibilityLoading || eligibility) && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                สรุปเครื่องที่สามารถสร้างงาน PM ได้
              </div>
              {eligibilityLoading ? (
                <div style={{ fontSize: 11, color: '#64748b' }}>กำลังคำนวณจำนวนเครื่อง...</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      { label: 'ใน scope', value: eligibility.totalInScope, color: '#0ea5e9' },
                      { label: 'มีงานปีนี้แล้ว', value: eligibility.alreadyInYear, color: '#64748b' },
                      { label: 'เหลือสร้างได้', value: eligibility.available, color: '#10b981' },
                      { label: 'จะสร้างได้', value: eligibility.creatable, color: '#f59e0b' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  {eligibility.shortage > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626' }}>
                      จำนวนตามแผนมากกว่าเครื่องที่เหลืออยู่ {eligibility.shortage} เครื่อง
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lead + Target count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="pmp-label">ผู้รับผิดชอบ (Lead)</label>
              <input className="pmp-input" placeholder="ชื่อผู้รับผิดชอบ" value={form.lead} onChange={e => setForm(p => ({ ...p, lead: e.target.value }))} />
            </div>
            <div>
              <label className="pmp-label">จำนวนเครื่องตามแผน</label>
              <input type="number" className="pmp-input" min={1} value={form.plannedDeviceCount} onChange={e => setForm(p => ({ ...p, plannedDeviceCount: +e.target.value }))} />
            </div>
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="pmp-label">วันที่เริ่ม *</label>
              <input type="date" className="pmp-input" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="pmp-label">วันที่สิ้นสุด *</label>
              <input type="date" className="pmp-input" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>

          {/* Duration hint */}
          {form.startDate && form.endDate && (() => {
            const days = Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000);
            const weeks = Math.ceil(days / 7);
            return days > 0 ? (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#0369a1' }}>
                📅 ระยะเวลา {days} วัน ({weeks} สัปดาห์) · สิ้นสุด {fmtDate(form.endDate)}
              </div>
            ) : null;
          })()}

          {/* Template */}
          <div>
            <label className="pmp-label">PM Template (Checklist)</label>
            <select className="pmp-input pmp-select" value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- เลือก Template (ถ้ามี) --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {templates.length === 0 && (
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                💡 ยังไม่มี Template — <span style={{ color: '#0ea5e9', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setModalOpen(false); setTimeout(() => window.location.href = '/pm/templates', 100); }}>สร้าง Template</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="pmp-btn pmp-btn-outline" onClick={() => setModalOpen(false)}>ยกเลิก</button>
          <button className="pmp-btn pmp-btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? '⏳ กำลังสร้าง...' : '✅ สร้างแผน PM'}
          </button>
        </div>
      </Modal>

      {/* ── Edit Plan Modal ── */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="✏️ แก้ไขแผน PM">
        {selectedPlanForEdit && (() => {
          const runs = selectedPlanForEdit.runs || [];
          const totalRuns = selectedPlanForEdit.totalCount ?? runs.length;
          const completedRuns = selectedPlanForEdit.completedCount ?? runs.filter((r: any) => r.status === 'COMPLETED').length;
          const hasCompletedRuns = completedRuns > 0;
          const hasDraftRunsOnly = totalRuns > 0 && completedRuns === 0;
          return (
            <>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {hasCompletedRuns && (
                  <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#c2410c' }}>
                    ⚠️ แผนนี้มีเครื่องที่ดำเนินการตรวจเช็คเสร็จสิ้นแล้ว ไม่สามารถแก้ไขกลุ่มเป้าหมายหรือ Template ได้ เพื่อป้องกันความถูกต้องของข้อมูลประวัติ
                  </div>
                )}
                {hasDraftRunsOnly && (
                  <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#1d4ed8' }}>
                    💡 แผนนี้ยังไม่มีเครื่องที่เริ่มตรวจเช็ค (มีเฉพาะงานร่าง Draft) หากท่านแก้ไขกลุ่มเป้าหมายหรือ Template ระบบจะลบงานร่างเดิมและดึงรายการเครื่องชุดใหม่มา Generate ให้อัตโนมัติ
                  </div>
                )}

                {/* Year */}
                <div>
                  <label className="pmp-label">ปีที่วางแผน (พ.ศ.)</label>
                  <select 
                    className="pmp-input pmp-select" 
                    value={editForm.year} 
                    disabled={hasCompletedRuns}
                    onChange={e => setEditForm(p => ({ ...p, year: +e.target.value }))}
                  >
                    {yearOptions.map(y => <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>)}
                  </select>
                </div>

                {/* Company selector */}
                <div>
                  <label className="pmp-label">บริษัท (Company)</label>
                  <select 
                    className="pmp-input pmp-select" 
                    value={editForm.company} 
                    disabled={hasCompletedRuns}
                    onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))}
                  >
                    <option value="">📌 ทุกบริษัท (All Companies)</option>
                    {companyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Location selector */}
                <div>
                  <label className="pmp-label">สถานที่ / ไซต์ (Location/Site)</label>
                  <select 
                    className="pmp-input pmp-select" 
                    value={editForm.site} 
                    disabled={hasCompletedRuns}
                    onChange={e => setEditForm(p => ({ ...p, site: e.target.value }))}
                  >
                    <option value="">📌 ทุกสถานที่ (All Locations)</option>
                    {locOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Department selector */}
                <div>
                  <label className="pmp-label">แผนก (Department)</label>
                  <select 
                    className="pmp-input pmp-select" 
                    value={editForm.deptTask} 
                    disabled={hasCompletedRuns}
                    onChange={e => setEditForm(p => ({ ...p, deptTask: e.target.value }))}
                  >
                    <option value="">📌 ทุกแผนก (All Departments)</option>
                    {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Device Type selector */}
                <div>
                  <label className="pmp-label">ประเภทอุปกรณ์ (Device Type)</label>
                  <select 
                    className="pmp-input pmp-select" 
                    value={editForm.deviceType} 
                    disabled={hasCompletedRuns}
                    onChange={e => setEditForm(p => ({ ...p, deviceType: e.target.value }))}
                  >
                    <option value="">📌 ทุกประเภท (All Types)</option>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Lead + Target count */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="pmp-label">ผู้รับผิดชอบ (Lead)</label>
                    <input className="pmp-input" placeholder="ชื่อผู้รับผิดชอบ" value={editForm.lead} onChange={e => setEditForm(p => ({ ...p, lead: e.target.value }))} />
                  </div>
                  <div>
                    <label className="pmp-label">จำนวนเครื่องตามแผน</label>
                    <input 
                      type="number" 
                      className="pmp-input" 
                      min={1} 
                      value={editForm.plannedDeviceCount} 
                      disabled={hasCompletedRuns}
                      onChange={e => setEditForm(p => ({ ...p, plannedDeviceCount: +e.target.value }))} 
                    />
                  </div>
                </div>

                {/* Date range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="pmp-label">วันที่เริ่ม *</label>
                    <input type="date" className="pmp-input" value={editForm.startDate} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="pmp-label">วันที่สิ้นสุด *</label>
                    <input type="date" className="pmp-input" value={editForm.endDate} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>

                {/* Duration hint */}
                {editForm.startDate && editForm.endDate && (() => {
                  const days = Math.round((new Date(editForm.endDate).getTime() - new Date(editForm.startDate).getTime()) / 86400000);
                  const weeks = Math.ceil(days / 7);
                  return days > 0 ? (
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#0369a1' }}>
                      📅 ระยะเวลา {days} วัน ({weeks} สัปดาห์) · สิ้นสุด {fmtDate(editForm.endDate)}
                    </div>
                  ) : null;
                })()}

                {/* Template */}
                <div>
                  <label className="pmp-label">PM Template (Checklist)</label>
                  <select 
                    className="pmp-input pmp-select" 
                    value={editForm.templateId} 
                    disabled={hasCompletedRuns}
                    onChange={e => setEditForm(p => ({ ...p, templateId: e.target.value }))}
                  >
                    <option value="">-- เลือก Template (ถ้ามี) --</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
                <button className="pmp-btn pmp-btn-outline" onClick={() => setEditModalOpen(false)}>ยกเลิก</button>
                <button className="pmp-btn pmp-btn-primary" onClick={handleUpdate} disabled={saving}>
                  {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกการแก้ไข'}
                </button>
              </div>
            </>
          );
        })()}
      </Modal>

      {/* ── Generate Workload Modal ── */}
      <Modal open={generateModal.open} onClose={() => setGenerateModal({ open: false, plan: null })} title="⚡ Generate งาน PM">
        <div style={{ padding: '18px 20px' }}>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              แผน: {generateModal.plan?.deptTask || generateModal.plan?.site || 'ทั่วไป'}
            </div>
            <div style={{ fontSize: 11, color: '#0369a1' }}>
              📅 {fmtDate(generateModal.plan?.startDate)} → {fmtDate(generateModal.plan?.endDate)}
              · 🎯 เป้าหมาย {generateModal.plan?.plannedDeviceCount} เครื่อง
            </div>
          </div>
          {generateEligibility && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'ใน scope', value: generateEligibility.totalInScope, color: '#0ea5e9' },
                { label: 'มีงานปีนี้แล้ว', value: generateEligibility.alreadyInYear, color: '#64748b' },
                { label: 'เหลือสร้างได้', value: generateEligibility.available, color: '#10b981' },
                { label: 'กดแล้วจะสร้าง', value: generateEligibility.creatable, color: '#f59e0b' },
              ].map((item) => (
                <div key={item.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{item.label}</div>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0 }}>
            ระบบจะสร้างรายการงาน PM สำหรับทรัพย์สินที่<strong>ยังไม่เคย PM</strong>ในปีนี้
            โดยกรองตาม{generateModal.plan?.deptTask ? 'แผนก' : 'Location'}ที่กำหนดในแผน
          </p>
          {genMsg && (
            <div style={{ marginTop: 12, background: genMsg.includes('ผิดพลาด') ? '#fff5f5' : '#f0fdf4', border: `1px solid ${genMsg.includes('ผิดพลาด') ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: genMsg.includes('ผิดพลาด') ? '#dc2626' : '#16a34a' }}>
              {genMsg}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="pmp-btn pmp-btn-outline" onClick={() => setGenerateModal({ open: false, plan: null })}>ปิด</button>
          {!genMsg && <button className="pmp-btn pmp-btn-success" onClick={handleGenerate}>⚡ Generate</button>}
          {genMsg && !genMsg.includes('ผิดพลาด') && (
            <button className="pmp-btn pmp-btn-primary" onClick={() => { setGenerateModal({ open: false, plan: null }); navigate('/pm/runs'); }}>
              📋 ไปหน้าทำ PM
            </button>
          )}
        </div>
      </Modal>

      {toast && <div className="pmp-toast">{toast}</div>}
    </>
  );
}
