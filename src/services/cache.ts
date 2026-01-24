import { BlogPost, AuthorProfile } from '../types/config';
import { CachedPost, CachedProfile, CacheQueryOptions, CacheStats, CacheConfig, DEFAULT_CACHE_CONFIG } from '../types/cache';

const DB_NAME = 'nostr-blog-cache';
const DB_VERSION = 1;
const POSTS_STORE = 'posts';
const PROFILES_STORE = 'profiles';

export class CacheService {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private config: CacheConfig;

  constructor(dbName: string = DB_NAME, config: Partial<CacheConfig> = {}) {
    this.dbName = dbName;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  async init(): Promise<boolean> {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined' || !window.indexedDB) {
      console.warn('[CacheService] IndexedDB not available, caching disabled');
      return false;
    }

    // Detect private browsing mode (Safari/iOS)
    try {
      const testDb = indexedDB.open('__idb_test__');
      await new Promise<void>((resolve, reject) => {
        testDb.onerror = () => reject(testDb.error);
        testDb.onsuccess = () => {
          testDb.result.close();
          indexedDB.deleteDatabase('__idb_test__');
          resolve();
        };
      });
    } catch (err) {
      console.warn('[CacheService] IndexedDB blocked (private browsing?), caching disabled');
      return false;
    }

    try {
      this.db = await this.openDB();

      // Verify we can actually write (catches quota issues on mobile)
      await this.verifyWriteAccess();

      // Run cleanup in background
      this.cleanupExpired().catch(err =>
        console.warn('[CacheService] Cleanup failed:', err)
      );
      console.log('[CacheService] Initialized successfully');
      return true;
    } catch (err) {
      console.error('[CacheService] Failed to initialize:', err);
      // Try to delete and recreate on corruption
      try {
        await this.deleteDatabase();
        this.db = await this.openDB();
        return true;
      } catch (retryErr) {
        console.error('[CacheService] Recovery failed:', retryErr);
        return false;
      }
    }
  }

  private verifyWriteAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const tx = this.db.transaction(POSTS_STORE, 'readwrite');
        const store = tx.objectStore(POSTS_STORE);

        // Try to write and immediately delete a test record
        const testKey = '__write_test__';
        const putRequest = store.put({ cacheKey: testKey, _test: true });

        putRequest.onsuccess = () => {
          store.delete(testKey);
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted - possible quota exceeded'));
      } catch (err) {
        reject(err);
      }
    });
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase): void {
    // Posts store
    if (!db.objectStoreNames.contains(POSTS_STORE)) {
      const postsStore = db.createObjectStore(POSTS_STORE, { keyPath: 'cacheKey' });
      postsStore.createIndex('id', 'id', { unique: false });
      postsStore.createIndex('pubkey', 'pubkey', { unique: false });
      postsStore.createIndex('kind', 'kind', { unique: false });
      postsStore.createIndex('created_at', 'created_at', { unique: false });
      postsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      postsStore.createIndex('pubkey_kind', ['pubkey', 'kind'], { unique: false });
    }

    // Profiles store
    if (!db.objectStoreNames.contains(PROFILES_STORE)) {
      const profilesStore = db.createObjectStore(PROFILES_STORE, { keyPath: 'pubkey' });
      profilesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
    }
  }

  private deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async clear(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction([POSTS_STORE, PROFILES_STORE], 'readwrite');
    tx.objectStore(POSTS_STORE).clear();
    tx.objectStore(PROFILES_STORE).clear();
    await this.completeTransaction(tx);
  }

  private completeTransaction(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private getCacheKey(post: BlogPost): string {
    if (post.kind === 30023) {
      const dTag = post.tags?.find(([key]) => key === 'd')?.[1] || '';
      return `${post.pubkey}:${dTag}`;
    }
    return post.id;
  }

  private getDTag(post: BlogPost): string | undefined {
    if (post.kind === 30023) {
      return post.tags?.find(([key]) => key === 'd')?.[1];
    }
    return undefined;
  }

  async getPosts(pubkeys: string[], options: CacheQueryOptions = {}): Promise<CachedPost[]> {
    if (!this.db) return [];

    const now = Math.floor(Date.now() / 1000);
    const maxAge = now - this.config.ttl;

    // Query each pubkey using the index for faster lookups
    const allPosts: CachedPost[] = [];

    for (const pubkey of pubkeys) {
      const posts = await this.getPostsByPubkey(pubkey, maxAge, options);
      allPosts.push(...posts);
    }

    // Sort by published_at/created_at descending
    allPosts.sort((a, b) => {
      const aTime = a.published_at || a.created_at;
      const bTime = b.published_at || b.created_at;
      return bTime - aTime;
    });

    // Apply limit
    if (options.limit && allPosts.length > options.limit) {
      return allPosts.slice(0, options.limit);
    }
    return allPosts;
  }

  private getPostsByPubkey(pubkey: string, maxAge: number, options: CacheQueryOptions): Promise<CachedPost[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(POSTS_STORE, 'readonly');
      const store = tx.objectStore(POSTS_STORE);
      const index = store.index('pubkey');
      const posts: CachedPost[] = [];

      // Use the pubkey index to query only relevant posts
      const request = index.openCursor(IDBKeyRange.only(pubkey));

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const post = cursor.value as CachedPost;

          // Filter by TTL
          if (post.cachedAt < maxAge) {
            cursor.continue();
            return;
          }

          // Filter by kind
          if (options.kinds && options.kinds.length > 0 && !options.kinds.includes(post.kind)) {
            cursor.continue();
            return;
          }

          // Filter by date range
          const postTime = post.published_at || post.created_at;
          if (options.since && postTime < options.since) {
            cursor.continue();
            return;
          }
          if (options.until && postTime > options.until) {
            cursor.continue();
            return;
          }

          posts.push(post);
          cursor.continue();
        } else {
          resolve(posts);
        }
      };
    });
  }

  async getPostById(id: string): Promise<CachedPost | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(POSTS_STORE, 'readonly');
      const store = tx.objectStore(POSTS_STORE);
      const index = store.index('id');
      const request = index.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const post = request.result as CachedPost | undefined;
        if (post && this.isPostFresh(post)) {
          resolve(post);
        } else {
          resolve(null);
        }
      };
    });
  }

  async getPostByNaddr(pubkey: string, dTag: string): Promise<CachedPost | null> {
    if (!this.db) return null;

    const cacheKey = `${pubkey}:${dTag}`;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(POSTS_STORE, 'readonly');
      const store = tx.objectStore(POSTS_STORE);
      const request = store.get(cacheKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const post = request.result as CachedPost | undefined;
        if (post && this.isPostFresh(post)) {
          resolve(post);
        } else {
          resolve(null);
        }
      };
    });
  }

  private isPostFresh(post: CachedPost): boolean {
    const now = Math.floor(Date.now() / 1000);
    return post.cachedAt > now - this.config.ttl;
  }

  async savePosts(posts: BlogPost[]): Promise<void> {
    if (!this.db || posts.length === 0) return;

    const tx = this.db.transaction(POSTS_STORE, 'readwrite');
    const store = tx.objectStore(POSTS_STORE);
    const now = Math.floor(Date.now() / 1000);

    for (const post of posts) {
      const cacheKey = this.getCacheKey(post);

      // For replaceable events (kind 30023), check if we have a newer version
      if (post.kind === 30023) {
        const existing = await this.getFromStore<CachedPost>(store, cacheKey);
        if (existing && existing.created_at >= post.created_at) {
          // Existing is newer or same, skip
          continue;
        }
      }

      const cachedPost: CachedPost = {
        ...post,
        cacheKey,
        cachedAt: now,
        dTag: this.getDTag(post),
      };

      store.put(cachedPost);
    }

    await this.completeTransaction(tx);
  }

  private getFromStore<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T | undefined);
    });
  }

  async getProfiles(pubkeys: string[]): Promise<Map<string, AuthorProfile>> {
    if (!this.db) return new Map();

    const now = Math.floor(Date.now() / 1000);
    const maxAge = now - this.config.profileTtl;
    const profiles = new Map<string, AuthorProfile>();

    const tx = this.db.transaction(PROFILES_STORE, 'readonly');
    const store = tx.objectStore(PROFILES_STORE);

    for (const pubkey of pubkeys) {
      const cached = await this.getFromStore<CachedProfile>(store, pubkey);
      if (cached && cached.cachedAt > maxAge) {
        // Remove cache metadata before returning
        const { pubkey: _pk, cachedAt: _ca, ...profile } = cached;
        profiles.set(pubkey, profile);
      }
    }

    return profiles;
  }

  async saveProfiles(profiles: Map<string, AuthorProfile>): Promise<void> {
    if (!this.db || profiles.size === 0) return;

    const tx = this.db.transaction(PROFILES_STORE, 'readwrite');
    const store = tx.objectStore(PROFILES_STORE);
    const now = Math.floor(Date.now() / 1000);

    for (const [pubkey, profile] of profiles) {
      const cachedProfile: CachedProfile = {
        ...profile,
        pubkey,
        cachedAt: now,
      };
      store.put(cachedProfile);
    }

    await this.completeTransaction(tx);
  }

  private async cleanupExpired(): Promise<void> {
    if (!this.db) return;

    const now = Math.floor(Date.now() / 1000);
    const postMaxAge = now - this.config.ttl;
    const profileMaxAge = now - this.config.profileTtl;

    // Cleanup expired posts
    const postTx = this.db.transaction(POSTS_STORE, 'readwrite');
    const postStore = postTx.objectStore(POSTS_STORE);
    const postIndex = postStore.index('cachedAt');
    const postRange = IDBKeyRange.upperBound(postMaxAge);

    await this.deleteByRange(postIndex, postRange);

    // Cleanup expired profiles
    const profileTx = this.db.transaction(PROFILES_STORE, 'readwrite');
    const profileStore = profileTx.objectStore(PROFILES_STORE);
    const profileIndex = profileStore.index('cachedAt');
    const profileRange = IDBKeyRange.upperBound(profileMaxAge);

    await this.deleteByRange(profileIndex, profileRange);
  }

  private deleteByRange(index: IDBIndex, range: IDBKeyRange): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async getCacheStats(): Promise<CacheStats> {
    if (!this.db) {
      return { postCount: 0, profileCount: 0, oldestPost: null, newestPost: null };
    }

    const tx = this.db.transaction([POSTS_STORE, PROFILES_STORE], 'readonly');
    const postStore = tx.objectStore(POSTS_STORE);
    const profileStore = tx.objectStore(PROFILES_STORE);

    const [postCount, profileCount] = await Promise.all([
      this.countStore(postStore),
      this.countStore(profileStore),
    ]);

    let oldestPost: number | null = null;
    let newestPost: number | null = null;

    if (postCount > 0) {
      const cachedAtIndex = postStore.index('cachedAt');

      const oldestRequest = cachedAtIndex.openCursor(null, 'next');
      oldestPost = await new Promise((resolve) => {
        oldestRequest.onsuccess = () => {
          const cursor = oldestRequest.result;
          resolve(cursor ? cursor.value.cachedAt : null);
        };
      });

      const newestRequest = cachedAtIndex.openCursor(null, 'prev');
      newestPost = await new Promise((resolve) => {
        newestRequest.onsuccess = () => {
          const cursor = newestRequest.result;
          resolve(cursor ? cursor.value.cachedAt : null);
        };
      });
    }

    return { postCount, profileCount, oldestPost, newestPost };
  }

  private countStore(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}
