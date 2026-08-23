import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { UserCheck, ArrowDown } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { custodyHolderLabel } from '../../../constants/custodyHolders';

/**
 * เครื่องนี้อยู่กับใคร และก่อนหน้านี้อยู่กับใคร
 *
 * เป็นคำถามที่ถูกถามบ่อยที่สุดเกี่ยวกับทรัพย์สินหนึ่งชิ้น แต่คำตอบเคยกระจายอยู่
 * สามที่ — ช่องผู้ครอบครองในการ์ดภาพรวม ช่องจุดรับฝากที่ไม่ได้แสดงที่ไหนเลย
 * และแถวเปลี่ยนมือที่ปนอยู่กับเหตุการณ์อื่นในไทม์ไลน์
 *
 * รวมไว้ที่เดียวและอ่านจาก assetHistory ที่หน้านี้โหลดมาอยู่แล้ว ไม่ต้องยิง API เพิ่ม
 */

type Hand = {
  at: Date | null;
  from: string | null;
  to: string | null;
  kind: 'owner' | 'custody';
  note: string | null;
  actor: string | null;
};

const label = (v: string | null | undefined, kind: 'owner' | 'custody') => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return kind === 'custody' ? custodyHolderLabel(s) : s;
};

/** ระยะเวลาที่ถืออยู่ — ตัวเลขที่บอกได้ว่าเครื่องค้างที่ไหนนานผิดปกติไหม */
function held(from: Date | null, to: Date | null): string {
  if (!from) return '';
  const days = Math.max(0, Math.round(((to ?? new Date()).getTime() - from.getTime()) / 86_400_000));
  if (days < 1) return 'วันนี้';
  if (days < 31) return `${days} วัน`;
  if (days < 365) return `${Math.round(days / 30)} เดือน`;
  return `${(days / 365).toFixed(1)} ปี`;
}

export function CustodyChainCard({ asset }: { asset: any }) {
  const theme = useTheme();

  const chain = useMemo<Hand[]>(() => {
    const rows: Hand[] = [];
    for (const h of asset?.assetHistory || []) {
      const kind: 'owner' | 'custody' | null =
        h.actionType === 'OWNER_CHANGE' ? 'owner'
          : h.actionType === 'CUSTODY_CHANGE' ? 'custody'
            : null;
      if (!kind) continue;
      rows.push({
        at: h.createdAt ? new Date(h.createdAt) : null,
        // ช่อง fromLoc/toLoc เก็บรหัสจุดรับฝาก ส่วน fromOwner/toOwner เก็บชื่อคน
        from: kind === 'custody' ? (label(h.fromLoc, 'custody') ?? label(h.fromOwner, 'owner')) : label(h.fromOwner, 'owner'),
        to: kind === 'custody' ? (label(h.toLoc, 'custody') ?? label(h.toOwner, 'owner')) : label(h.toOwner, 'owner'),
        kind,
        note: h.note ?? null,
        actor: h.actor?.displayName ?? null,
      });
    }
    return rows.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  }, [asset]);

  const holder = asset?.custodyHolder
    ? { name: custodyHolderLabel(asset.custodyHolder), kind: 'custody' as const,
        since: asset.custodyUpdatedAt ? new Date(asset.custodyUpdatedAt) : null,
        note: asset.custodyNote as string | null }
    : asset?.ownerName
      ? { name: String(asset.ownerName), kind: 'owner' as const, since: null, note: null }
      : null;

  const tone = holder?.kind === 'custody' ? theme.palette.warning.main : theme.palette.success.main;

  return (
    <SectionCard title="การครอบครอง" icon={UserCheck}
      subtitle={chain.length ? `เปลี่ยนมือ ${chain.length} ครั้ง` : undefined}>

      {/* ── ตอนนี้อยู่กับใคร ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, p: '12px 14px', borderRadius: 2,
        bgcolor: holder ? alpha(tone, 0.08) : 'action.hover',
        border: `1px solid ${holder ? alpha(tone, 0.28) : theme.palette.divider}`,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          bgcolor: holder ? alpha(tone, 0.16) : 'action.selected',
          color: tone, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
        }}>
          {holder ? holder.name.trim().charAt(0).toUpperCase() : '—'}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 600, letterSpacing: '.04em' }}>
            {holder?.kind === 'custody' ? 'ฝากไว้ที่' : 'อยู่กับ'}
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {holder?.name ?? 'ยังไม่ได้ระบุผู้ครอบครอง'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {holder?.since ? `ตั้งแต่ ${holder.since.toLocaleDateString('th-TH')} · ${held(holder.since, null)}` : null}
            {holder?.kind === 'owner' && asset?.departmentId ? `แผนก ${asset.departmentId}` : null}
            {!holder ? 'เครื่องนี้ยังไม่มีใครถือตามทะเบียน' : null}
          </Typography>
          {holder?.note && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25, fontStyle: 'italic' }}>
              “{holder.note}”
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── ก่อนหน้านี้อยู่กับใคร ── */}
      {chain.length > 0 && (
        <Box sx={{ mt: 1.75 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'text.disabled', mb: 1 }}>
            ก่อนหน้านี้
          </Typography>
          {chain.slice(0, 6).map((h, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.25 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: '3px' }}>
                <ArrowDown size={13} style={{ color: theme.palette.text.disabled }} />
                {i < Math.min(chain.length, 6) - 1 && (
                  <Box sx={{ width: 1, flex: 1, minHeight: 14, bgcolor: 'divider', mt: '2px' }} />
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  <Box component="span" sx={{ color: 'text.disabled' }}>{h.from ?? '—'}</Box>
                  <Box component="span" sx={{ mx: 0.75, color: 'text.disabled' }}>→</Box>
                  <Box component="span" sx={{ fontWeight: 600 }}>{h.to ?? 'ไม่ระบุ'}</Box>
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
                  {h.at ? h.at.toLocaleDateString('th-TH') : 'ไม่ทราบวันที่'}
                  {h.actor ? ` · โดย ${h.actor}` : ''}
                  {h.kind === 'custody' ? ' · จุดรับฝาก' : ''}
                </Typography>
              </Box>
            </Box>
          ))}
          {chain.length > 6 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              และอีก {chain.length - 6} ครั้ง — ดูทั้งหมดในแท็บบันทึกกิจกรรม
            </Typography>
          )}
        </Box>
      )}

      {chain.length === 0 && (
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.5 }}>
          ยังไม่มีบันทึกการเปลี่ยนมือ — ประวัติจะเริ่มนับเมื่อมีการเปลี่ยนผู้ครอบครองหรือฝากเข้าจุดรับฝาก
        </Typography>
      )}
    </SectionCard>
  );
}
