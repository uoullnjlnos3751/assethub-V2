import React from 'react';
import { assetAPI } from '../../services/api';
import MasterDataPage from './MasterDataPage';

const statusOptions = [
  { code: 'Available', name: 'พร้อมใช้งาน' },
  { code: 'Borrowed', name: 'กำลังยืม' },
  { code: 'InUse', name: 'ใช้งานประจำ' },
  { code: 'Maintenance', name: 'ซ่อมบำรุง' },
  { code: 'Retired', name: 'ปลดระวาง' },
  { code: 'Lost', name: 'สูญหาย' },
];

export default function AssetStatusesPage() {
  return (
    <MasterDataPage
      title="สถานะอุปกรณ์ (Asset Status)"
      subtitle="จัดการชื่อและรายละเอียดของสถานะอุปกรณ์ที่ระบบรองรับ"
      itemLabel="สถานะอุปกรณ์"
      fetchItems={assetAPI.assetStatuses}
      createItem={assetAPI.createAssetStatus}
      updateItem={assetAPI.updateAssetStatus}
      deleteItem={assetAPI.deleteAssetStatus}
      statusOptions={statusOptions}
    />
  );
}
