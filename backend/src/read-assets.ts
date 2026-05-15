import * as XLSX from 'xlsx';
import * as fs from 'fs';

const excelFile = 'c:\\Apps\\assethub-V2\\AssetIT41.xlsx';

try {
  console.log('\n========================================');
  console.log('📊 Reading Asset File...');
  console.log('========================================\n');

  // Read Excel file
  const workbook = XLSX.readFile(excelFile);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

  console.log(`📋 Sheet Name: ${workbook.SheetNames[0]}`);
  console.log(`📦 Total Records: ${data.length}`);

  // Display headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    console.log(`\n🔑 Columns (${headers.length}):`);
    headers.forEach((h, i) => {
      console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${h}`);
    });

    // Display sample data
    console.log('\n📋 Sample Data (First 5 rows):');
    console.log('----------------------------------------');
    data.slice(0, 5).forEach((row, idx) => {
      console.log(`\nRow ${idx + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        if (value) {
          console.log(`  ${key.padEnd(30, ' ')}: ${value}`);
        }
      });
    });
  }

  // Save data for processing
  fs.writeFileSync(
    'c:\\Apps\\assethub-V2\\backend\\asset_data.json',
    JSON.stringify({ headers: Object.keys(data[0] || {}), data, total: data.length }, null, 2)
  );

  console.log('\n✓ Data saved to: asset_data.json');
  console.log('========================================\n');

} catch (err) {
  console.error('❌ Error:', err);
  process.exit(1);
}
