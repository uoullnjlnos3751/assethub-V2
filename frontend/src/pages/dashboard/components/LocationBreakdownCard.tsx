import React, { useState } from 'react';
import { Box, Typography, CircularProgress, alpha, useTheme } from '@mui/material';
import { Boxes, ChevronLeft } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { CAT_COLORS, pct } from '../dashboardHelpers';
import { dashboardAPI } from '../../../services/api';

/**
 * Top level lists locations (from the overview payload — no extra request).
 * Clicking one drills one level deeper into that location's floors, fetched
 * on demand from /dashboard/location-breakdown — "รหัสอาคาร 245 เครื่อง" used
 * to be the end of the story; now it's a question you can click into.
 */
export function LocationBreakdownCard({ byLocation, total, onNavigate }: {
  byLocation: any[];
  total: number;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  const [drill, setDrill] = useState<string | null>(null);
  const [floorRows, setFloorRows] = useState<{ value: string; count: number }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const openLocation = (locName: string) => {
    setDrill(locName);
    setFloorRows(null);
    setLoading(true);
    dashboardAPI.locationBreakdown(undefined, locName)
      .then(res => setFloorRows(res.data?.rows || []))
      .catch(() => setFloorRows([]))
      .finally(() => setLoading(false));
  };

  const rows: { key: string; label: string; count: number }[] = drill
    ? (floorRows || []).map(r => ({ key: r.value, label: `ชั้น ${r.value}`, count: r.count }))
    : byLocation.slice(0, 6).map((loc: any) => ({ key: loc.location, label: loc.location || 'ไม่ระบุสถานที่', count: loc._count }));

  const rowTotal = drill ? (floorRows || []).reduce((s, r) => s + r.count, 0) : total;

  return (
    <SectionCard
      title={drill ? `ชั้นภายใน ${drill}` : 'ทรัพย์สินตามสถานที่ตั้ง'}
      icon={drill ? ChevronLeft : Boxes}
      action={drill ? () => setDrill(null) : onNavigate}
      actionLabel={drill ? 'ย้อนกลับ' : 'แผนที่'}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={18} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.length > 0 ? rows.map((r, i) => {
            const rowColor = CAT_COLORS[(i + 3) % CAT_COLORS.length];
            const p = pct(r.count, rowTotal || 1);
            return (
              <Box
                key={r.key}
                onClick={() => !drill && openLocation(r.key)}
                sx={{
                  cursor: drill ? 'default' : 'pointer', borderRadius: 1, px: drill ? 0 : '4px', mx: drill ? 0 : '-4px',
                  '&:hover': drill ? {} : { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{r.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary }}>{r.count}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, minWidth: 28, textAlign: 'right' }}>{p}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(rowColor, 0.12), overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${p}%`, borderRadius: 2, bgcolor: rowColor }} />
                </Box>
              </Box>
            );
          }) : (
            <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, py: 1 }}>
              {drill ? 'ไม่มีข้อมูลชั้นของสถานที่นี้' : 'ยังไม่มีข้อมูล'}
            </Typography>
          )}
        </Box>
      )}
    </SectionCard>
  );
}
