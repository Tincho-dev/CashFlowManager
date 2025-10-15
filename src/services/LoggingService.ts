export const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export const LogCategory = {
  ACCOUNT: 'ACCOUNT',
  TRANSACTION: 'TRANSACTION',
  SYSTEM: 'SYSTEM',
  USER: 'USER',
} as const;

export type LogCategory = typeof LogCategory[keyof typeof LogCategory];

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  details: Record<string, unknown>;
  userId?: string;
}

class LoggingService {
  private readonly STORAGE_KEY = 'cashflow_logs';
  private readonly MAX_LOGS = 1000;

  private getLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem(this.STORAGE_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error loading logs:', error);
      return [];
    }
  }

  private saveLogs(logs: LogEntry[]): void {
    try {
      // Keep only the most recent MAX_LOGS entries
      const trimmedLogs = logs.slice(-this.MAX_LOGS);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  log(
    level: LogLevel,
    category: LogCategory,
    action: string,
    details: Record<string, unknown> = {}
  ): void {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      details,
    };

    const logs = this.getLogs();
    logs.push(entry);
    this.saveLogs(logs);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level}] [${category}] ${action}:`, details);
    }
  }

  info(category: LogCategory, action: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, category, action, details);
  }

  warning(category: LogCategory, action: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.WARNING, category, action, details);
  }

  error(category: LogCategory, action: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, category, action, details);
  }

  debug(category: LogCategory, action: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, category, action, details);
  }

  getAllLogs(): LogEntry[] {
    return this.getLogs();
  }

  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.getLogs().filter(log => log.category === category);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.getLogs().filter(log => log.level === level);
  }

  getLogsByDateRange(startDate: Date, endDate: Date): LogEntry[] {
    return this.getLogs().filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  exportLogsAsCSV(): string {
    const logs = this.getLogs();
    if (logs.length === 0) return '';

    const headers = ['ID', 'Timestamp', 'Level', 'Category', 'Action', 'Details'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.id,
        log.timestamp,
        log.level,
        log.category,
        log.action,
        JSON.stringify(log.details).replace(/"/g, '""'),
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    return csvRows.join('\n');
  }
}

export default new LoggingService();
