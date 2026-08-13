import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, alpha, useTheme } from '@mui/material';
import { ListChecks, ArrowLeft, Check, X, MinusCircle } from 'lucide-react';
import { deliveryAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SectionCard } from '../../components/SectionCard';
import StatusChip from '../../components/StatusChip';

const ANSWER_OPTIONS: { value: 'PASS' | 'FAIL' | 'NA'; label: string; icon: React.ReactNode; color: (t: any) => string }[] = [
  { value: 'PASS', label: 'ผ่าน', icon: <Check size={13} />, color: (t) => t.palette.success.main },
  { value: 'FAIL', label: 'ไม่ผ่าน', icon: <X size={13} />, color: (t) => t.palette.error.main },
  { value: 'NA', label: 'N/A', icon: <MinusCircle size={13} />, color: (t) => t.palette.text.disabled },
];

function AnswerButtons({ value, onChange }: { value: string | undefined; onChange: (v: 'PASS' | 'FAIL' | 'NA') => void }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {ANSWER_OPTIONS.map(opt => {
        const active = value === opt.value;
        const c = opt.color(theme);
        return (
          <Button
            key={opt.value}
            size="small"
            onClick={() => onChange(opt.value)}
            startIcon={opt.icon}
            sx={{
              minWidth: 0, px: 1, fontSize: 10.5, fontWeight: 700,
              bgcolor: active ? alpha(c, 0.14) : theme.palette.background.default,
              color: active ? c : theme.palette.text.disabled,
              border: `1px solid ${active ? alpha(c, 0.4) : theme.palette.divider}`,
              '&:hover': { bgcolor: alpha(c, 0.1) },
            }}
          >
            {opt.label}
          </Button>
        );
      })}
    </Box>
  );
}

function ChecklistRunEditor({ requestId, onBack, onCompleted }: { requestId: number; onBack: () => void; onCompleted: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<number, { value: string; note: string }>>({});

  const load = () => {
    setLoading(true);
    deliveryAPI.getChecklistRun(requestId).then(res => {
      setRun(res.data);
      const map: Record<number, { value: string; note: string }> = {};
      (res.data.answers || []).forEach((a: any) => { map[a.itemId] = { value: a.value || '', note: a.note || '' }; });
      setAnswers(map);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [requestId]);

  if (loading || !run) {
    return <SectionCard title="Setup Checklist" icon={ListChecks}><Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled', fontSize: 13 }}>⏳ กำลังโหลด...</Box></SectionCard>;
  }

  const items: any[] = run.checklistSet.items;
  const categories = Array.from(new Set(items.map(i => i.category)));
  const answeredCount = Object.values(answers).filter(a => a.value).length;
  const pct = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;

  const setAnswer = (itemId: number, value: 'PASS' | 'FAIL' | 'NA') => {
    setAnswers(prev => ({ ...prev, [itemId]: { value, note: prev[itemId]?.note || '' } }));
  };
  const setNote = (itemId: number, note: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: { value: prev[itemId]?.value || '', note } }));
  };

  const toPayload = () => Object.entries(answers)
    .filter(([, a]) => a.value)
    .map(([itemId, a]) => ({ itemId: Number(itemId), value: a.value, note: a.note || undefined }));

  const handleSave = async (status: 'DRAFT' | 'DONE') => {
    if (status === 'DONE' && answeredCount < items.length) {
      toast.error(`ยังตอบไม่ครบ (${answeredCount}/${items.length} หัวข้อ) — กรุณาตอบให้ครบก่อนปิดงาน`);
      return;
    }
    setSaving(true);
    try {
      await deliveryAPI.performChecklistRun(requestId, { answers: toPayload(), status });
      if (status === 'DONE') {
        toast.success('บันทึกผลและปิดงาน Setup สำเร็จ');
        onCompleted();
      } else {
        toast.success('บันทึกความคืบหน้าแล้ว');
        load();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" startIcon={<ArrowLeft size={14} />} onClick={onBack}>กลับ</Button>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{run.checklistSet.docCode} — {run.checklistSet.name}</Typography>
        </Box>

        {categories.map((cat, ci) => {
          const catItems = items.filter(i => i.category === cat);
          const catDone = catItems.filter(i => answers[i.id]?.value).length;
          return (
            <SectionCard key={cat} title={`หมวดที่ ${ci + 1} — ${cat}`} icon={ListChecks}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', mb: 1 }}>{catItems.length} หัวข้อ · ตอบแล้ว {catDone}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}>#</TableCell>
                      <TableCell>รายการตรวจสอบ</TableCell>
                      <TableCell sx={{ width: 60 }}>อ้างอิง</TableCell>
                      <TableCell sx={{ width: 190 }}>ผล</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catItems.map((item, idx) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontSize: 11, color: 'text.disabled' }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.78rem' }}>{item.itemText}</Typography>
                          {answers[item.id]?.value === 'FAIL' && (
                            <TextField
                              size="small" placeholder="หมายเหตุ (เช่น รอทีมเครือข่าย)" fullWidth
                              value={answers[item.id]?.note || ''}
                              onChange={e => setNote(item.id, e.target.value)}
                              sx={{ mt: 0.5, '& .MuiInputBase-input': { fontSize: '0.72rem', py: 0.5 } }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>{item.refCode}</TableCell>
                        <TableCell>
                          <AnswerButtons value={answers[item.id]?.value} onChange={(v) => setAnswer(item.id, v)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SectionCard title="ความคืบหน้า" icon={ListChecks}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color: theme.palette.primary.main }}>{answeredCount}</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>/ {items.length} หัวข้อ</Typography>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: theme.palette.primary.main }}>{pct}%</Typography>
          </Box>
          <Box sx={{ height: 8, borderRadius: 99, bgcolor: theme.palette.background.default, mb: 1.5 }}>
            <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 99, bgcolor: theme.palette.primary.main, transition: 'width .3s' }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              const catDone = catItems.filter(i => answers[i.id]?.value).length;
              return (
                <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span>{cat}</span>
                  <Box component="span" sx={{ fontWeight: 700, color: catDone === catItems.length ? theme.palette.success.main : theme.palette.warning.main }}>
                    {catDone}/{catItems.length}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </SectionCard>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button variant="outlined" onClick={() => handleSave('DRAFT')} disabled={saving}>บันทึกความคืบหน้า</Button>
          <Button variant="contained" onClick={() => handleSave('DONE')} disabled={saving || run.status === 'DONE'}>
            {run.status === 'DONE' ? '✓ ปิดงานแล้ว' : 'บันทึกผลและปิดงาน Setup'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function SetupChecklistTab({ requests, loading, onRefresh }: { requests: any[]; loading: boolean; onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const eligible = requests.filter(r => ['DRAFT', 'SETUP_IN_PROGRESS', 'SETUP_DONE'].includes(r.status));

  if (selectedId) {
    return (
      <ChecklistRunEditor
        requestId={selectedId}
        onBack={() => setSelectedId(null)}
        onCompleted={() => { setSelectedId(null); onRefresh(); }}
      />
    );
  }

  return (
    <SectionCard title="Setup Checklist" icon={ListChecks}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ผู้รับ</TableCell>
              <TableCell>แผนก</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>กำลังโหลด...</TableCell></TableRow>
            ) : eligible.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>ยังไม่มีรายการที่ต้องทำ Setup Checklist</TableCell></TableRow>
            ) : eligible.map(r => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.recipientName}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{r.recipientDept || '-'}</TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => setSelectedId(r.id)}>
                    {r.status === 'SETUP_DONE' ? 'ดูผล' : 'ทำ Checklist'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
}
