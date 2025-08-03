import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export type ConfirmationType =
  | 'delete'
  | 'save'
  | 'discard'
  | 'warning'
  | 'info';

interface ConfirmationDialogProps {
  open: boolean;
  type: ConfirmationType;
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const getDialogConfig = (type: ConfirmationType) => {
  switch (type) {
    case 'delete':
      return {
        icon: <DeleteIcon />,
        color: 'error' as const,
        severity: 'error' as const,
        defaultConfirmText: 'Delete',
      };
    case 'save':
      return {
        icon: <SaveIcon />,
        color: 'primary' as const,
        severity: 'info' as const,
        defaultConfirmText: 'Save',
      };
    case 'discard':
      return {
        icon: <WarningIcon />,
        color: 'warning' as const,
        severity: 'warning' as const,
        defaultConfirmText: 'Discard',
      };
    case 'warning':
      return {
        icon: <WarningIcon />,
        color: 'warning' as const,
        severity: 'warning' as const,
        defaultConfirmText: 'Continue',
      };
    case 'info':
    default:
      return {
        icon: <InfoIcon />,
        color: 'primary' as const,
        severity: 'info' as const,
        defaultConfirmText: 'OK',
      };
  }
};

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  type,
  title,
  message,
  details,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const config = getDialogConfig(type);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 8,
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: `${config.color}.main` }}>{config.icon}</Box>
          {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity={config.severity} sx={{ mb: 2 }}>
          <Typography variant="body1">{message}</Typography>
        </Alert>

        {details && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {details}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined">
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={config.color}
          startIcon={loading ? undefined : config.icon}
        >
          {loading ? 'Processing...' : confirmText || config.defaultConfirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
