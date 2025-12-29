// ============================================================
// Immersa 3D - Model Manager
// IndexedDB model caching with hash verification
// ============================================================

/**
 * Model metadata stored in IndexedDB
 */
export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  size: number;
  hash: string;
  downloadedAt: number;
  lastUsedAt: number;
}

/**
 * Model cache entry
 */
interface CacheEntry {
  metadata: ModelMetadata;
  blob: Blob;
}

const DB_NAME = 'immersa3d-models';
const DB_VERSION = 1;
const STORE_NAME = 'models';

/**
 * ModelManager - Handles model caching in IndexedDB
 */
class ModelManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[ModelManager] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ModelManager] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'metadata.id' });
          store.createIndex('hash', 'metadata.hash', { unique: false });
          console.log('[ModelManager] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Check if a model is cached
   */
  async has(modelId: string): Promise<boolean> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(modelId);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get a cached model
   */
  async get(modelId: string): Promise<CacheEntry | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(modelId);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        
        if (entry) {
          // Update last used timestamp
          entry.metadata.lastUsedAt = Date.now();
          store.put(entry);
        }
        
        resolve(entry || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Store a model in cache
   */
  async set(metadata: ModelMetadata, blob: Blob): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const entry: CacheEntry = {
        metadata: {
          ...metadata,
          downloadedAt: Date.now(),
          lastUsedAt: Date.now(),
        },
        blob,
      };

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        console.log(`[ModelManager] Model "${metadata.id}" cached`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete a model from cache
   */
  async delete(modelId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(modelId);

      request.onsuccess = () => {
        console.log(`[ModelManager] Model "${modelId}" deleted from cache`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all cached model metadata
   */
  async listAll(): Promise<ModelMetadata[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        resolve(entries.map(e => e.metadata));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Calculate total cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    const entries = await this.listAll();
    return entries.reduce((total, meta) => total + meta.size, 0);
  }

  /**
   * Clear all cached models
   */
  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[ModelManager] Cache cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Compute SHA-256 hash of a blob
   */
  async computeHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify a cached model's integrity
   */
  async verify(modelId: string, expectedHash: string): Promise<boolean> {
    const entry = await this.get(modelId);
    if (!entry) return false;

    const actualHash = await this.computeHash(entry.blob);
    return actualHash === expectedHash;
  }
}

// Singleton export
export const modelManager = new ModelManager();
