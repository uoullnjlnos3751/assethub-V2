import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Button, Checkbox, FormControlLabel, FormGroup, Typography,
  Popover, IconButton, Paper, Divider, Chip, alpha, useTheme
} from '@mui/material';
import { Filter, Download, Settings2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_BUCKETS = [
  { id: 'InUse', label: 'InUse - ใช้งาน' },
  { id: 'Broken_Donate', label: 'Broken - เสีย/เตรียมบริจาค' },
  { id: 'Available_TRRT', label: 'Available - สำรองอยู่ที่ TRRT' },
  { id: 'Older5Y_TRRT', label: 'Older>5Y - อายุเกิน 5ปี (TRRT)' },
  { id: 'Available_Other', label: 'Available - สำรองทั่วไป' },
  { id: 'Lost', label: 'Lost - หาไม่เจอ' },
  { id: 'Borrowed', label: 'Borrowed - ยืมใช้งาน' },
  { id: 'Other', label: 'Other - อื่นๆ' }
];

function getBucket(asset: any): string {
  const status = asset.status;
  const loc = asset.location || '';
  if (status === 'InUse') return 'InUse';
  if (status === 'Lost') return 'Lost';
  if (status === 'Borrowed') return 'Borrowed';
  if (status === 'Retired' || status === 'Maintenance') return 'Broken_Donate';
  
  if (status === 'Available') {
    if (loc.toUpperCase().includes('TRRT')) {
      const pYear = asset.purchaseDate ? new Date(asset.purchaseDate).getFullYear() : null;
      const currentYear = new Date().getFullYear();
      const age = pYear ? currentYear - pYear : (asset.age || 0);
      if (age >= 5) return 'Older5Y_TRRT';
      return 'Available_TRRT';
    }
    return 'Available_Other';
  }
  return 'Other';
}

export default function CompanyAssetMatrix({ assets }: { assets: any[] }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Extract unique companies and types
  const allCompanies = useMemo(() => {
    const set = new Set(assets.map(a => a.company).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [assets]);
  
  const allTypes = useMemo(() => {
    const set = new Set(assets.map(a => a.type).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [assets]);

  // Selections
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>(STATUS_BUCKETS.map(b => b.id).filter(id => id !== 'Other'));
  const [hasInitializedTypes, setHasInitializedTypes] = useState(false);

  // Ensure default types exist, otherwise just use all types
  useEffect(() => {
    if (!hasInitializedTypes && allTypes.length > 0) {
      const defaultT = allTypes.filter(t => {
        const tl = t.toLowerCase();
        return tl.includes('notebook') || tl.includes('pc') || tl.includes('monitor') || tl.includes('printer') || tl.includes('macbook');
      });
      setSelectedTypes(defaultT.length > 0 ? defaultT : allTypes);
      setHasInitializedTypes(true);
    }
  }, [allTypes, hasInitializedTypes]);

  const handleTypeToggle = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const handleBucketToggle = (b: string) => {
    setSelectedBuckets(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const handleSelectAllTypes = () => setSelectedTypes(allTypes);
  const handleClearTypes = () => setSelectedTypes([]);

  // Compute Data Matrix
  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, Record<string, number>>> = {};
    
    // Initialize
    for (const company of allCompanies) {
      data[company] = {};
      for (const type of selectedTypes) {
        data[company][type] = {};
        for (const bucket of selectedBuckets) {
          data[company][type][bucket] = 0;
        }
      }
    }

    // Populate
    for (const asset of assets) {
      const company = asset.company;
      const type = asset.type;
      if (!company || !type) continue;
      if (!selectedTypes.includes(type)) continue;

      const bucket = getBucket(asset);
      if (!selectedBuckets.includes(bucket)) continue;

      if (!data[company]) data[company] = {};
      if (!data[company][type]) data[company][type] = {};
      if (typeof data[company][type][bucket] !== 'number') data[company][type][bucket] = 0;

      data[company][type][bucket]++;
    }

    return data;
  }, [assets, allCompanies, selectedTypes, selectedBuckets]);

  // Handle Export to Excel
  const exportToExcel = () => {
    const wsData: any[][] = [];
    
    // Header Row 1: Types
    const header1 = ['บริษัท'];
    selectedTypes.forEach(t => {
      header1.push(t);
      for(let i=0; i < selectedBuckets.length; i++) header1.push(''); // Span
    });
    header1.push('รวมทั้งหมด');
    wsData.push(header1);

    // Header Row 2: Buckets
    const header2 = [''];
    selectedTypes.forEach(() => {
      selectedBuckets.forEach(b => {
        header2.push(STATUS_BUCKETS.find(x => x.id === b)?.label || b);
      });
      header2.push('รวม');
    });
    header2.push('');
    wsData.push(header2);

    // Data Rows
    allCompanies.forEach(company => {
      const row = [company];
      let companyTotal = 0;

      selectedTypes.forEach(type => {
        let typeTotal = 0;
        selectedBuckets.forEach(bucket => {
          const val = matrixData[company]?.[type]?.[bucket] || 0;
          row.push(val.toString());
          typeTotal += val;
        });
        row.push(typeTotal.toString());
        companyTotal += typeTotal;
      });
      row.push(companyTotal.toString());
      wsData.push(row);
    });

    // Grand Totals Row
    const totalRow = ['รวมทั้งหมด'];
    let grandGrandTotal = 0;
    selectedTypes.forEach(type => {
      let grandTypeTotal = 0;
      selectedBuckets.forEach(bucket => {
        let sum = 0;
        allCompanies.forEach(c => sum += (matrixData[c]?.[type]?.[bucket] || 0));
        totalRow.push(sum.toString());
        grandTypeTotal += sum;
      });
      totalRow.push(grandTypeTotal.toString());
      grandGrandTotal += grandTypeTotal;
    });
    totalRow.push(grandGrandTotal.toString());
    wsData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge Cells Logic
    const merges: XLSX.Range[] = [];
    let startCol = 1; // After company col
    selectedTypes.forEach(() => {
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + selectedBuckets.length } });
      startCol += selectedBuckets.length + 1;
    });
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asset_Matrix");
    XLSX.writeFile(wb, `Asset_Matrix_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold">สรุปสถานะอุปกรณ์ทั้งหมด แยกตามบริษัท (Matrix)</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<Settings2 size={18} />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            color="primary"
          >
            ตั้งค่ารูปแบบรายงาน
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Download size={18} />}
            onClick={exportToExcel}
            color="success"
            sx={{ boxShadow: 'none' }}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {/* Filter Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ p: 3, width: 600, maxHeight: '70vh', overflowY: 'auto' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>เลือกประเภทอุปกรณ์ (Columns)</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button size="small" onClick={handleSelectAllTypes}>เลือกทั้งหมด</Button>
            <Button size="small" color="error" onClick={handleClearTypes}>ล้างทั้งหมด</Button>
          </Box>
          <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
            {allTypes.map(t => (
              <FormControlLabel 
                key={t} 
                control={<Checkbox checked={selectedTypes.includes(t)} onChange={() => handleTypeToggle(t)} size="small" />} 
                label={<Typography variant="body2">{t}</Typography>} 
                sx={{ minWidth: 140, m: 0 }}
              />
            ))}
          </FormGroup>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>เลือกสถานะที่ต้องการแสดง (Sub-columns)</Typography>
          <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
            {STATUS_BUCKETS.map(b => (
              <FormControlLabel 
                key={b.id} 
                control={<Checkbox checked={selectedBuckets.includes(b.id)} onChange={() => handleBucketToggle(b.id)} size="small" />} 
                label={<Typography variant="body2">{b.label}</Typography>} 
                sx={{ minWidth: 160, m: 0 }}
              />
            ))}
          </FormGroup>
        </Paper>
      </Popover>

      {/* Matrix Table */}
      <Box sx={{ overflowX: 'auto', maxHeight: '75vh', overflowY: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
          <thead>
            {/* Type Headers */}
            <tr style={{ background: theme.palette.success.main, color: '#fff' }}>
              <th rowSpan={2} style={{ padding: '8px', border: `1px solid ${theme.palette.success.dark}`, borderBottom: 'none', minWidth: 100, position: 'sticky', left: 0, top: 0, zIndex: 10, background: theme.palette.success.main }}>
                บริษัท
              </th>
              {selectedTypes.map(type => (
                <th key={type} colSpan={selectedBuckets.length + 1} style={{ padding: '6px', border: `1px solid ${theme.palette.success.dark}`, position: 'sticky', top: 0, zIndex: 2, background: theme.palette.success.main }}>
                  {type}
                </th>
              ))}
              <th rowSpan={2} style={{ padding: '8px', border: `1px solid ${theme.palette.success.dark}`, minWidth: 80, position: 'sticky', top: 0, zIndex: 2, background: theme.palette.success.main }}>
                รวมทั้งหมด
              </th>
            </tr>
            {/* Status Headers */}
            <tr style={{ background: theme.palette.action.hover, color: theme.palette.text.primary }}>
              {selectedTypes.map(type => (
                <React.Fragment key={type}>
                  {selectedBuckets.map(bucket => (
                    <th key={bucket} style={{ padding: '6px 4px', border: `1px solid ${theme.palette.divider}`, fontWeight: 600, fontSize: '0.7rem', maxWidth: 80, whiteSpace: 'normal', position: 'sticky', top: 31, zIndex: 2, background: theme.palette.action.hover }}>
                      {STATUS_BUCKETS.find(x => x.id === bucket)?.label}
                    </th>
                  ))}
                  <th style={{ padding: '6px 4px', border: `1px solid ${theme.palette.divider}`, background: theme.palette.action.hover, fontWeight: 700, fontSize: '0.7rem', position: 'sticky', top: 31, zIndex: 2 }}>
                    รวม {type.substring(0,3)}
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {allCompanies.map(company => {
              let rowTotal = 0;
              return (
                <tr key={company} style={{ '&:hover': { background: theme.palette.action.hover } } as any}>
                  <td style={{ padding: '6px 8px', border: `1px solid ${theme.palette.divider}`, fontWeight: 700, background: theme.palette.background.paper, textAlign: 'left', position: 'sticky', left: 0, zIndex: 5 }}>
                    {company}
                  </td>
                  {selectedTypes.map(type => {
                    let typeTotal = 0;
                    return (
                      <React.Fragment key={type}>
                        {selectedBuckets.map(bucket => {
                          const val = matrixData[company]?.[type]?.[bucket] || 0;
                          typeTotal += val;
                          return (
                            <td key={bucket} style={{ padding: '6px 4px', border: `1px solid ${theme.palette.divider}`, color: val > 0 ? theme.palette.text.primary : theme.palette.text.disabled }}>
                              {val}
                            </td>
                          );
                        })}
                        <td style={{ padding: '6px 4px', border: `1px solid ${theme.palette.divider}`, fontWeight: 700, background: theme.palette.action.hover }}>
                          {typeTotal}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td style={{ padding: '6px 8px', border: `1px solid ${theme.palette.divider}`, fontWeight: 700, background: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark }}>
                    {(() => {
                      selectedTypes.forEach(t => {
                        selectedBuckets.forEach(b => rowTotal += (matrixData[company]?.[t]?.[b] || 0));
                      });
                      return rowTotal;
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: theme.palette.action.hover, fontWeight: 700, position: 'sticky', bottom: 0, zIndex: 6 }}>
              <td style={{ padding: '8px', border: `1px solid ${theme.palette.divider}`, textAlign: 'left', position: 'sticky', left: 0, zIndex: 7, background: theme.palette.action.hover }}>รวมทั้งหมด</td>
              {selectedTypes.map(type => {
                let grandTypeTotal = 0;
                return (
                  <React.Fragment key={type}>
                    {selectedBuckets.map(bucket => {
                      let colTotal = 0;
                      allCompanies.forEach(c => colTotal += (matrixData[c]?.[type]?.[bucket] || 0));
                      grandTypeTotal += colTotal;
                      return (
                        <td key={bucket} style={{ padding: '6px 4px', border: `1px solid ${theme.palette.divider}` }}>
                          {colTotal}
                        </td>
                      );
                    })}
                    <td style={{ padding: '6px 4px', border: `1px solid ${theme.palette.divider}`, background: theme.palette.action.selected }}>
                      {grandTypeTotal}
                    </td>
                  </React.Fragment>
                );
              })}
              <td style={{ padding: '8px', border: `1px solid ${theme.palette.divider}`, background: alpha(theme.palette.success.main, 0.15), color: theme.palette.success.dark }}>
                {(() => {
                  let grandGrandTotal = 0;
                  selectedTypes.forEach(t => {
                    selectedBuckets.forEach(b => {
                      allCompanies.forEach(c => grandGrandTotal += (matrixData[c]?.[t]?.[b] || 0));
                    });
                  });
                  return grandGrandTotal;
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </Box>

      {/* Summary Table 2 */}
      <Box sx={{ mt: 4, mb: 2, display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 500px', overflowX: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ p: 2, pb: 1, background: theme.palette.success.main, color: '#fff', m: 0 }}>
            แยกอุปกรณ์ตามบริษัท (Summary)
          </Typography>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: theme.palette.action.hover }}>
                <th style={{ padding: '10px', border: `1px solid ${theme.palette.divider}`, textAlign: 'left' }}>บริษัท</th>
                {selectedTypes.map(type => (
                  <th key={type} style={{ padding: '10px', border: `1px solid ${theme.palette.divider}` }}>{type}</th>
                ))}
                <th style={{ padding: '10px', border: `1px solid ${theme.palette.divider}`, background: theme.palette.action.hover }}>รวมทั้งหมด</th>
              </tr>
            </thead>
            <tbody>
              {allCompanies.map(company => {
                let rowTotal = 0;
                return (
                  <tr key={company}>
                    <td style={{ padding: '10px', border: `1px solid ${theme.palette.divider}`, fontWeight: 700, textAlign: 'left' }}>{company}</td>
                    {selectedTypes.map(type => {
                      let tTotal = 0;
                      selectedBuckets.forEach(b => tTotal += (matrixData[company]?.[type]?.[b] || 0));
                      rowTotal += tTotal;
                      return (
                        <td key={type} style={{ padding: '10px', border: `1px solid ${theme.palette.divider}` }}>{tTotal}</td>
                      );
                    })}
                    <td style={{ padding: '10px', border: `1px solid ${theme.palette.divider}`, fontWeight: 700, background: theme.palette.action.hover }}>{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: theme.palette.action.hover, fontWeight: 700 }}>
                <td style={{ padding: '10px', border: `1px solid ${theme.palette.divider}`, textAlign: 'left' }}>รวมทั้งหมด</td>
                {selectedTypes.map(type => {
                  let cTotal = 0;
                  allCompanies.forEach(c => {
                    selectedBuckets.forEach(b => cTotal += (matrixData[c]?.[type]?.[b] || 0));
                  });
                  return (
                    <td key={type} style={{ padding: '10px', border: `1px solid ${theme.palette.divider}` }}>{cTotal}</td>
                  );
                })}
                <td style={{ padding: '10px', border: `1px solid ${theme.palette.divider}`, background: theme.palette.action.selected }}>
                  {(() => {
                    let gTotal = 0;
                    selectedTypes.forEach(t => {
                      allCompanies.forEach(c => {
                        selectedBuckets.forEach(b => gTotal += (matrixData[c]?.[t]?.[b] || 0));
                      });
                    });
                    return gTotal;
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </Box>
      </Box>

    </Box>
  );
}
