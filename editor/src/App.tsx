import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Paper,
} from '@mui/material';
import {
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import ErrorBoundary from './components/ErrorBoundary';
import {
  NotificationProvider,
  useNotification,
} from './components/NotificationSystem';
import LoadingOverlay from './components/LoadingOverlay';
import ValidationErrorDisplay, {
  ValidationError,
} from './components/ValidationErrorDisplay';
import ConfirmationDialog from './components/ConfirmationDialog';
import HelpTooltip from './components/HelpTooltip';
import { useLoadingState } from './hooks/useLoadingState';
import { useErrorHandler } from './hooks/useErrorHandler';

const AppContent: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { handleError, handleAsyncError } = useErrorHandler();
  const {
    isLoading,
    message,
    progress,
    startLoading,
    stopLoading,
    updateProgress,
  } = useLoadingState();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'delete' | 'save' | 'discard' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [validationErrors] = useState<ValidationError[]>([
    {
      field: 'character.name',
      message: 'Name is required',
      severity: 'error',
      path: ['character', 'name'],
      suggestion: 'Enter a valid character name',
    },
    {
      field: 'character.stats.hp',
      message: 'HP must be greater than 0',
      severity: 'error',
      path: ['character', 'stats', 'hp'],
      value: -10,
      suggestion: 'Set HP to a positive number',
    },
    {
      field: 'character.description',
      message: 'Description is recommended',
      severity: 'warning',
      path: ['character', 'description'],
      suggestion: 'Add a description to help identify this character',
    },
  ]);

  const handleTestNotifications = () => {
    showSuccess('Data saved successfully!', 'Success');
    setTimeout(() => showInfo('Remember to export your changes', 'Info'), 1000);
    setTimeout(() => showWarning('Some fields have warnings', 'Warning'), 2000);
    setTimeout(() => showError('Failed to load external data', 'Error'), 3000);
  };

  const handleTestLoading = async () => {
    startLoading('Processing data...');

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      updateProgress(i, `Processing... ${i}%`);
    }

    stopLoading();
    showSuccess('Processing completed!');
  };

  const handleTestError = () => {
    try {
      throw new Error('This is a test error to demonstrate error handling');
    } catch (error) {
      handleError(error, 'Test Operation');
    }
  };

  const handleTestAsyncError = async () => {
    await handleAsyncError(async () => {
      throw new Error('This is a test async error');
    }, 'Async Test Operation');
  };

  const handleTestConfirmation = () => {
    setConfirmDialog({
      open: true,
      type: 'delete',
      title: 'Delete Character',
      message:
        'Are you sure you want to delete this character? This action cannot be undone.',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        showSuccess('Character deleted successfully');
      },
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Typography variant="h4" component="h1">
            Admin Dashboard
          </Typography>
          <HelpTooltip
            title="Admin Dashboard"
            content="This is the main interface for managing game data. Use the navigation to access different data types."
            documentationUrl="https://github.com/your-repo/docs"
          />
        </Box>

        <Typography variant="h6" component="h2" gutterBottom>
          2D Simulation RPG Data Editor
        </Typography>

        <Typography variant="body1" sx={{ mb: 4 }}>
          Welcome to the admin dashboard for managing game data. This demo shows
          the error handling and user feedback system.
        </Typography>

        {/* Validation Errors Demo */}
        <ValidationErrorDisplay
          errors={validationErrors}
          title="Demo Validation Errors"
          onFieldClick={field =>
            showInfo(`Clicked on field: ${field}`, 'Field Navigation')
          }
        />

        {/* Demo Controls */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Error Handling & Feedback Demo
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={<SuccessIcon />}
              onClick={handleTestNotifications}
            >
              Test Notifications
            </Button>

            <Button
              variant="contained"
              onClick={handleTestLoading}
              disabled={isLoading}
            >
              Test Loading
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<ErrorIcon />}
              onClick={handleTestError}
            >
              Test Error
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={handleTestAsyncError}
            >
              Test Async Error
            </Button>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<WarningIcon />}
              onClick={handleTestConfirmation}
            >
              Test Confirmation
            </Button>
          </Stack>
        </Paper>

        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            This demo showcases the comprehensive error handling and user
            feedback system including: notifications, loading states, validation
            errors, confirmation dialogs, and help tooltips.
          </Typography>
        </Paper>
      </Box>

      <LoadingOverlay
        open={isLoading}
        message={message}
        progress={progress}
        variant={progress !== undefined ? 'linear' : 'circular'}
      />

      <ConfirmationDialog
        open={confirmDialog.open}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </Container>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;
