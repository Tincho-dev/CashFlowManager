/**
 * DataAccessLayer - Abstract data access to prepare for future backend migration
 * 
 * ARCHITECTURE DESIGN FOR FUTURE BACKEND INTEGRATION:
 * ===================================================
 * 
 * This layer abstracts database operations to enable seamless migration from SQLite (frontend)
 * to SQL Server (backend) in the future. The application follows an offline-first hybrid approach:
 * 
 * CURRENT STATE (Offline-first with SQLite):
 * - All data operations go through this DataAccessLayer
 * - Data is stored in browser's SQLite database
 * - Works completely offline
 * 
 * FUTURE STATE (Hybrid offline-first + backend sync):
 * - This layer will detect online/offline status
 * - When ONLINE: Operations sync with backend API (SQL Server)
 * - When OFFLINE: Operations use local SQLite cache
 * - Automatic conflict resolution and sync queue
 * 
 * HOW TO MIGRATE TO BACKEND:
 * ==========================
 * 
 * 1. CREATE BACKEND API ENDPOINTS:
 *    - POST   /api/investments       - Create investment
 *    - GET    /api/investments       - Get all investments
 *    - GET    /api/investments/:id   - Get investment by ID
 *    - PUT    /api/investments/:id   - Update investment
 *    - DELETE /api/investments/:id   - Delete investment
 *    (Same pattern for accounts, transactions, transfers, etc.)
 * 
 * 2. UPDATE THIS FILE:
 *    - Add backend API base URL configuration
 *    - Implement API client methods (fetch/axios)
 *    - Add online/offline detection
 *    - Implement sync queue for offline operations
 * 
 * 3. MODIFY EACH METHOD:
 *    Example for createInvestment():
 *    
 *    async createInvestment(data: InvestmentData): Promise<Investment> {
 *      // Log operation (keep existing logging)
 *      console.log('[DataAccessLayer] Creating investment:', data);
 *      
 *      // Try backend first if online
 *      if (navigator.onLine && this.backendAvailable) {
 *        try {
 *          const response = await fetch(`${API_BASE_URL}/api/investments`, {
 *            method: 'POST',
 *            headers: { 'Content-Type': 'application/json' },
 *            body: JSON.stringify(data)
 *          });
 *          const investment = await response.json();
 *          
 *          // Save to local cache for offline access
 *          this.saveToLocalCache('investments', investment);
 *          return investment;
 *        } catch (error) {
 *          console.error('Backend sync failed, using local storage', error);
 *          // Fall through to local storage
 *        }
 *      }
 *      
 *      // Use local SQLite (current implementation)
 *      const repository = new InvestmentRepository(this.getDatabase());
 *      const investment = repository.create(data);
 *      
 *      // Queue for sync when online
 *      if (!navigator.onLine) {
 *        this.addToSyncQueue('investments', 'create', investment);
 *      }
 *      
 *      return investment;
 *    }
 * 
 * 4. IMPLEMENT SYNC MECHANISM:
 *    - Create a SyncService to handle pending operations
 *    - On reconnection, process sync queue
 *    - Handle conflicts (last-write-wins, merge, etc.)
 *    - Update local cache with server state
 * 
 * 5. BACKEND REQUIREMENTS:
 *    - RESTful API with same data models
 *    - JWT authentication
 *    - Conflict resolution strategy
 *    - Timestamps for sync (created_at, updated_at, synced_at)
 * 
 * IMPORTANT NOTES:
 * ================
 * - DO NOT remove SQLite functionality - it's the offline-first cache
 * - Keep all logging for debugging and audit trail
 * - Test offline scenarios extensively
 * - Implement progressive enhancement (app works without backend)
 * - Add sync status indicators in UI
 */

import type { Database } from 'sql.js';
import { getDatabase } from './database';

export class DataAccessLayer {
  private static instance: DataAccessLayer | null = null;
  private db: Database | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Singleton pattern to ensure single instance
   * This prevents multiple database initializations
   */
  private constructor() {
    // Private constructor - use getInstance()
  }

  /**
   * Get the singleton instance of DataAccessLayer
   */
  public static getInstance(): DataAccessLayer {
    if (!DataAccessLayer.instance) {
      DataAccessLayer.instance = new DataAccessLayer();
    }
    return DataAccessLayer.instance;
  }

  /**
   * Initialize the data access layer
   * MUST be called before any data operations
   * Uses a promise to prevent race conditions with concurrent calls
   * 
   * Future: Add backend connection check here
   */
  public async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  /**
   * Internal initialization logic
   */
  private async _initialize(): Promise<void> {
    try {
      // Get database instance (already initialized by AppContext)
      this.db = getDatabase();
      this.isInitialized = true;
      console.log('[DataAccessLayer] Initialized successfully');
    } catch (error) {
      console.error('[DataAccessLayer] Initialization failed:', error);
      this.initPromise = null; // Reset to allow retry
      throw error;
    }
  }

  /**
   * Get database instance
   * Throws error if not initialized
   * 
   * Future: This will return either local DB or act as API client
   */
  public getDb(): Database {
    if (!this.db || !this.isInitialized) {
      throw new Error('DataAccessLayer not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Check if layer is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Reset the data access layer
   * Used for testing or re-initialization
   */
  public reset(): void {
    this.db = null;
    this.isInitialized = false;
    console.log('[DataAccessLayer] Reset completed');
  }

  /**
   * FUTURE METHODS TO IMPLEMENT FOR BACKEND INTEGRATION:
   * 
   * - setBackendUrl(url: string): void
   * - isOnline(): boolean
   * - syncPendingOperations(): Promise<void>
   * - addToSyncQueue(entity: string, operation: string, data: any): void
   * - processSyncQueue(): Promise<void>
   * - handleSyncConflict(local: any, remote: any): any
   * - saveToLocalCache(entity: string, data: any): void
   * - clearSyncQueue(): void
   */
}

// Export singleton instance
export default DataAccessLayer.getInstance();
