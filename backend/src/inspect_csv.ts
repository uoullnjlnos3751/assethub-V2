import fs from 'fs';

function parseCSVLine(text: string) {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell);
  return result;
}

try {
  const content = fs.readFileSync('c:/Apps/assethub-V2/assets-2026-05-18.csv', 'utf-8');
  const lines = content.split(/\r?\n/);
  const types: Record<string, number> = {};

  console.log(`Total lines in CSV: ${lines.length}`);
  
  if (lines.length > 0) {
    const headers = parseCSVLine(lines[0]);
    console.log('Headers:', headers);
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = parseCSVLine(line);
      const typeVal = cols[7]?.trim() || 'Empty';
      types[typeVal] = (types[typeVal] || 0) + 1;
    }
  }

  console.log('Types in CSV:', types);
} catch (err) {
  console.error(err);
}
