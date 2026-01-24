import { BlogPost, AuthorProfile } from './config';

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Cache TTL in seconds
  profileTtl: number; // Profile cache TTL in seconds
  maxPosts: number; // Max posts to cache per pubkey
  backgroundRefresh: boolean; // Refresh in background after showing cache
}

export interface CachedPost extends BlogPost {
  cacheKey: string; // Unique key: event ID for kind 1, pubkey:d-tag for kind 30023
  cachedAt: number; // Unix timestamp when cached
  dTag?: string; // d-tag value for kind 30023 replaceable events
}

export interface CachedProfile extends AuthorProfile {
  pubkey: string;
  cachedAt: number;
}

export interface CacheQueryOptions {
  kinds?: number[];
  limit?: number;
  since?: number;
  until?: number;
}

export interface CacheStats {
  postCount: number;
  profileCount: number;
  oldestPost: number | null;
  newestPost: number | null;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 3600, // 1 hour
  profileTtl: 86400, // 24 hours
  maxPosts: 100,
  backgroundRefresh: true,
};
