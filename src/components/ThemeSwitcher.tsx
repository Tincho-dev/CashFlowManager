import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks';

const ThemeSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { mode, toggleTheme } = useTheme();

  const isDarkMode = mode === 'dark';
  const tooltipText = isDarkMode ? t('theme.switchToLight') : t('theme.switchToDark');

  return (
    <Tooltip title={tooltipText}>
      <IconButton
        onClick={toggleTheme}
        aria-label={t('theme.toggle')}
        sx={{
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        {isDarkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeSwitcher;
