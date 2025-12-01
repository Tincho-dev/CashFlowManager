import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation as MuiBottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { 
  Home, 
  Wallet, 
  ArrowLeftRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navigationItems = [
    { path: '/', icon: Home, label: t('nav.dashboard') },
    { path: '/accounts', icon: Wallet, label: t('nav.accounts') },
    { path: '/transactions', icon: ArrowLeftRight, label: t('nav.transactions') },
  ];

  const currentIndex = navigationItems.findIndex(item => item.path === location.pathname);
  const value = currentIndex >= 0 ? currentIndex : 0;

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        display: { xs: 'block', md: 'none' },
        zIndex: 1100
      }} 
      elevation={3}
    >
      <MuiBottomNavigation
        value={value}
        onChange={(_, newValue) => {
          navigate(navigationItems[newValue].path);
        }}
        showLabels
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={<Icon size={24} />}
            />
          );
        })}
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;
