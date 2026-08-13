import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, alpha, useTheme } from '@mui/material';
import { Building2, Network } from 'lucide-react';
import { assetAPI, departmentAPI } from '../../../services/api';
import { SectionCard } from '../../../components/SectionCard';

interface Company { id: number; code?: string | null; name: string; nameEng?: string | null; description?: string | null; isActive: boolean; assetCount?: number }
interface Department { id: number; name: string; nameEng?: string | null; code: string; description?: string | null }

export default function CompanyOrgTab() {
  const theme = useTheme();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([assetAPI.companies(), departmentAPI.list()])
      .then(([c, d]) => { setCompanies(c.data || []); setDepartments(d.data || []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      <Box sx={{
        borderRadius: '12px', p: 1.75,
        bgcolor: alpha(theme.palette.info.main, 0.05),
        border: `1px dashed ${alpha(theme.palette.info.main, 0.35)}`,
      }}>
        <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, lineHeight: 1.7 }}>
          📘 บริษัทและแผนกด้านล่างเป็นข้อมูลจริงจากระบบ แต่ตอนนี้ทั้งสองตารางยังไม่มีความสัมพันธ์แบบลำดับชั้น
          (บริษัท → แผนก) เก็บอยู่ในฐานข้อมูล — จึงยังไม่มีผังองค์กรแบบภาพให้แสดง เพื่อไม่ให้แสดงโครงสร้างที่ไม่ตรงความจริง
        </Typography>
      </Box>

      <SectionCard title="บริษัทในเครือ" icon={Building2}>
        <TableContainer>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', fontSize: 13, color: theme.palette.text.disabled }}>⏳ กำลังโหลด...</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อบริษัท</TableCell>
                  <TableCell>ทรัพย์สิน</TableCell>
                  <TableCell align="center">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.palette.primary.dark, bgcolor: alpha(theme.palette.primary.main, 0.08), px: '7px', py: '2px', borderRadius: '5px' }}>
                        {c.code || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.name}</Typography>
                      {c.nameEng && <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>{c.nameEng}</Typography>}
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.75rem' }}>{c.assetCount ?? 0} รายการ</Typography></TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={c.isActive !== false ? 'ใช้งาน' : 'ปิด'} sx={c.isActive !== false ? {
                        bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark,
                      } : {
                        bgcolor: theme.palette.background.default, color: theme.palette.text.disabled,
                      }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </SectionCard>

      <SectionCard title="แผนก/หน่วยงาน" icon={Network}>
        <TableContainer>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', fontSize: 13, color: theme.palette.text.disabled }}>⏳ กำลังโหลด...</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อแผนก</TableCell>
                  <TableCell>รายละเอียด</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {departments.map(d => (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.palette.secondary.dark, bgcolor: alpha(theme.palette.secondary.main, 0.08), px: '7px', py: '2px', borderRadius: '5px' }}>
                        {d.code}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{d.name}</Typography>
                      {d.nameEng && <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>{d.nameEng}</Typography>}
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>{d.description || '—'}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, mt: 1 }}>
          จัดการบริษัท/แผนกแบบเต็มรูปแบบได้ที่เมนู "ข้อมูลหลัก"
        </Typography>
      </SectionCard>
    </Box>
  );
}
