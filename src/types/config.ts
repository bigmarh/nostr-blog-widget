import { Event } from 'nostr-tools';

export interface NostrBlogConfig {
  pubkey: string | string[]; // Can be single pubkey or array of pubkeys
  relays: string[];
  navSelector: string;
  contentSelector: string;
  layout: 'list' | 'grid' | 'compact';
  theme: 'light' | 'dark' | 'auto';
  postsPerPage: number;
  showImages: boolean;
  dateFormat: 'short' | 'long' | 'relative';
  contentType: 'all' | 'long-form' | 'short-form'; // Filter by content type
  dateRange?: {
    since?: number; // Unix timestamp - posts after this date
    until?: number; // Unix timestamp - posts before this date
  };
  showControls: boolean; // Show/hide control panel
  pagination: 'infinite-scroll' | 'load-more' | 'none'; // Pagination type
  selectedAuthor?: string; // Filter by specific author (when multiple pubkeys)
  showSummary: boolean; // Show/hide summaries in grid and list views
}

export interface BlogPost extends Event {
  title?: string;
  summary?: string;
  image?: string;
  published_at?: number;
  content?: string;
  authorName?: string;
  authorAvatar?: string;
  authorNip05?: string;
  naddr?: string; // NIP-19 encoded address for kind 30023 posts
}

export interface AuthorProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  nip05?: string;
  about?: string;
}

export interface RouterState {
  view: 'list' | 'detail';
  postId?: string;
}
