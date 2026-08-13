import React from 'react';
import { Box, Grid } from '@mui/material';
import { assetAPI } from '../../services/api';
import MasterDataPage from './MasterDataPage';

export default function LocationsPage() {
  return (
    <Box>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
            <MasterDataPage
              title="📍 สถานที่ตั้ง (Location)"
              subtitle="จัดการสถานที่ตั้งหรือไซต์สำหรับทรัพย์สิน"
              itemLabel="สถานที่ตั้ง"
              icon="📍"
              accentColor="#7c3aed"
              showCompanyField
              fetchItems={assetAPI.locations}
              createItem={assetAPI.createLocation}
              updateItem={assetAPI.updateLocation}
              deleteItem={assetAPI.deleteLocation}
              importItems={assetAPI.importLocationsFromAssets}
            />
        </Grid>
        <Grid item xs={12} md={6}>
          <MasterDataPage
            title="🏢 บริษัท (Company)"
            subtitle="จัดการรายชื่อบริษัทสำหรับทรัพย์สิน"
            itemLabel="บริษัท"
            icon="🏢"
            accentColor="#f59e0b"
            fetchItems={assetAPI.companies}
            createItem={assetAPI.createCompany}
            updateItem={assetAPI.updateCompany}
            deleteItem={assetAPI.deleteCompany}
            importItems={assetAPI.importCompaniesFromAssets}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
