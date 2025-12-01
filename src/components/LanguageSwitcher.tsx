import React from 'react';
import { IconButton, Menu, MenuItem, Box } from '@mui/material';
import { Languages } from 'lucide-react';
import { useLanguage } from '../hooks';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    handleClose();
  };

  return (
    <Box>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Languages size={20} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => handleLanguageChange('en')}
          selected={language === 'en'}
        >
          🇺🇸 English (USD)
        </MenuItem>
        <MenuItem
          onClick={() => handleLanguageChange('es')}
          selected={language === 'es'}
        >
          🇦🇷 Español (ARS)
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
