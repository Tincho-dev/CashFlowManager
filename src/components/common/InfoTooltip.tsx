import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  size?: number;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, size = 18 }) => {
  return (
    <Tooltip title={title} arrow placement="right">
      <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }}>
        <HelpCircle size={size} />
      </IconButton>
    </Tooltip>
  );
};

export default InfoTooltip;
