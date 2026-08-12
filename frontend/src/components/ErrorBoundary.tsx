import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }

  componentDidCatch(error: Error) {
    if (error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      console.warn('Dynamic import failed (chunk mismatch). Reloading page...');
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 8 }}>
          <Typography variant="h4" color="error" gutterBottom>เกิดข้อผิดพลาด</Typography>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'error.main', mb: 2 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {this.state.error?.message}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => window.location.href = '/login'}>กลับไปหน้า Login</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
