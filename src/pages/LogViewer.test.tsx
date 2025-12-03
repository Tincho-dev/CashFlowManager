import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/config';
import LogViewer from './LogViewer';
import LoggingService, { LogLevel, LogCategory } from '../services/LoggingService';

// Wrap component with necessary providers
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>{component}</I18nextProvider>
    </BrowserRouter>
  );
};

describe('LogViewer', () => {
  const mockLogs = [
    {
      id: '1',
      timestamp: '2025-01-01T10:00:00.000Z',
      level: LogLevel.INFO,
      category: LogCategory.ACCOUNT,
      action: 'CREATE_ACCOUNT',
      details: { accountId: 1, name: 'Test Account' },
    },
    {
      id: '2',
      timestamp: '2025-01-01T11:00:00.000Z',
      level: LogLevel.WARNING,
      category: LogCategory.TRANSACTION,
      action: 'LOW_BALANCE',
      details: { accountId: 1, balance: 100 },
    },
    {
      id: '3',
      timestamp: '2025-01-01T12:00:00.000Z',
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      action: 'DATABASE_ERROR',
      details: { error: 'Connection failed' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock LoggingService methods
    vi.spyOn(LoggingService, 'getAllLogs').mockReturnValue(mockLogs);
    vi.spyOn(LoggingService, 'clearLogs').mockImplementation(() => {});
    vi.spyOn(LoggingService, 'exportLogs').mockReturnValue(JSON.stringify(mockLogs, null, 2));
    vi.spyOn(LoggingService, 'exportLogsAsCSV').mockReturnValue('ID,Timestamp,Level,Category,Action,Details\n1,2025-01-01,INFO,ACCOUNT,CREATE_ACCOUNT,{}');
  });

  it('should render the log viewer title', () => {
    renderWithProviders(<LogViewer />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/logs|registros/i);
  });

  it('should display stats cards', () => {
    renderWithProviders(<LogViewer />);
    // Check for total logs count
    expect(screen.getByText('3')).toBeInTheDocument();
    // Check for stats labels
    expect(screen.getByText(/total/i)).toBeInTheDocument();
  });

  it('should render log entries', () => {
    renderWithProviders(<LogViewer />);
    expect(screen.getByText('CREATE_ACCOUNT')).toBeInTheDocument();
    expect(screen.getByText('LOW_BALANCE')).toBeInTheDocument();
    expect(screen.getByText('DATABASE_ERROR')).toBeInTheDocument();
  });

  it('should filter logs by search query', () => {
    renderWithProviders(<LogViewer />);
    const searchInput = screen.getByPlaceholderText(/search|buscar/i);
    fireEvent.change(searchInput, { target: { value: 'CREATE' } });
    expect(screen.getByText('CREATE_ACCOUNT')).toBeInTheDocument();
    expect(screen.queryByText('LOW_BALANCE')).not.toBeInTheDocument();
    expect(screen.queryByText('DATABASE_ERROR')).not.toBeInTheDocument();
  });

  it('should show empty state when no logs', () => {
    vi.spyOn(LoggingService, 'getAllLogs').mockReturnValue([]);
    renderWithProviders(<LogViewer />);
    expect(screen.getByText(/no logs|no hay registros/i)).toBeInTheDocument();
  });

  it('should show export buttons', () => {
    renderWithProviders(<LogViewer />);
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('should toggle filter panel', () => {
    renderWithProviders(<LogViewer />);
    const filterButton = screen.getByRole('button', { name: /filters|filtros/i });
    fireEvent.click(filterButton);
    // After clicking, the filter panel should be visible
    expect(screen.getByLabelText(/filter by level|filtrar por nivel/i)).toBeInTheDocument();
  });

  it('should expand log details when clicked', () => {
    renderWithProviders(<LogViewer />);
    const logEntry = screen.getByText('CREATE_ACCOUNT').closest('[role="button"]');
    if (logEntry) {
      fireEvent.click(logEntry);
      // After expanding, the details should be visible
      expect(screen.getByText(/Test Account/i)).toBeInTheDocument();
    }
  });

  it('should clear search when clear button is clicked', () => {
    renderWithProviders(<LogViewer />);
    const searchInput = screen.getByPlaceholderText(/search|buscar/i);
    fireEvent.change(searchInput, { target: { value: 'CREATE' } });
    
    // Find and click clear button
    const clearButton = screen.getByRole('button', { name: /clear search|limpiar/i });
    fireEvent.click(clearButton);
    
    // All logs should be visible again
    expect(screen.getByText('CREATE_ACCOUNT')).toBeInTheDocument();
    expect(screen.getByText('LOW_BALANCE')).toBeInTheDocument();
    expect(screen.getByText('DATABASE_ERROR')).toBeInTheDocument();
  });

  it('should have accessible log entries', () => {
    renderWithProviders(<LogViewer />);
    const logEntries = screen.getAllByRole('button');
    // Verify log entries have proper aria attributes
    logEntries.forEach((entry) => {
      if (entry.getAttribute('aria-expanded') !== null) {
        expect(entry).toHaveAttribute('tabIndex', '0');
      }
    });
  });
});
