import React from 'react';
import { Card, CardContent, Typography, Stepper, Step, StepLabel } from '@mui/material';

/* ─── ITAM lifecycle stepper — stages from docs/IMPROVEMENT_PLAN.md ──── */
const LIFECYCLE_STAGES = [
  { key: 'procure', label: 'จัดหา' },
  { key: 'register', label: 'ลงทะเบียน' },
  { key: 'assign', label: 'มอบหมายใช้งาน' },
  { key: 'maintain', label: 'บำรุงรักษา' },
  { key: 'dispose', label: 'จำหน่ายออก' },
];

function getLifecycleStageIndex(asset: { status?: string; ownerName?: string }): number {
  const disposalStatuses = ['Retired', 'Lost', 'Damaged'];
  if (asset.status && disposalStatuses.includes(asset.status)) return 4;
  if (asset.status === 'Maintenance') return 3;
  if (asset.status === 'InUse' || asset.ownerName) return 2;
  return 1; // Available — registered but not yet assigned
}

export function LifecycleStepper({ asset }: { asset: { status?: string; ownerName?: string } }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 20px !important' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10.5px' }}>
          วงจรชีวิตทรัพย์สิน (ITAM Lifecycle)
        </Typography>
        <Stepper activeStep={getLifecycleStageIndex(asset)} alternativeLabel>
          {LIFECYCLE_STAGES.map((s) => (
            <Step key={s.key}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
}
