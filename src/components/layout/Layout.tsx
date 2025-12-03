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
  useTheme as useMuiTheme
} from '@mui/material';
import { 
  Home, 
  Wallet, 
  ArrowLeftRight,
  FileSpreadsheet,
  CreditCard,
  Menu,
  X,
  Landmark,
  Upload,
  RefreshCw,
  PiggyBank,
  FileText,
  BarChart3
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeSwitcher from '../ThemeSwitcher';
import BottomNavigation from './BottomNavigation';
import Chatbot from '../chatbot/Chatbot';
import { useTheme } from '../../hooks';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const { mode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));

  // Define colors based on theme mode
  const sidebarBgColor = mode === 'dark' ? '#0d0d1a' : '#1a1a2e';
  const sidebarActiveBgColor = mode === 'dark' ? '#1a1a2e' : '#16213e';
  const mainBgColor = mode === 'dark' ? '#121212' : '#f5f5f5';

  const navItems = [
    { path: '/', icon: Home, label: t('nav.dashboard') },
    { path: '/accounts', icon: Wallet, label: t('nav.accounts') },
    { path: '/transactions', icon: ArrowLeftRight, label: t('nav.transactions') },
    { path: '/investments', icon: PiggyBank, label: t('nav.investments') },
    { path: '/loans', icon: Landmark, label: t('nav.loans') },
    { path: '/currency-exchange', icon: RefreshCw, label: t('nav.currencyExchange') },
    { path: '/credit-cards', icon: CreditCard, label: t('nav.creditCards') },
    { path: '/reports', icon: BarChart3, label: t('nav.reports') },
    { path: '/import', icon: Upload, label: t('nav.import') },
    { path: '/export', icon: FileSpreadsheet, label: t('nav.export') },
    { path: '/logs', icon: FileText, label: t('nav.logs') },
  ];

  const handleNavClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: sidebarBgColor, color: 'white' }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ThemeSwitcher />
          <LanguageSwitcher />
          {isMobile && (
            <IconButton
              onClick={() => setIsSidebarOpen(false)}
              sx={{ color: 'white', p: 0.5 }}
              aria-label={t('nav.closeSidebar')}
            >
              <X size={20} aria-hidden="true" />
            </IconButton>
          )}
        </Box>
      </Box>
      <List sx={{ flex: 1, py: 2.5 }} role="navigation" aria-label={t('nav.mainNavigation')}>
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
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  py: 1.5,
                  px: 2.5,
                  color: isActive ? '#4a90e2' : 'rgba(255, 255, 255, 0.7)',
                  bgcolor: isActive ? sidebarActiveBgColor : 'transparent',
                  borderLeft: isActive ? '4px solid #4a90e2' : 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  },
                  '&.Mui-selected': {
                    bgcolor: sidebarActiveBgColor,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  <Icon size={20} aria-hidden="true" />
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
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: mainBgColor }}>
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
            aria-label={t('nav.dashboard')}
            aria-expanded={isSidebarOpen}
            sx={{
              position: 'fixed',
              top: 15,
              left: 15,
              zIndex: 1101,
              bgcolor: sidebarBgColor,
              color: 'white',
              '&:hover': {
                bgcolor: sidebarActiveBgColor,
              },
              boxShadow: 2,
            }}
          >
            <Menu size={24} aria-hidden="true" />
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
