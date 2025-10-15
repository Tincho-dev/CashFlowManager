import React from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  X
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.dashboard') },
    { path: '/accounts', icon: Wallet, label: t('nav.accounts') },
    { path: '/income', icon: TrendingUp, label: t('nav.income') },
    { path: '/expenses', icon: TrendingDown, label: t('nav.expenses') },
    { path: '/investments', icon: PiggyBank, label: t('nav.investments') },
    { path: '/loans', icon: CreditCard, label: t('nav.loans') },
    { path: '/transfers', icon: ArrowLeftRight, label: t('nav.transfers') },
    { path: '/export', icon: FileSpreadsheet, label: t('nav.export') },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1 className="app-title">{t('app.title')}</h1>
          <div className="header-actions">
            <LanguageSwitcher />
            <button 
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Icon size={20} />
                {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="main-content">
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu size={24} />
        </button>
        <div className="content-wrapper">
          {children}
        </div>
      </main>
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
