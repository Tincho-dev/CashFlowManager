import React from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Home, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  ArrowLeftRight,
  PiggyBank,
  FileSpreadsheet,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import BottomNavigation from './BottomNavigation';
import Chatbot from '../chatbot/Chatbot';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const navItems = [
    { path: '/', icon: Home, label: t('nav.dashboard') },
    { path: '/accounts', icon: Wallet, label: t('nav.accounts') },
    { path: '/income', icon: TrendingUp, label: t('nav.income') },
    { path: '/expenses', icon: TrendingDown, label: t('nav.expenses') },
    { path: '/investments', icon: PiggyBank, label: t('nav.investments') },
    { path: '/loans', icon: CreditCard, label: t('nav.loans') },
    { path: '/transfers', icon: ArrowLeftRight, label: t('nav.transfers') },
    { path: '/currency-exchange', icon: RefreshCw, label: t('nav.currencyExchange') },
    { path: '/export', icon: FileSpreadsheet, label: t('nav.export') },
  ];

  const handleNavClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a2e', color: 'white' }}>
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          {t('app.title')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LanguageSwitcher />
          {isMobile && (
            <IconButton
              onClick={() => setIsSidebarOpen(false)}
              sx={{ color: 'white', p: 0.5 }}
            >
              <X size={20} />
            </IconButton>
          )}
        </Box>
      </Box>
      <List sx={{ flex: 1, py: 2.5 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={handleNavClick}
                selected={isActive}
                sx={{
                  py: 1.5,
                  px: 2.5,
                  color: isActive ? '#4a90e2' : 'rgba(255, 255, 255, 0.7)',
                  bgcolor: isActive ? '#16213e' : 'transparent',
                  borderLeft: isActive ? '4px solid #4a90e2' : 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  },
                  '&.Mui-selected': {
                    bgcolor: '#16213e',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  <Icon size={20} />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Desktop Drawer */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: 250,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 250,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <>
          <IconButton
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            sx={{
              position: 'fixed',
              top: 15,
              left: 15,
              zIndex: 1101,
              bgcolor: '#1a1a2e',
              color: 'white',
              '&:hover': {
                bgcolor: '#16213e',
              },
              boxShadow: 2,
            }}
          >
            <Menu size={24} />
          </IconButton>
          <Drawer
            anchor="left"
            open={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 250,
                boxSizing: 'border-box',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 2, md: 4 },
          pb: { xs: 10, md: 4 }, // Extra padding bottom for mobile nav
        }}
      >
        <Box sx={{ maxWidth: 1400, margin: '0 auto', pt: { xs: 7, md: 0 } }}>
          {children}
        </Box>
      </Box>

      {/* Bottom Navigation for Mobile */}
      {isMobile && <BottomNavigation />}

      {/* AI Chatbot */}
      <Chatbot />
    </Box>
  );
};

export default Layout;
