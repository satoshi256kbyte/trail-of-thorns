import React from 'react';
import {
  Tooltip,
  IconButton,
  Typography,
  Box,
  Link,
} from '@mui/material';
import {
  Help as HelpIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface HelpTooltipProps {
  title: string;
  content: string;
  documentationUrl?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'small' | 'medium';
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  documentationUrl,
  placement = 'top',
  size = 'small',
}) => {
  const tooltipContent = (
    <Box sx={{ maxWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mb: documentationUrl ? 1 : 0 }}>
        {content}
      </Typography>
      {documentationUrl && (
        <Link
          href={documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.75rem',
            mt: 1,
          }}
        >
          Learn more
          <OpenInNewIcon sx={{ fontSize: '0.75rem' }} />
        </Link>
      )}
    </Box>
  );

  return (
    <Tooltip
      title={tooltipContent}
      placement={placement}
      arrow
      enterDelay={500}
      leaveDelay={200}
    >
      <IconButton
        size={size}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.main',
          },
        }}
      >
        <HelpIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};

export default HelpTooltip;