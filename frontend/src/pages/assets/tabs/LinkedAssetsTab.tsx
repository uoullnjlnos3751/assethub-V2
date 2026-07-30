import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Grid, CircularProgress, Chip, Button } from '@mui/material';
import { assetAPI } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import MonitorIcon from '@mui/icons-material/Monitor';
import LaptopIcon from '@mui/icons-material/Laptop';
import DevicesIcon from '@mui/icons-material/Devices';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface LinkedAssetsTabProps {
  asset: any;
}

export default function LinkedAssetsTab({ asset }: LinkedAssetsTabProps) {
  const [linkedAssets, setLinkedAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLinked = async () => {
      if (!asset?.ownerName) {
        setLinkedAssets([]);
        setLoading(false);
        return;
      }
      try {
        const res = await assetAPI.list({ exactOwnerName: asset.ownerName, limit: 100 });
        const all = res.data.data || [];
        // Filter out the current asset
        const filtered = all.filter((a: any) => a.id !== asset.id);
        setLinkedAssets(filtered);
      } catch (err) {
        console.error('Failed to load linked assets', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLinked();
  }, [asset]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (!asset?.ownerName) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="h6">ไม่มีข้อมูลผู้ถือครอง</Typography>
        <Typography variant="body2">ไม่สามารถระบุอุปกรณ์ที่เชื่อมโยงได้เนื่องจากทรัพย์สินนี้ไม่มีผู้ถือครอง</Typography>
      </Box>
    );
  }

  if (linkedAssets.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="h6">ไม่พบอุปกรณ์อื่นที่เชื่อมโยง</Typography>
        <Typography variant="body2">ผู้ถือครอง '{asset.ownerName}' ไม่มีอุปกรณ์อื่นในระบบ</Typography>
      </Box>
    );
  }

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('คอมพิวเตอร์') || t.includes('pc') || t.includes('notebook') || t.includes('laptop') || t.includes('desktop')) return <LaptopIcon />;
    if (t.includes('จอ') || t.includes('monitor')) return <MonitorIcon />;
    return <DevicesIcon />;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        อุปกรณ์อื่นๆ ที่ถือครองโดย {asset.ownerName}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {linkedAssets.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                {getIcon(item.type)}
                <Typography variant="subtitle1" fontWeight="bold">
                  {item.assetName}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={item.type} size="small" color="primary" variant="outlined" />
                <Chip label={item.status} size="small" color={item.status === 'Available' ? 'success' : item.status === 'InUse' ? 'info' : 'default'} />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Serial:</strong> {item.serialNo || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>ยี่ห้อ/รุ่น:</strong> {item.brand || '-'} {item.model || ''}
              </Typography>

              <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  endIcon={<OpenInNewIcon />}
                  onClick={() => navigate(`/assets/${item.id}`)}
                >
                  ดูรายละเอียด
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
