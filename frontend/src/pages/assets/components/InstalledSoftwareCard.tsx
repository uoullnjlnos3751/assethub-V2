import React, { useMemo, useState } from 'react';
import {
  Typography, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { AppWindow as PackageIcon } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

/**
 * Installed-software inventory, read live from the monitoring agent — the
 * one list this registry never had a source for until now. Promoted out of
 * AgentSpecCard's accordion into its own first-class card, matching the
 * reference ITAM's Applications tab (a searchable table), rather than a
 * collapsed section at the bottom of the sync-comparison card.
 */
export function InstalledSoftwareCard({ agent }: { agent: any }) {
  const [query, setQuery] = useState('');
  const software: { name: string; version?: string }[] = useMemo(() => agent?.software || [], [agent]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return software;
    return software.filter(s => String(s.name || '').toLowerCase().includes(q));
  }, [software, query]);

  if (software.length === 0) return null;

  return (
    <SectionCard title={`ซอฟต์แวร์ที่ติดตั้ง (${software.length})`} icon={PackageIcon}>
      <TextField
        size="small" fullWidth placeholder="ค้นหาชื่อโปรแกรม..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
        sx={{ mb: 1 }}
      />
      <TableContainer sx={{ maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>
            <TableCell sx={{ fontSize: '0.7rem' }}>ชื่อโปรแกรม</TableCell>
            <TableCell sx={{ fontSize: '0.7rem', width: 140 }}>เวอร์ชัน</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={2} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>ไม่พบโปรแกรมที่ค้นหา</TableCell></TableRow>
            ) : filtered.map((s, i) => (
              <TableRow key={`${s.name}-${i}`}>
                <TableCell sx={{ fontSize: '0.75rem' }}>{s.name}</TableCell>
                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>{s.version || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {query && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          พบ {filtered.length} จาก {software.length} รายการ
        </Typography>
      )}
    </SectionCard>
  );
}
