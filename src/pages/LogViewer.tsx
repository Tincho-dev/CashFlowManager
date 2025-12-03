import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Collapse,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Trash2,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import LoggingService, {
  LogLevel,
  LogCategory,
} from '../services/LoggingService';
import type { LogEntry } from '../services/LoggingService';
import styles from './LogViewer.module.scss';

// Type aliases for filter states that can be empty
type LogLevelFilter = typeof LogLevel[keyof typeof LogLevel] | '';
type LogCategoryFilter = typeof LogCategory[keyof typeof LogCategory] | '';

const ITEMS_PER_PAGE = 20;

const LogViewer: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>(() => LoggingService.getAllLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<LogLevelFilter>('');
  const [filterCategory, setFilterCategory] = useState<LogCategoryFilter>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const refreshLogs = useCallback(() => {
    setLogs(LoggingService.getAllLogs());
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(query);
        if (!matchesAction && !matchesDetails) {
          return false;
        }
      }

      // Level filter
      if (filterLevel && log.level !== filterLevel) {
        return false;
      }

      // Category filter
      if (filterCategory && log.category !== filterCategory) {
        return false;
      }

      // Date range filter
      if (filterDateFrom) {
        const logDate = new Date(log.timestamp);
        const fromDate = new Date(filterDateFrom);
        if (logDate < fromDate) return false;
      }

      if (filterDateTo) {
        const logDate = new Date(log.timestamp);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) return false;
      }

      return true;
    });
  }, [logs, searchQuery, filterLevel, filterCategory, filterDateFrom, filterDateTo]);

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [filteredLogs]);

  // Pagination
  const totalPages = Math.ceil(sortedLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedLogs, currentPage]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((l) => l.level === LogLevel.INFO).length,
      warning: logs.filter((l) => l.level === LogLevel.WARNING).length,
      error: logs.filter((l) => l.level === LogLevel.ERROR).length,
      debug: logs.filter((l) => l.level === LogLevel.DEBUG).length,
    };
  }, [logs]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterLevel('');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const handleClearLogs = () => {
    setShowClearDialog(true);
  };

  const confirmClearLogs = () => {
    LoggingService.clearLogs();
    refreshLogs();
    setShowClearDialog(false);
  };

  const handleExportJSON = () => {
    const data = LoggingService.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const data = LoggingService.exportLogsAsCSV();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: typeof LogLevel[keyof typeof LogLevel]) => {
    switch (level) {
      case LogLevel.ERROR:
        return <AlertCircle size={16} />;
      case LogLevel.WARNING:
        return <AlertTriangle size={16} />;
      case LogLevel.INFO:
        return <Info size={16} />;
      case LogLevel.DEBUG:
        return <Bug size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const getLevelColor = (level: typeof LogLevel[keyof typeof LogLevel]): 'error' | 'warning' | 'info' | 'default' => {
    switch (level) {
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.WARNING:
        return 'warning';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.DEBUG:
        return 'default';
      default:
        return 'default';
    }
  };

  const getCategoryColor = (category: typeof LogCategory[keyof typeof LogCategory]): string => {
    switch (category) {
      case LogCategory.ACCOUNT:
        return '#4a90e2';
      case LogCategory.TRANSACTION:
        return '#4caf50';
      case LogCategory.SYSTEM:
        return '#9c27b0';
      case LogCategory.USER:
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const hasActiveFilters = searchQuery || filterLevel || filterCategory || filterDateFrom || filterDateTo;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Header */}
      <Box className={styles.header}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          {t('logs.title')}
        </Typography>
        <Box className={styles.controls}>
          <Tooltip title={t('logs.exportJSON')}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportJSON}
              startIcon={<Download size={16} />}
              aria-label={t('logs.exportJSON')}
            >
              JSON
            </Button>
          </Tooltip>
          <Tooltip title={t('logs.exportCSV')}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportCSV}
              startIcon={<Download size={16} />}
              aria-label={t('logs.exportCSV')}
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title={t('logs.clearAll')}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleClearLogs}
              startIcon={<Trash2 size={16} />}
              aria-label={t('logs.clearAll')}
            >
              {t('logs.clearAll')}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats */}
      <Box className={styles.statsGrid}>
        <Paper className={styles.statCard}>
          <Typography className={styles.statValue}>{stats.total}</Typography>
          <Typography className={styles.statLabel}>{t('logs.total')}</Typography>
        </Paper>
        <Paper className={styles.statCard} sx={{ borderLeft: '4px solid #2196f3' }}>
          <Typography className={styles.statValue}>{stats.info}</Typography>
          <Typography className={styles.statLabel}>{t('logs.levels.info')}</Typography>
        </Paper>
        <Paper className={styles.statCard} sx={{ borderLeft: '4px solid #ff9800' }}>
          <Typography className={styles.statValue}>{stats.warning}</Typography>
          <Typography className={styles.statLabel}>{t('logs.levels.warning')}</Typography>
        </Paper>
        <Paper className={styles.statCard} sx={{ borderLeft: '4px solid #f44336' }}>
          <Typography className={styles.statValue}>{stats.error}</Typography>
          <Typography className={styles.statLabel}>{t('logs.levels.error')}</Typography>
        </Paper>
        <Paper className={styles.statCard} sx={{ borderLeft: '4px solid #9e9e9e' }}>
          <Typography className={styles.statValue}>{stats.debug}</Typography>
          <Typography className={styles.statLabel}>{t('logs.levels.debug')}</Typography>
        </Paper>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          placeholder={t('logs.search')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')} aria-label={t('logs.clearSearch')}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          size="small"
          startIcon={<Filter size={16} />}
          endIcon={showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {t('logs.filters')}
          {hasActiveFilters && (
            <Chip label="!" size="small" color="warning" sx={{ ml: 1, height: 18, minWidth: 18 }} />
          )}
        </Button>
      </Box>

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box className={styles.filtersContainer}>
            <TextField
              select
              label={t('logs.filterLevel')}
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value as LogLevelFilter);
                setCurrentPage(1);
              }}
              size="small"
              className={styles.filterGroup}
            >
              <MenuItem value="">{t('logs.allLevels')}</MenuItem>
              <MenuItem value={LogLevel.INFO}>{t('logs.levels.info')}</MenuItem>
              <MenuItem value={LogLevel.WARNING}>{t('logs.levels.warning')}</MenuItem>
              <MenuItem value={LogLevel.ERROR}>{t('logs.levels.error')}</MenuItem>
              <MenuItem value={LogLevel.DEBUG}>{t('logs.levels.debug')}</MenuItem>
            </TextField>

            <TextField
              select
              label={t('logs.filterCategory')}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value as LogCategoryFilter);
                setCurrentPage(1);
              }}
              size="small"
              className={styles.filterGroup}
            >
              <MenuItem value="">{t('logs.allCategories')}</MenuItem>
              <MenuItem value={LogCategory.ACCOUNT}>{t('logs.categories.account')}</MenuItem>
              <MenuItem value={LogCategory.TRANSACTION}>{t('logs.categories.transaction')}</MenuItem>
              <MenuItem value={LogCategory.SYSTEM}>{t('logs.categories.system')}</MenuItem>
              <MenuItem value={LogCategory.USER}>{t('logs.categories.user')}</MenuItem>
            </TextField>

            <TextField
              label={t('logs.dateFrom')}
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              size="small"
              className={styles.filterGroup}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <TextField
              label={t('logs.dateTo')}
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setCurrentPage(1);
              }}
              size="small"
              className={styles.filterGroup}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          {hasActiveFilters && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button size="small" onClick={clearFilters} startIcon={<X size={16} />}>
                {t('logs.clearFilters')}
              </Button>
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* Results Count */}
      {logs.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('logs.showingResults', { count: sortedLogs.length, total: logs.length })}
        </Typography>
      )}

      {/* Logs List */}
      <Paper sx={{ overflow: 'hidden' }}>
        {paginatedLogs.length === 0 ? (
          <Box className={styles.emptyState}>
            <FileText size={48} />
            <Typography>
              {logs.length === 0 ? t('logs.empty') : t('logs.noMatchingResults')}
            </Typography>
          </Box>
        ) : (
          <>
            {paginatedLogs.map((log) => (
              <Box
                key={log.id}
                className={styles.logEntry}
                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedLogId(expandedLogId === log.id ? null : log.id);
                  }
                }}
                aria-expanded={expandedLogId === log.id}
              >
                <Box className={styles.logHeader}>
                  <Box className={styles.logMeta}>
                    <Chip
                      icon={getLevelIcon(log.level)}
                      label={t(`logs.levels.${log.level.toLowerCase()}`)}
                      size="small"
                      color={getLevelColor(log.level)}
                    />
                    <Chip
                      label={t(`logs.categories.${log.category.toLowerCase()}`)}
                      size="small"
                      sx={{
                        backgroundColor: getCategoryColor(log.category),
                        color: 'white',
                      }}
                    />
                    <Typography className={styles.logAction}>{log.action}</Typography>
                  </Box>
                  <Typography className={styles.logTimestamp}>
                    {new Date(log.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Collapse in={expandedLogId === log.id}>
                  <Box className={styles.logDetails}>
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </Box>
                </Collapse>
              </Box>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box className={styles.pagination}>
                <IconButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label={t('logs.previousPage')}
                >
                  <ChevronLeft size={20} />
                </IconButton>
                <Typography className={styles.pageInfo}>
                  {t('logs.pageInfo', { current: currentPage, total: totalPages })}
                </Typography>
                <IconButton
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label={t('logs.nextPage')}
                >
                  <ChevronRight size={20} />
                </IconButton>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Clear Logs Confirmation Dialog */}
      <Dialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        aria-labelledby="clear-logs-dialog-title"
        aria-describedby="clear-logs-dialog-description"
      >
        <DialogTitle id="clear-logs-dialog-title">
          {t('logs.clearAll')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-logs-dialog-description">
            {t('logs.clearConfirm')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirmClearLogs} color="error" autoFocus>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LogViewer;
