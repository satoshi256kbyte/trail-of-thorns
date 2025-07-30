import React from 'react';
import {
  Backdrop,
  CircularProgress,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  progress?: number;
  variant?: 'circular' | 'linear';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  progress,
  variant = 'circular',
}) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={open}
    >
      <Box sx={{ textAlign: 'center', minWidth: 200 }}>
        {variant === 'circular' ? (
          <CircularProgress
            color="inherit"
            size={60}
            variant={progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
          />
        ) : (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress
              variant={progress !== undefined ? 'determinate' : 'indeterminate'}
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
        
        <Typography variant="h6" sx={{ mt: 2 }}>
          {message}
        </Typography>
        
        {progress !== undefined && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            {Math.round(progress)}%
          </Typography>
        )}
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;