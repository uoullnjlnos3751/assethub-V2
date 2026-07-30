import React from 'react';

// Extracted from PMRunPage.tsx as pure code motion (no behavior change).
// Deliberately NOT merged with the similarly-named ./StarRating.tsx: that
// shared component has a different prop API (optional onChange, a
// `readOnly` prop and configurable size/color instead of `disabled`).
// PMRunPage's call sites pass `disabled`, so swapping components would need
// every call site updated and would drop the size/color customization this
// version never had — a real change, not a pure move.
export function PMRunStarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          onClick={() => !disabled && onChange(n)}
          style={{
            fontSize: 24,
            cursor: disabled ? 'default' : 'pointer',
            color: n <= value ? '#ff9500' : '#d2d2d7',
            transition: 'color .1s'
          }}
        >★</span>
      ))}
    </div>
  );
}
