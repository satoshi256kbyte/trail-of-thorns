import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
          }}
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 600 }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <BugReportIcon
                  sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
                />
                <Typography variant="h4" gutterBottom>
                  Something went wrong
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  An unexpected error occurred in the admin dashboard.
                </Typography>
              </Box>

              <Alert severity="error">
                <AlertTitle>Error Details</AlertTitle>
                {this.state.error?.message || 'Unknown error occurred'}
              </Alert>

              <Box>
                <Typography variant="h6" gutterBottom>
                  What you can do:
                </Typography>
                <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                  <li>Try refreshing the page</li>
                  <li>Check if your data files are valid JSON</li>
                  <li>Clear your browser cache and try again</li>
                  <li>If the problem persists, contact support</li>
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                <Button variant="outlined" onClick={this.handleReset}>
                  Try Again
                </Button>
              </Stack>

              {process.env.NODE_ENV === 'development' &&
                this.state.errorInfo && (
                  <Alert severity="info">
                    <AlertTitle>Development Info</AlertTitle>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {this.state.error?.stack}
                    </Typography>
                  </Alert>
                )}
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
