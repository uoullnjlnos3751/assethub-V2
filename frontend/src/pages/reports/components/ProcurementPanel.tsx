import React from 'react';
import { Box, Card, Grid, Typography, CircularProgress, alpha } from '@mui/material';

/**
 * เอกสารข้อเสนอสำหรับหน่วยงานเอาไปยื่นผู้บริหาร
 *
 * คนละเอกสารกับ "ความคืบหน้า PM" ที่อยู่หน้าเดียวกัน: อันนั้นตอบว่า IT ทำงานไป
 * เท่าไร อันนี้ตอบว่าหน่วยงานต้องซื้ออะไร และมีคนอ่านคนละกลุ่ม
 *
 * สองอย่างที่ตั้งใจให้เป็นแบบนี้:
 *
 *   ความครบของข้อมูลอยู่บนสุด ไม่ซ่อนท้ายเอกสาร — ออกได้ตลอดเวลาโดยไม่ต้องรอ
 *   PM ครบ ผู้อ่านจึงต้องรู้ตั้งแต่บรรทัดแรกว่ากำลังอ่านข้อสรุปจากเครื่องกี่ %
 *
 *   ช่องราคาเว้นว่าง — ทะเบียนมีราคาซื้ออยู่ 4 จาก 522 เครื่อง การใส่ตัวเลขเดา
 *   ลงไปจะทำให้ทั้งฉบับเสียความน่าเชื่อถือ ปล่อยให้จัดซื้อตีราคาเอง
 */

interface Props {
  data: any;
  loading: boolean;
  company: string;
  theme: any;
}

export default function ProcurementPanel({ data, loading, company, theme }: Props) {
  if (!company) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          เลือกบริษัทด้านบนเพื่อออกเอกสารข้อเสนอ
        </Typography>
      </Card>
    );
  }
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={22} /></Box>;
  }
  if (!data) {
    return <Card sx={{ p: 3 }}><Typography sx={{ fontSize: 13 }}>ออกเอกสารไม่สำเร็จ</Typography></Card>;
  }

  const c = data.coverage;
  const sections: { key: string; no: string; title: string; note: string; items: any[]; tone: 'warning' | 'error' }[] = [
    {
      key: 'addRam', no: '①', title: 'ควรเพิ่มหน่วยความจำ (RAM)', tone: 'warning',
      note: 'เกณฑ์: ช่างประเมินรอบ PM ว่าเครื่องเริ่มหน่วงหนืด และ RAM ไม่เกิน 8 GB — เพิ่ม RAM ถูกกว่าเปลี่ยนเครื่องมาก',
      items: data.addRam || [],
    },
    {
      key: 'replaceBattery', no: '②', title: 'ควรเปลี่ยนแบตเตอรี่', tone: 'error',
      note: 'เกณฑ์: ระบบ Agent วัดสุขภาพแบตเตอรี่ได้ต่ำกว่า 50%',
      items: data.replaceBattery || [],
    },
    {
      key: 'replaceMachine', no: '③', title: 'ควรพิจารณาเปลี่ยนเครื่อง', tone: 'error',
      note: 'เกณฑ์: ช่างประเมินว่าช้า ทั้งที่ RAM เพียงพอแล้ว การเพิ่ม RAM จึงไม่น่าช่วย — ควรตรวจดิสก์ก่อนตัดสินใจ',
      items: data.replaceMachine || [],
    },
  ];
  const totalItems = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <Box id="report-content" sx={{ bgcolor: 'background.paper', borderRadius: 4, p: 3, border: `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ textAlign: 'center', mb: 2.5, pb: 2, borderBottom: `2px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: 19, fontWeight: 800 }}>
          สรุปผลการตรวจบำรุงรักษา (PM) และข้อเสนอเพื่อพิจารณา
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mt: 0.5 }}>
          บริษัท {data.company} · ปี {data.year}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.75 }}>
          ออกเอกสารเมื่อ {new Date(data.generatedAt).toLocaleString('th-TH')}
        </Typography>
      </Box>

      <Box sx={{
        p: '10px 14px', mb: 2.5, borderRadius: '10px',
        bgcolor: alpha(theme.palette.info.main, 0.07),
        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
      }}>
        <Typography sx={{ fontSize: 11.5, lineHeight: 1.9 }}>
          เอกสารนี้สรุปจากเครื่องที่ <b>ตรวจ PM แล้ว {c.pmCompleted} จาก {c.totalAssets} เครื่อง ({c.pmPercent}%)</b>
          {c.pmPercent < 100 && ' — ยังตรวจไม่ครบทั้งบริษัท อาจมีเครื่องเข้าเกณฑ์เพิ่มเมื่อตรวจครบ'}
          <br />
          หัวข้อแบตเตอรี่อ่านค่าได้จาก <b>{c.withBattery ?? 0} เครื่อง</b>
          {' '}(บริษัทนี้ติดตั้งระบบ Agent แล้ว {c.withAgent} เครื่อง — เครื่องตั้งโต๊ะไม่มีแบตเตอรี่ให้อ่าน)
          {c.withAgent === 0 && ' — บริษัทนี้ยังไม่มีเครื่องใดติดตั้ง จึงยังไม่มีข้อมูลแบตเตอรี่'}
        </Typography>
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {sections.map(s => (
          <Grid item xs={12} sm={4} key={s.key}>
            <Card variant="outlined" sx={{ p: '12px 14px', height: '100%' }}>
              <Typography sx={{
                fontSize: 26, fontWeight: 800, lineHeight: 1,
                color: s.items.length ? theme.palette[s.tone].main : theme.palette.text.disabled,
              }}>
                {s.items.length}
              </Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, mt: 0.5 }}>{s.no} {s.title}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {totalItems === 0 && (
        <Card variant="outlined" sx={{ p: 3, textAlign: 'center', mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'success.main' }}>
            ไม่มีรายการที่ต้องเสนอในรอบนี้
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
            จากเครื่องที่ตรวจแล้ว ไม่พบเครื่องที่เข้าเกณฑ์เพิ่ม RAM เปลี่ยนแบตเตอรี่ หรือเปลี่ยนเครื่อง
          </Typography>
        </Card>
      )}

      {sections.filter(s => s.items.length > 0).map(s => (
        <Box key={s.key} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: theme.palette[s.tone].main }}>
            {s.no} {s.title} — {s.items.length} เครื่อง
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 0.75 }}>{s.note}</Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{
              width: '100%', minWidth: 720, borderCollapse: 'collapse',
              '& th': {
                fontSize: 10, fontWeight: 700, textAlign: 'left', p: '6px 8px',
                bgcolor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}`,
              },
              '& td': {
                fontSize: 11, p: '6px 8px', borderBottom: `1px solid ${theme.palette.divider}`,
                verticalAlign: 'top',
              },
            }}>
              <thead>
                <tr>
                  <th>เครื่อง</th>
                  <th>แผนก</th>
                  <th>ผู้ใช้งาน</th>
                  <th>สเปกปัจจุบัน</th>
                  <th>เหตุผล</th>
                  <th>ข้อเสนอ</th>
                  <th>ราคาประเมิน</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((it: any) => (
                  <tr key={`${s.key}-${it.assetId}`}>
                    <td style={{ fontWeight: 600 }}>{it.assetName}</td>
                    <td>{it.department || '—'}</td>
                    <td>{it.ownerName || '—'}</td>
                    <td>
                      {it.ram || '—'}
                      {it.batteryPct !== null && it.batteryPct !== undefined && (
                        <>
                          <br />
                          <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                            แบต {it.batteryPct}%
                          </Box>
                        </>
                      )}
                    </td>
                    <td style={{ color: theme.palette.text.secondary }}>{it.reason}</td>
                    <td style={{ fontWeight: 600 }}>{it.proposal}</td>
                    <td style={{ color: theme.palette.text.disabled }}>{'…'.repeat(6)}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        </Box>
      ))}

      <Box sx={{ mt: 3, pt: 1.5, borderTop: `1px dashed ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.9 }}>
          <b>ข้อมูลประกอบ (ไม่ได้เสนอในรอบนี้)</b>
          <br />
          บริษัทนี้ยังมีเครื่องที่ RAM ไม่เกิน 8 GB อีก <b>{data.context?.lowRamNotFlagged ?? 0} เครื่อง</b>
          {' '}ที่ยังไม่มีผลประเมินว่าช้า จึงยังไม่นำมาเสนอ — อาจต้องพิจารณาในรอบถัดไป
          <br />
          การกระจาย RAM ทั้งบริษัท:{' '}
          {Object.entries(data.context?.ramDistribution || {}).map(([k, v]) => `${k} ${v} เครื่อง`).join(' · ')}
        </Typography>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {['ผู้จัดทำ (ฝ่าย IT)', 'ผู้อนุมัติ'].map(role => (
          <Box key={role} sx={{ textAlign: 'center' }}>
            <Box sx={{ borderBottom: `1px dotted ${theme.palette.text.disabled}`, width: 170, mb: 0.5, height: 34 }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{role}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
