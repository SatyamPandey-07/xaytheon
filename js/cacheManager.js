/**
 * CacheManager - Client-side caching with expiry
 * Handles localStorage/sessionStorage with automatic expiration
 */

class CacheManager {
    constructor(options = {}) {
        this.storage = options.storage || localStorage; // or sessionStorage
        this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; // 30 minutes in milliseconds
        this.prefix = options.prefix || 'xaytheon_cache_';
        this.enableLogging = options.enableLogging || false;
    }

    /**
     * Generate cache key with prefix
     */
    _getKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Log cache operations (if enabled)
     */
    _log(message, data) {
        if (this.enableLogging) {
            console.log(`[CacheManager] ${message}`, data || '');
        }
    }

    /**
     * Set cache with expiry
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, data, ttl = null) {
        try {
            const cacheKey = this._getKey(key);
            const expiryTime = Date.now() + (ttl || this.defaultTTL);
            
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                expiry: expiryTime
            };

            this.storage.setItem(cacheKey, JSON.stringify(cacheData));
            this._log(`Cache SET: ${key}`, { expiryTime: new Date(expiryTime) });
            return true;
        } catch (error) {
            console.error('[CacheManager] Error setting cache:', error);
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                this._log('Storage quota exceeded, clearing old cache');
                this.clearExpired();
            }
            return false;
        }
    }

    /**
     * Get cached data if not expired
     * @param {string} key - Cache key
     * @returns {any|null} - Cached data or null if expired/not found
     */
    get(key) {
        try {
            const cacheKey = this._getKey(key);
            const cached = this.storage.getItem(cacheKey);

            if (!cached) {
                this._log(`Cache MISS: ${key}`);
                return null;
            }

            const cacheData = JSON.parse(cached);
            const now = Date.now();

            // Check if expired
            if (now > cacheData.expiry) {
                this._log(`Cache EXPIRED: ${key}`);
                this.remove(key);
                return null;
            }

            this._log(`Cache HIT: ${key}`, { age: now - cacheData.timestamp });
            return cacheData.data;
        } catch (error) {
            console.error('[CacheManager] Error getting cache:', error);
            return null;
        }
    }

    /**
     * Remove specific cache entry
     */
    remove(key) {
        const cacheKey = this._getKey(key);
        this.storage.removeItem(cacheKey);
        this._log(`Cache REMOVED: ${key}`);
    }

    /**
     * Clear all expired cache entries
     */
    clearExpired() {
        try {
            const now = Date.now();
            let clearedCount = 0;

            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                
                if (key && key.startsWith(this.prefix)) {
                    const cached = this.storage.getItem(key);
                    if (cached) {
                        const cacheData = JSON.parse(cached);
                        if (now > cacheData.expiry) {
                            this.storage.removeItem(key);
                            clearedCount++;
                        }
                    }
                }
            }

            this._log(`Cleared ${clearedCount} expired cache entries`);
            return clearedCount;
        } catch (error) {
            console.error('[CacheManager] Error clearing expired cache:', error);
            return 0;
        }
    }

    /**
     * Clear all cache entries (for this app)
     */
    clearAll() {
        try {
            const keys = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }

            keys.forEach(key => this.storage.removeItem(key));
            this._log(`Cleared all cache (${keys.length} entries)`);
            return keys.length;
        } catch (error) {
            console.error('[CacheManager] Error clearing all cache:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        try {
            let totalEntries = 0;
            let expiredEntries = 0;
            let totalSize = 0;
            const now = Date.now();

            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                
                if (key && key.startsWith(this.prefix)) {
                    totalEntries++;
                    const cached = this.storage.getItem(key);
                    if (cached) {
                        totalSize += cached.length;
                        const cacheData = JSON.parse(cached);
                        if (now > cacheData.expiry) {
                            expiredEntries++;
                        }
                    }
                }
            }

            return {
                totalEntries,
                expiredEntries,
                activeEntries: totalEntries - expiredEntries,
                totalSizeKB: (totalSize / 1024).toFixed(2)
            };
        } catch (error) {
            console.error('[CacheManager] Error getting stats:', error);
            return null;
        }
    }

    /**
     * Check if cache exists and is valid
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Get remaining TTL for a cache entry
     */
    getTTL(key) {
        try {
            const cacheKey = this._getKey(key);
            const cached = this.storage.getItem(cacheKey);

            if (!cached) return 0;

            const cacheData = JSON.parse(cached);
            const remaining = cacheData.expiry - Date.now();

            return remaining > 0 ? remaining : 0;
        } catch (error) {
            return 0;
        }
    }
}

// Create default instance
const defaultCache = new CacheManager({
    storage: localStorage,
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    enableLogging: true // Set to false in production
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}