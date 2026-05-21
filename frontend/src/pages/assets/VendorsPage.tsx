import React from 'react';
import { assetAPI } from '../../services/api';
import MasterDataPage from './MasterDataPage';

export default function VendorsPage() {
  return (
    <MasterDataPage
      title="🛒 ผู้จำหน่าย (Vendor)"
      subtitle="จัดการรายชื่อผู้จำหน่ายสำหรับข้อมูลจัดซื้อของทรัพย์สิน"
      itemLabel="ผู้จำหน่าย"
      icon="🛒"
      accentColor="#10b981"
      fetchItems={assetAPI.vendors}
      createItem={assetAPI.createVendor}
      updateItem={assetAPI.updateVendor}
      deleteItem={assetAPI.deleteVendor}
      importItems={assetAPI.importVendorsFromAssets}
    />
  );
}
