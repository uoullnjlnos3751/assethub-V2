import React from 'react';
import { Box, Card, Switch, Typography, useTheme, alpha } from '@mui/material';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Card sx={{
      background: isDark ? alpha(theme.palette.background.paper, 0.72) : alpha('#ffffff', 0.72),
      border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14)}`,
      backdropFilter: 'blur(22px)',
      borderRadius: '14px',
      boxShadow: `0 4px 24px ${alpha(theme.palette.primary.main, 0.08)}, 0 1px 3px rgba(0, 0, 0, 0.04)`,
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
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
      }}>
        <Box sx={{
          width: 3.5,
          height: 16,
          borderRadius: '2px',
          background: barColor || `linear-gradient(180deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`
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
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 1.5,
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.045),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      borderRadius: 2,
      transition: 'background 0.15s',
      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
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
