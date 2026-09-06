import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Card, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import { pmSwHubTemplateService, PMSwHubTemplate } from '../../services/pmSwHub';
import { Modal } from './components/Modal';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function PMSwHubTemplateListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PMSwHubTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await pmSwHubTemplateService.getAll();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number, label?: string) => {
    if (!await confirm({ title: 'ลบ Template', target: label })) return;
    try {
      await pmSwHubTemplateService.delete(id);
      loadTemplates();
    } catch (err) {
      alert('ลบไม่สำเร็จ');
    }
  };

  const handleCreate = (type: '7' | '9') => {
    navigate(`/pm/sw-hub/template/new?preset=${type}`);
  };

  if (loading) {
    return <Box sx={{ textAlign: 'center', p: 5, color: 'primary.main' }}>กำลังโหลด...</Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" /> PM Template (Checklist)
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>สร้างและจัดการรายการตรวจสอบ PM แบบ Customize</Typography>
        </Box>
        {/* หน้านี้เคยไม่มีทางกลับเลย — เข้าถึงได้ทางเมนูข้างทางเดียว
            พอเมนูเหลือทางเข้าเดียวที่หน้าภาพรวม จึงต้องมีปุ่มกลับ */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<BarChartIcon />} onClick={() => navigate('/pm/sw-hub')}>Dashboard</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>สร้าง Template ใหม่</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
        {templates.map(t => (
          <Card variant="outlined" key={t.id} sx={{ overflow: 'hidden' }}>
            <Box sx={{ height: 4, bgcolor: t.isActive ? 'success.main' : 'action.disabledBackground' }} />
            <Box sx={{ p: 2.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t.name}</Typography>
                {t.isActive && <Chip size="small" label="ใช้งานอยู่" color="success" variant="outlined" sx={{ fontWeight: 700 }} />}
              </Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2, minHeight: 36 }}>{t.description || 'ไม่มีคำอธิบาย'}</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.25 }}>
                <Box sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChecklistIcon sx={{ fontSize: 16 }} /> {(t as any)._count?.items || 0} ข้อ
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ToggleOnIcon sx={{ fontSize: 16 }} /> ใช่ / ไม่ใช่ / N/A
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" fullWidth startIcon={<VisibilityIcon />} onClick={() => navigate(`/pm/sw-hub/template/${t.id}`)}>Preview</Button>
                <Button size="small" variant="outlined" fullWidth startIcon={<EditIcon />} onClick={() => navigate(`/pm/sw-hub/template/${t.id}/edit`)}>แก้ไข</Button>
                {!t.isActive && (
                  <IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDelete(t.id, t.name)}><DeleteIcon fontSize="small" /></IconButton>
                )}
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="เลือกรูปแบบ Template" maxWidth={420}>
        <Box sx={{ p: '16px 20px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Card
            variant="outlined"
            onClick={() => handleCreate('7')}
            sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) } }}
          >
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.16 : 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArticleIcon color="info" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>แบบมาตรฐาน (7 ข้อ)</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>รายการตรวจสอบพื้นฐานสำหรับ Hub Room</Typography>
            </Box>
          </Card>

          <Card
            variant="outlined"
            onClick={() => handleCreate('9')}
            sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) } }}
          >
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.16 : 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DescriptionIcon color="success" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>แบบเต็มรูปแบบ (9 ข้อ)</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>เพิ่มรายการตรวจสอบระบบวิกฤต (TRR Standard)</Typography>
            </Box>
          </Card>
        </Box>
        <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>ยกเลิก</Button>
        </Box>
      </Modal>
    </Box>
  );
}
