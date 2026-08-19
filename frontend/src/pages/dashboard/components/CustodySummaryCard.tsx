import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Inbox } from 'lucide-react';
import { SectionCard } from './SectionCard';

export interface CustodySummaryEntry {
  code: string;
  label: string;
  count: number;
}

/**
 * "How many devices are sitting at each drop-off point right now" — the
 * question IT could not answer before custody tracking existed. Each row links
 * into the registry pre-filtered to that holder.
 *
 * Renders nothing when no holder has anything, so an empty card never takes up
 * a dashboard slot before HR starts using the feature.
 */
export function CustodySummaryCard({ entries, total, onNavigate }: {
  entries: CustodySummaryEntry[];
  total: number;
  onNavigate: (holderCode: string) => void;
}) {
  const theme = useTheme();
  if (!entries || entries.length === 0 || total === 0) return null;

  return (
    <SectionCard title="เครื่องที่ฝากไว้ที่จุดรับฝาก" icon={Inbox}>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: theme.palette.warning.main, lineHeight: 1.1 }}>
        {total}
      </Typography>
      <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, mb: 1.5 }}>
        เครื่องทั้งหมดที่ยังไม่ถูกดึงกลับเข้าคลัง IT
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {entries.map(e => (
          <Box
            key={e.code}
            onClick={() => onNavigate(e.code)}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 1.25, py: 0.75, borderRadius: '8px', cursor: 'pointer',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
            }}
          >
            <Typography sx={{ fontSize: '0.76rem', color: theme.palette.text.primary }}>{e.label}</Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: theme.palette.text.primary }}>
              {e.count}
            </Typography>
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}
