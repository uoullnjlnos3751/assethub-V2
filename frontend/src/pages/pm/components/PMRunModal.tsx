import React from 'react';

// Extracted from PMRunPage.tsx as pure code motion (no behavior change) —
// that file had grown to 1298 lines. Deliberately NOT merged with the
// similarly-named ./Modal.tsx: that shared component has different styling
// (header padding 20px vs 18px, header font-weight 700 vs 600, a white vs
// #f5f5f7 body background, no flexShrink on the header). Swapping PMRunPage
// to use it would be a real visual change, not the pure move this was meant
// to be. If unifying the two is ever wanted, that's a deliberate design
// decision for someone who can see both renders, not a mechanical merge.
export function PMRunModal({ open, onClose, title, children, maxWidth = 640 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(29,29,31,.35)', backdropFilter: 'blur(12px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth, boxShadow: '0 30px 70px rgba(0,0,0,.15)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e5ea', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{title}</span>
          <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 13, cursor: 'pointer', color: '#86868b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#f5f5f7' }}>{children}</div>
      </div>
    </div>
  );
}
