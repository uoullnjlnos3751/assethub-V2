const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const assetData = {
      assetCode: undefined, // Simulating what happens when assetCode is empty in the excel
      assetName: 'HQ-TRW-OFF-N001',
      serialNo: 'BRBFGG3',
      type: 'Notebook',
      status: 'Borrowed',
      brand: 'Dell',
      model: 'Latitude 3520',
      company: 'TRW',
      ownerName: 'Rungruedee Sirisomchaisakul',
      departmentId: 'OFF',
      location: 'HQ',
      floor: '1',
      oldAssetCode: 'HQ-TRW-OFF-N001',
      domainName: 'TRRGROUP',
      poNumber: 'TRT-IT.2111-0002',
      poDate: new Date('2021-11-18'),
      prNumber: 'PR 10-006/64',
      purchaseDate: new Date('2024-01-21'),
      vendor: '',
      budget: null,
      remark: 'rungruedee.sir'
    };
    await prisma.asset.create({ data: assetData });
    console.log('success');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
