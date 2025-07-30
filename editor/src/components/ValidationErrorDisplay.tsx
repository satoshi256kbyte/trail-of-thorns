import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  path: string[];
  value?: any;
  suggestion?: string;
}

interface ValidationErrorDisplayProps {
  errors: ValidationError[];
  title?: string;
  onFieldClick?: (field: string) => void;
}

const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  title = 'Validation Errors',
  onFieldClick,
}) => {
  if (errors.length === 0) {
    return null;
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const groupedErrors = errors.reduce((acc, error) => {
    const key = error.path[0] || 'general';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  return (
    <Paper elevation={2} sx={{ mb: 2 }}>
      <Alert severity={errorCount > 0 ? 'error' : 'warning'}>
        <AlertTitle>
          {title}
          <Box component="span" sx={{ ml: 2 }}>
            {errorCount > 0 && (
              <Chip
                label={`${errorCount} errors`}
                color="error"
                size="small"
                sx={{ mr: 1 }}
              />
            )}
            {warningCount > 0 && (
              <Chip
                label={`${warningCount} warnings`}
                color="warning"
                size="small"
              />
            )}
          </Box>
        </AlertTitle>

        <Box sx={{ mt: 2 }}>
          {Object.entries(groupedErrors).map(([section, sectionErrors]) => (
            <Accordion key={section} defaultExpanded={errorCount > 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                  <Chip
                    label={sectionErrors.length}
                    size="small"
                    sx={{ ml: 1 }}
                    color={sectionErrors.some(e => e.severity === 'error') ? 'error' : 'warning'}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {sectionErrors.map((error, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        cursor: onFieldClick ? 'pointer' : 'default',
                        '&:hover': onFieldClick ? { bgcolor: 'action.hover' } : {},
                        borderRadius: 1,
                      }}
                      onClick={() => onFieldClick?.(error.field)}
                    >
                      <ListItemIcon>
                        {error.severity === 'error' ? (
                          <ErrorIcon color="error" data-testid="ErrorIcon" />
                        ) : (
                          <WarningIcon color="warning" data-testid="WarningIcon" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box component="span">
                            <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                              {error.field}:
                            </Typography>
                            <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                              {error.message}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {error.value !== undefined && (
                              <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                                Current value: {JSON.stringify(error.value)}
                              </Typography>
                            )}
                            {error.suggestion && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                💡 {error.suggestion}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Alert>
    </Paper>
  );
};

export default ValidationErrorDisplay;