import React from 'react';
import { Box, Card, Switch, Typography } from '@mui/material';

// Extracted from AssetFormPage.tsx as pure code motion (no behavior change)
// — that file had grown to 2533 lines. These four are self-contained: no
// closure over AssetFormPage's own state, everything comes in as props/args.
//
// Not merged with same-named functions in other large pages (getTypeIcon
// also exists locally in AssetDetailPage.tsx, SectionCard also exists
// locally in DashboardPage.tsx with a different prop shape — icon/action/
// actionLabel instead of sub/barColor). Those are separate, pre-existing
// duplicates outside the scope of this change, not the same component.

export function getTypeIcon(type: string): string {
  const t = type?.toLowerCase() || '';
  if (['notebook', 'laptop', 'macbook'].some(k => t.includes(k))) return '💻';
  if (['desktop', 'pc', 'workstation', 'all-in-one'].some(k => t.includes(k))) return '🖥';
  if (t.includes('monitor')) return '🖥';
  if (t.includes('printer')) return '🖨';
  if (['phone', 'tablet', 'smartphone'].some(k => t.includes(k))) return '📱';
  if (['switch', 'router', 'firewall', 'access point', 'network'].some(k => t.includes(k))) return '🌐';
  if (t.includes('projector')) return '📽';
  return '🔧';
}

/* ─── Shared Section Card Component ────────────────────────────── */
export function SectionCard({ title, sub, barColor, children }: {
  title: string; sub?: string; barColor?: string; children: React.ReactNode;
}) {
  return (
    <Card sx={{
      background: 'rgba(255, 255, 255, 0.68)',
      border: '1px solid rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(22px)',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      p: { xs: 2.5, sm: 3 },
      mb: 2.5,
      position: 'relative',
      overflow: 'visible'
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 3,
        pb: 1.5,
        borderBottom: '1px solid rgba(99, 102, 241, 0.07)'
      }}>
        <Box sx={{
          width: 3.5,
          height: 16,
          borderRadius: '2px',
          background: barColor || 'linear-gradient(180deg,#4f46e5,#7c3aed)'
        }} />
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {sub}
          </Typography>
        )}
      </Box>
      {children}
    </Card>
  );
}

/* ─── Toggle Wrap Component ────────────────────────────────────── */
export function ToggleWrap({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 1.5,
      bgcolor: 'rgba(248, 247, 255, 0.65)',
      border: '1px solid rgba(99, 102, 241, 0.09)',
      borderRadius: 2,
      transition: 'background 0.15s',
      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' }
    }}>
      <Box>
        <Typography variant="body2" fontWeight={500} color="text.primary">
          {label}
        </Typography>
        {desc && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            {desc}
          </Typography>
        )}
      </Box>
      <Switch
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        color="primary"
      />
    </Box>
  );
}

export const getBrandSuggestionsForType = (type: string): string[] => {
  const suggestions: Record<string, string[]> = {
    'notebook': ['Apple', 'ASUS', 'Dell', 'HP', 'Lenovo'],
    'laptop': ['Apple', 'ASUS', 'Dell', 'HP', 'Lenovo'],
    'macbook': ['Apple'],
    'pc desktop': ['ASUS', 'Dell', 'HP', 'Lenovo'],
    'desktop': ['ASUS', 'Dell', 'HP', 'Lenovo'],
    'workstation': ['ASUS', 'Dell', 'HP', 'Lenovo'],
    'monitor': ['ASUS', 'BenQ', 'Dell', 'HP', 'LG'],
    'printer': ['Brother', 'Canon', 'HP', 'Xerox'],
    'router': ['Cisco', 'D-Link', 'Fortinet', 'TP-Link', 'Ubiquiti'],
    'switch': ['Cisco', 'D-Link', 'Fortinet', 'TP-Link', 'Ubiquiti'],
    'access point': ['Cisco', 'D-Link', 'Ubiquiti'],
    'keyboard': ['ASUS', 'Cherry', 'Corsair', 'Logitech', 'Razer'],
    'mouse': ['ASUS', 'Corsair', 'Logitech', 'Razer', 'SteelSeries'],
    'headset': ['ASUS', 'Corsair', 'Logitech', 'Plantronics', 'Razer'],
    'webcam': ['Corsair', 'Logitech', 'Microsoft', 'Razer'],
  };
  const t = type?.toLowerCase() || '';
  for (const [key, brands] of Object.entries(suggestions)) {
    if (t.includes(key)) return brands;
  }
  return [];
};
