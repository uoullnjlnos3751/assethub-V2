import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';

/**
 * Minimal canvas-based signature capture — no external library. This
 * project avoids adding npm dependencies mid-session (regenerating
 * package-lock.json can't be verified here — see the comment on
 * middleware/auth.ts's hand-rolled cookie parsing for the same reasoning),
 * and a signature pad is simple enough to hand-roll: pointer events onto a
 * canvas, exported as a base64 PNG data URL on save.
 */
export function SignaturePad({ onChange, height = 160 }: { onChange: (dataUrl: string | null) => void; height?: number }) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  const getCtx = () => canvasRef.current?.getContext('2d') || null;

  // Match canvas pixel buffer to its displayed size (accounting for DPR) once
  // on mount — without this, drawing coordinates drift from the cursor on
  // high-DPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = theme.palette.mode === 'dark' ? '#e5e7eb' : '#1f2937';
    }
  }, [theme.palette.mode]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = pointFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    const p = pointFromEvent(e);
    if (ctx && lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPoint.current = p;
    if (!hasStroke) setHasStroke(true);
  };

  const finishStroke = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setHasStroke(false);
    onChange(null);
  };

  return (
    <Box>
      <Box sx={{
        border: `1.5px dashed ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.02),
        position: 'relative',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
        />
        {!hasStroke && (
          <Typography sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '0.8rem', color: theme.palette.text.disabled, pointerEvents: 'none',
          }}>
            ลงชื่อในกรอบนี้
          </Typography>
        )}
      </Box>
      <Button size="small" onClick={handleClear} disabled={!hasStroke} sx={{ mt: 0.5 }}>
        ล้างลายเซ็น
      </Button>
    </Box>
  );
}
