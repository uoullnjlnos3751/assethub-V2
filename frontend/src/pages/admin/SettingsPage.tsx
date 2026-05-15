import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Switch, FormControlLabel,
  Button, Alert, CircularProgress, Divider, Stack, IconButton, Tooltip,
  Paper, Tabs, Tab, Fade
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  Bell as NotificationsIcon, 
  Mail as MailIcon, 
  MessageSquare as TeamsIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Layout as LayoutIcon,
  FileText as TemplateIcon,
  Zap as EventIcon
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Fade in={true} timeout={400}>
          <Box sx={{ py: 3 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([adminAPI.settings(), adminAPI.notificationTemplates()])
      .then(([s, t]) => { 
        setSettings(s.data); 
        setTemplates(t.data); 
      })
      .catch(err => console.error('Load settings failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSuccess('');
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await adminAPI.updateSettings(settings);
      setSuccess('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleUpdateTemplate = async (id: number, data: any) => {
    try {
      await adminAPI.updateNotificationTemplate(id, data);
      setSuccess('บันทึก Template เรียบร้อยแล้ว');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      alert('เกิดข้อผิดพลาดในการบันทึก Template'); 
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <CircularProgress thickness={4} size={50} />
      <Typography color="text.secondary">กำลังโหลดการตั้งค่าระบบ...</Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 1, md: 3 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 3, 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          boxShadow: '0 4px 12px rgba(21, 101, 192, 0.3)'
        }}>
          <SettingsIcon size={28} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            ตั้งค่าระบบ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            จัดการการแจ้งเตือนและข้อความในระบบ AssetHub
          </Typography>
        </Box>
      </Box>

      {success && (
        <Fade in={!!success}>
          <Alert 
            severity="success" 
            variant="filled"
            sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)' }}
          >
            {success}
          </Alert>
        </Fade>
      )}

      {/* Tabs Menu */}
      <Paper sx={{ borderRadius: 3, mb: 1, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            icon={<NotificationsIcon size={18} />} 
            iconPosition="start" 
            label="การแจ้งเตือน" 
            sx={{ py: 2, fontWeight: 600 }}
          />
          <Tab 
            icon={<TemplateIcon size={18} />} 
            iconPosition="start" 
            label="ข้อความ (Templates)" 
            sx={{ py: 2, fontWeight: 600 }}
          />
        </Tabs>
      </Paper>

      {/* Tab 1: General Notifications */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayoutIcon size={20} className="text-primary" />
                  ช่องทางการส่งข้อมูล
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Stack spacing={3}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: settings?.enableEmail ? 'success.lighter' : 'grey.50', border: '1px solid', borderColor: settings?.enableEmail ? 'success.light' : 'divider', transition: '0.3s' }}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={settings?.enableEmail} 
                          onChange={(e) => setSettings({ ...settings, enableEmail: e.target.checked })} 
                          color="success"
                        />
                      } 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MailIcon size={18} />
                          <Typography fontWeight={600}>เปิดใช้งาน Email</Typography>
                        </Box>
                      } 
                    />
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: settings?.enableTeams ? 'primary.lighter' : 'grey.50', border: '1px solid', borderColor: settings?.enableTeams ? 'primary.light' : 'divider', transition: '0.3s' }}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={settings?.enableTeams} 
                          onChange={(e) => setSettings({ ...settings, enableTeams: e.target.checked })} 
                          color="primary"
                        />
                      } 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TeamsIcon size={18} />
                          <Typography fontWeight={600}>เปิดใช้งาน Microsoft Teams</Typography>
                        </Box>
                      } 
                    />
                  </Box>

                  {settings?.enableTeams && (
                    <Fade in={settings?.enableTeams}>
                      <TextField 
                        label="Microsoft Teams Webhook URL" 
                        fullWidth 
                        variant="outlined"
                        placeholder="https://outlook.office.com/webhook/..."
                        value={settings?.teamsWebhookUrl || ''} 
                        onChange={(e) => setSettings({ ...settings, teamsWebhookUrl: e.target.value })} 
                        sx={{ mt: 1 }}
                      />
                    </Fade>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon size={20} className="text-warning" />
                  เหตุการณ์ที่แจ้งเตือน
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  ระบุ Event Keys ที่ต้องการให้ระบบส่งแจ้งเตือน (คั่นด้วยเครื่องหมาย ,)
                </Typography>

                <TextField 
                  fullWidth 
                  multiline
                  rows={6}
                  value={settings?.enabledEventKeys || ''} 
                  onChange={(e) => setSettings({ ...settings, enabledEventKeys: e.target.value })} 
                  placeholder="เช่น borrow_request_pending, borrow_approved"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'grey.50' }
                  }}
                />
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 2, display: 'flex', gap: 1.5 }}>
                  <InfoIcon size={20} style={{ flexShrink: 0, color: '#0288d1' }} />
                  <Typography variant="caption" color="info.dark">
                    <strong>คีย์ที่แนะนำ:</strong> borrow_request_pending, borrow_approved, borrow_rejected, checkout_completed, return_recorded, overdue_borrow, pm_overdue
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                variant="contained" 
                size="large"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon size={20} />}
                onClick={handleSaveSettings} 
                disabled={saving}
                sx={{ 
                  borderRadius: 3, 
                  px: 4, 
                  py: 1.5,
                  fontWeight: 700,
                  boxShadow: '0 8px 20px rgba(21, 101, 192, 0.25)'
                }}
              >
                บันทึกการตั้งค่าทั้งหมด
              </Button>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Notification Templates */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>ปรับแต่งเนื้อหาข้อความ</Typography>
          <Tooltip title="คุณสามารถใช้ตัวแปร {{variable}} ในเนื้อหาได้">
            <IconButton size="small"><InfoIcon size={18} /></IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={3}>
          {templates.map((t) => (
            <Card key={t.id} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'visible' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      bgcolor: t.channel === 'EMAIL' ? 'success.lighter' : 'primary.lighter',
                      color: t.channel === 'EMAIL' ? 'success.main' : 'primary.main'
                    }}>
                      {t.channel === 'EMAIL' ? <MailIcon size={20} /> : <TeamsIcon size={20} />}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{t.key}</Typography>
                      <Typography variant="caption" color="text.secondary">Channel: {t.channel}</Typography>
                    </Box>
                  </Box>
                  <Button 
                    size="small" 
                    variant="contained" 
                    color="inherit"
                    startIcon={<SaveIcon size={16} />}
                    onClick={() => handleUpdateTemplate(t.id, { subjectTh: t.subjectTh, bodyTh: t.bodyTh })}
                    sx={{ borderRadius: 2, fontWeight: 600, bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
                  >
                    บันทึก Template นี้
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField 
                      label="หัวข้อข้อความ (Subject)" 
                      fullWidth 
                      size="small" 
                      value={t.subjectTh} 
                      onChange={(e) => setTemplates(templates.map((x: any) => x.id === t.id ? { ...x, subjectTh: e.target.value } : x))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      label="เนื้อหา (Message Body)" 
                      fullWidth 
                      size="small" 
                      multiline 
                      rows={4} 
                      value={t.bodyTh} 
                      onChange={(e) => setTemplates(templates.map((x: any) => x.id === t.id ? { ...x, bodyTh: e.target.value } : x))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>
    </Box>
  );
}
