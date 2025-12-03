import LoggingService, { LogCategory } from './LoggingService';

interface SyncRecord {
  id: string;
  type: 'account' | 'transaction' | 'investment' | 'loan' | 'transfer';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: Date;
  synced: boolean;
}

interface CloudSyncConfig {
  provider: 'google' | 'sharepoint' | null;
  spreadsheetId?: string;
  accessToken?: string;
  enabled: boolean;
}

/**
 * CloudSyncService - Handles offline-first synchronization with cloud spreadsheets
 * 
 * Features:
 * - Offline-first: Changes are queued and synced when online
 * - Google Sheets integration (future)
 * - SharePoint integration (future)
 * - Automatic sync on reconnection
 * 
 * Note: Full OAuth implementation requires backend service.
 * This is a foundation for future cloud sync capabilities.
 */
class CloudSyncService {
  private syncQueue: SyncRecord[] = [];
  private config: CloudSyncConfig = {
    provider: null,
    enabled: false,
  };
  private readonly QUEUE_KEY = 'cashflow_sync_queue';
  private readonly CONFIG_KEY = 'cashflow_sync_config';
  private isSyncing = false;

  constructor() {
    this.loadQueue();
    this.loadConfig();
    this.setupOnlineListener();
  }

  private loadQueue(): void {
    try {
      const saved = localStorage.getItem(this.QUEUE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Array<SyncRecord & { timestamp: string }>;
        this.syncQueue = parsed.map((record) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        }));
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'SYNC_QUEUE_LOAD_ERROR', {
        error: String(error),
      });
    }
  }

  private saveQueue(): void {
    try {
      const toSave = this.syncQueue.map(record => ({
        ...record,
        timestamp: record.timestamp.toISOString(),
      }));
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(toSave));
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'SYNC_QUEUE_SAVE_ERROR', {
        error: String(error),
      });
    }
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'SYNC_CONFIG_LOAD_ERROR', {
        error: String(error),
      });
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'SYNC_CONFIG_SAVE_ERROR', {
        error: String(error),
      });
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      if (this.config.enabled) {
        this.processSyncQueue();
      }
    });
  }

  /**
   * Configure cloud sync
   */
  configure(config: Partial<CloudSyncConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    LoggingService.info(LogCategory.SYSTEM, 'CLOUD_SYNC_CONFIGURED', {
      provider: this.config.provider,
      enabled: this.config.enabled,
    });
  }

  /**
   * Enable or disable sync
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
    
    if (enabled && navigator.onLine) {
      this.processSyncQueue();
    }
  }

  /**
   * Queue a record for sync
   */
  queueRecord(
    type: SyncRecord['type'],
    action: SyncRecord['action'],
    data: unknown
  ): void {
    if (!this.config.enabled) return;

    const record: SyncRecord = {
      id: `${type}-${action}-${Date.now()}`,
      type,
      action,
      data,
      timestamp: new Date(),
      synced: false,
    };

    this.syncQueue.push(record);
    this.saveQueue();

    LoggingService.info(LogCategory.SYSTEM, 'SYNC_RECORD_QUEUED', {
      type,
      action,
      queueSize: this.syncQueue.length,
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0 || !this.config.enabled) {
      return;
    }

    this.isSyncing = true;

    try {
      const unsyncedRecords = this.syncQueue.filter(r => !r.synced);
      
      for (const record of unsyncedRecords) {
        try {
          await this.syncRecord(record);
          record.synced = true;
        } catch (error) {
          LoggingService.error(LogCategory.SYSTEM, 'SYNC_RECORD_ERROR', {
            recordId: record.id,
            error: String(error),
          });
          // Keep record in queue for retry
        }
      }

      // Remove synced records older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.syncQueue = this.syncQueue.filter(
        r => !r.synced || r.timestamp.getTime() > oneDayAgo
      );

      this.saveQueue();

      LoggingService.info(LogCategory.SYSTEM, 'SYNC_QUEUE_PROCESSED', {
        synced: unsyncedRecords.length,
        remaining: this.syncQueue.filter(r => !r.synced).length,
      });
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'SYNC_QUEUE_PROCESS_ERROR', {
        error: String(error),
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single record to the cloud
   * This is a placeholder - actual implementation depends on the provider
   */
  private async syncRecord(record: SyncRecord): Promise<void> {
    if (!this.config.provider) {
      throw new Error('No sync provider configured');
    }

    // Placeholder for actual sync logic
    // In a real implementation:
    // - Google Sheets: Use Google Sheets API
    // - SharePoint: Use Microsoft Graph API
    
    LoggingService.info(LogCategory.SYSTEM, 'SYNC_RECORD_PLACEHOLDER', {
      provider: this.config.provider,
      recordType: record.type,
      action: record.action,
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get sync status
   */
  getStatus(): {
    enabled: boolean;
    provider: string | null;
    queueSize: number;
    unsyncedCount: number;
    isSyncing: boolean;
  } {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      queueSize: this.syncQueue.length,
      unsyncedCount: this.syncQueue.filter(r => !r.synced).length,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.saveQueue();
    LoggingService.info(LogCategory.SYSTEM, 'SYNC_QUEUE_CLEARED', {});
  }

  /**
   * Force sync now
   */
  async syncNow(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    
    if (!this.config.enabled) {
      throw new Error('Sync is not enabled');
    }

    await this.processSyncQueue();
  }
}

export default new CloudSyncService();
