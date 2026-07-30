import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, useTheme
} from '@mui/material';
import MasterDataPage from '../assets/MasterDataPage';
import CompaniesPage from './CompaniesPage';
import { assetAPI, departmentAPI } from '../../services/api';

interface TabPanelProps { children: React.ReactNode; value: number; index: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const TABS = [
  { label: 'ประเภทอุปกรณ์', icon: '📦', color: '#0ea5e9' },
  { label: 'สถานที่ตั้ง', icon: '📍', color: '#8b5cf6' },
  { label: 'ผู้จำหน่าย', icon: '🏪', color: '#f59e0b' },
  { label: 'สถานะอุปกรณ์', icon: '✅', color: '#10b981' },
  { label: 'บริษัท', icon: '🏢', color: '#ef4444' },
  { label: 'แผนก', icon: '🏛️', color: '#ec4899' },
];

export default function MasterDataManagementPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>ข้อมูลตั้งต้นทรัพย์สิน</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        จัดการข้อมูลหลักทั้งหมดที่ใช้ในระบบทะเบียนทรัพย์สิน
      </Typography>

      <Paper elevation={0} sx={{ borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '0.5px solid #e5e7eb',
            bgcolor: theme.palette.mode === 'dark' ? '#1c1c1e' : '#fafafa',
            '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500 },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={t.label} label={<span>{t.icon} {t.label}</span>} />
          ))}
        </Tabs>

        <Box sx={{ p: 2 }}>
          <TabPanel value={tab} index={0}>
            <MasterDataPage
              title="ประเภทอุปกรณ์"
              subtitle="จัดการประเภทของอุปกรณ์ IT"
              itemLabel="ประเภท"
              icon="📦"
              accentColor="#0ea5e9"
              fetchItems={() => assetAPI.deviceTypes()}
              createItem={(data: any) => assetAPI.createDeviceType(data)}
              updateItem={(id: number, data: any) => assetAPI.updateDeviceType(id, data)}
              deleteItem={(id: number) => assetAPI.deleteDeviceType(id)}
              importItems={() => assetAPI.importDeviceTypesFromAssets()}
            />
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <MasterDataPage
              title="สถานที่ตั้ง / บริษัท"
              subtitle="จัดการสถานที่ตั้งและบริษัท"
              itemLabel="สถานที่"
              icon="📍"
              accentColor="#8b5cf6"
              fetchItems={() => assetAPI.locations()}
              createItem={(data: any) => assetAPI.createLocation(data)}
              updateItem={(id: number, data: any) => assetAPI.updateLocation(id, data)}
              deleteItem={(id: number) => assetAPI.deleteLocation(id)}
              importItems={() => assetAPI.importLocationsFromAssets()}
              showCompanyField
            />
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <MasterDataPage
              title="ผู้จำหน่าย"
              subtitle="จัดการข้อมูลผู้จำหน่าย"
              itemLabel="ผู้จำหน่าย"
              icon="🏪"
              accentColor="#f59e0b"
              fetchItems={() => assetAPI.vendors()}
              createItem={(data: any) => assetAPI.createVendor(data)}
              updateItem={(id: number, data: any) => assetAPI.updateVendor(id, data)}
              deleteItem={(id: number) => assetAPI.deleteVendor(id)}
              importItems={() => assetAPI.importVendorsFromAssets()}
            />
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <MasterDataPage
              title="สถานะอุปกรณ์"
              subtitle="จัดการสถานะของอุปกรณ์"
              itemLabel="สถานะ"
              icon="✅"
              accentColor="#10b981"
              fetchItems={() => assetAPI.assetStatuses()}
              createItem={(data: any) => assetAPI.createAssetStatus(data)}
              updateItem={(id: number, data: any) => assetAPI.updateAssetStatus(id, data)}
              deleteItem={(id: number) => assetAPI.deleteAssetStatus(id)}
              statusOptions={[
                { code: 'Available', name: 'พร้อมใช้งาน' },
                { code: 'InUse', name: 'กำลังใช้งาน' },
                { code: 'Borrowed', name: 'ถูกยืม' },
                { code: 'UnderRepair', name: 'กำลังซ่อม' },
                { code: 'Retired', name: 'ปลดระวาง' },
                { code: 'Reserved', name: 'จอง' },
              ]}
            />
          </TabPanel>

          <TabPanel value={tab} index={4}>
            <CompaniesPage embedded />
          </TabPanel>

          <TabPanel value={tab} index={5}>
            <MasterDataPage
              title="แผนก"
              subtitle="จัดการข้อมูลแผนก"
              itemLabel="แผนก"
              icon="🏛️"
              accentColor="#ec4899"
              fetchItems={() => departmentAPI.list()}
              createItem={(data: any) => departmentAPI.create(data)}
              updateItem={(id: number, data: any) => departmentAPI.update(id, data)}
              deleteItem={(id: number) => departmentAPI.delete(id)}
              showCodeField
            />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
