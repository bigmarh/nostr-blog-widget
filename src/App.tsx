import { Component, createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { NostrBlogConfig, BlogPost } from './types/config';
import { NostrService } from './services/nostr';
import { CacheService } from './services/cache';
import { DEFAULT_CACHE_CONFIG } from './types/cache';
import { createRouter } from './services/router';
import { PostList } from './components/PostList';
import { PostDetail } from './components/PostDetail';
import { Navigation } from './components/Navigation';
import { Loading } from './components/Loading';
import { ControlPanel } from './components/ControlPanel';

interface AppProps {
  config: NostrBlogConfig;
}

export const App: Component<AppProps> = (props) => {
  const [posts, setPosts] = createSignal<BlogPost[]>([]);
  const [allPosts, setAllPosts] = createSignal<BlogPost[]>([]); // Store all fetched posts
  const [currentPost, setCurrentPost] = createSignal<BlogPost | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false); // Background refresh indicator
  const [error, setError] = createSignal<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = createSignal(true); // Track if more posts might exist

  // Make config reactive so controls can update it
  const [currentConfig, setCurrentConfig] = createSignal<NostrBlogConfig>(props.config);

  const router = createRouter();

  // Initialize cache config
  const cacheConfig = {
    ...DEFAULT_CACHE_CONFIG,
    ...props.config.cache,
    enabled: props.config.cache?.enabled !== false,
    backgroundRefresh: props.config.cache?.backgroundRefresh !== false,
  };

  // Create cache service if enabled
  let cacheService: CacheService | null = null;
  let cacheReady = Promise.resolve();
  if (cacheConfig.enabled) {
    cacheService = new CacheService(undefined, cacheConfig);
    cacheReady = cacheService.init().then(() => {
      console.log('[App] Cache initialized');
    }).catch(err => {
      console.warn('[App] Failed to initialize cache:', err);
    });
  }

  const nostrService = new NostrService(currentConfig().relays, cacheService || undefined, cacheConfig);

  // Fetch posts function with cache support - now with lazy loading
  const fetchPosts = async (loadMore: boolean = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setHasMorePosts(true); // Reset on fresh load
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const config = currentConfig();

      // For lazy loading: fetch just postsPerPage at a time
      const fetchLimit = config.postsPerPage;

      // For "load more", use the oldest post's timestamp as the upper bound
      let dateRange = config.dateRange ? { ...config.dateRange } : {};
      if (loadMore && allPosts().length > 0) {
        const oldestPost = allPosts()[allPosts().length - 1];
        const oldestTime = oldestPost.published_at || oldestPost.created_at;
        // Fetch posts older than the oldest we have (subtract 1 to avoid duplicates)
        dateRange.until = oldestTime - 1;
      }

      // Use cache-aware fetch
      const { posts: fetchedPosts, fromCache } = await nostrService.fetchPostsWithCache(
        config.pubkey,
        fetchLimit,
        config.contentType,
        dateRange.since || dateRange.until ? dateRange : undefined
      );

      // Filter by selected author if one is chosen
      const filteredPosts = config.selectedAuthor
        ? fetchedPosts.filter(post => post.pubkey === config.selectedAuthor)
        : fetchedPosts;

      // Check if we got fewer posts than requested - means no more available
      if (filteredPosts.length < fetchLimit) {
        setHasMorePosts(false);
      }

      if (loadMore) {
        // Append to existing posts, avoiding duplicates
        const existingIds = new Set(allPosts().map(p => p.id));
        const newPosts = filteredPosts.filter(p => !existingIds.has(p.id));
        const combined = [...allPosts(), ...newPosts];
        setAllPosts(combined);
        setPosts(combined);
      } else {
        // Fresh load
        setAllPosts(filteredPosts);
        setPosts(filteredPosts);
      }

      setLoading(false);
      setLoadingMore(false);

      // Background refresh only on initial load from cache (not on load more)
      if (!loadMore && fromCache && cacheConfig.backgroundRefresh) {
        setIsRefreshing(true);
        nostrService.refreshInBackground(
          config.pubkey,
          fetchLimit,
          config.contentType,
          config.dateRange,
          (freshPosts) => {
            // Update posts if we got fresh data
            if (freshPosts.length > 0) {
              const freshFiltered = config.selectedAuthor
                ? freshPosts.filter(post => post.pubkey === config.selectedAuthor)
                : freshPosts;
              setAllPosts(freshFiltered);
              setPosts(freshFiltered);
            }
            setIsRefreshing(false);
          }
        );
      }
    } catch (err) {
      setError('Failed to load posts. Please try again later.');
      setLoading(false);
      setLoadingMore(false);
      console.error('Error fetching posts:', err);
    }
  };

  // Load more posts from network
  const loadMorePosts = () => {
    fetchPosts(true);
  };

  // Load posts on mount and when config changes - but only for list view
  createEffect(() => {
    // Track currentConfig and route reactively
    currentConfig();
    const currentRoute = router.route();

    // Skip feed fetch if we're on detail view - we'll fetch just the post instead
    if (currentRoute.view === 'detail') {
      return;
    }

    // Wait for cache to be ready before fetching
    cacheReady.then(() => fetchPosts());
  });

  // Handle route changes for detail view
  createEffect(async () => {
    const currentRoute = router.route();

    if (currentRoute.view === 'detail' && currentRoute.postId) {
      // Try to find post in memory first (from previously loaded posts)
      const memoryPost = posts().find(p => p.id === currentRoute.postId || p.naddr === currentRoute.postId);
      if (memoryPost) {
        setCurrentPost(memoryPost);
        setLoading(false);
        return;
      }

      // Fetch individual post (will check cache first, then network)
      try {
        setLoading(true);
        await cacheReady; // Ensure cache is ready before fetching
        const fetchedPost = await nostrService.fetchPostById(currentRoute.postId);
        setCurrentPost(fetchedPost);
        setLoading(false);
      } catch (err) {
        setError('Failed to load post.');
        setLoading(false);
        console.error('Error fetching post:', err);
      }
    } else {
      setCurrentPost(null);
    }
  });

  onCleanup(() => {
    nostrService.close();
    cacheService?.close();
  });

  // Control panel handlers
  const handleLayoutChange = (layout: 'list' | 'grid') => {
    setCurrentConfig({ ...currentConfig(), layout });
  };

  const handleContentTypeChange = (contentType: 'all' | 'long-form' | 'short-form') => {
    setCurrentConfig({ ...currentConfig(), contentType });
  };

  const handleDateRangeChange = (range: 'all' | 'week' | 'month' | 'year') => {
    const now = Math.floor(Date.now() / 1000);
    let dateRange: { since?: number; until?: number } | undefined;

    switch (range) {
      case 'week':
        dateRange = { since: now - (7 * 24 * 60 * 60) };
        break;
      case 'month':
        dateRange = { since: now - (30 * 24 * 60 * 60) };
        break;
      case 'year':
        dateRange = { since: now - (365 * 24 * 60 * 60) };
        break;
      default:
        dateRange = undefined;
    }

    setCurrentConfig({ ...currentConfig(), dateRange });
  };

  const handleAuthorChange = (authorPubkey: string | undefined) => {
    setCurrentConfig({ ...currentConfig(), selectedAuthor: authorPubkey });
  };

  return (
    <div class="nbw-font-sans nbw-antialiased" data-theme={currentConfig().theme}>
      {/* Background refresh indicator - only show on list view, not individual posts */}
      <Show when={isRefreshing() && router.route().view === 'list'}>
        <div class="nbw-fixed nbw-top-4 nbw-right-4 nbw-bg-blue-100 nbw-text-blue-800 nbw-px-3 nbw-py-1 nbw-rounded-full nbw-text-sm nbw-flex nbw-items-center nbw-gap-2 nbw-shadow-md nbw-z-50">
          <svg class="nbw-animate-spin nbw-h-4 nbw-w-4" fill="none" viewBox="0 0 24 24">
            <circle class="nbw-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="nbw-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Checking for updates...
        </div>
      </Show>

      <Show when={error()}>
        <div class="nbw-bg-red-100 nbw-border nbw-border-red-400 nbw-text-red-700 nbw-px-4 nbw-py-3 nbw-rounded nbw-mb-4">
          {error()}
        </div>
      </Show>

      {/* Control Panel */}
      <Show when={currentConfig().showControls && router.route().view === 'list'}>
        <ControlPanel
          config={currentConfig()}
          posts={allPosts()}
          onLayoutChange={handleLayoutChange}
          onContentTypeChange={handleContentTypeChange}
          onDateRangeChange={handleDateRangeChange}
          onAuthorChange={handleAuthorChange}
          onRefresh={fetchPosts}
        />
      </Show>

      <Show when={loading()}>
        <Loading />
      </Show>

      <Show when={!loading()}>
        <Show
          when={router.route().view === 'detail' && currentPost()}
          fallback={
            <>
              <PostList
                posts={posts()}
                config={currentConfig()}
                onNavigate={router.navigateToPost}
                onFetchPost={(eventId) => nostrService.fetchPostById(eventId)}
              />

              {/* Load More Button */}
              <Show when={hasMorePosts() && currentConfig().pagination === 'load-more'}>
                <div class="nbw-load-more-container nbw-flex nbw-justify-center nbw-mt-8">
                  <button
                    class="nbw-load-more-btn nbw-px-6 nbw-py-3 nbw-bg-blue-600 nbw-text-white nbw-font-medium nbw-rounded-lg hover:nbw-bg-blue-700 nbw-transition-all nbw-shadow-md hover:nbw-shadow-lg disabled:nbw-opacity-50 disabled:nbw-cursor-not-allowed"
                    onClick={loadMorePosts}
                    disabled={loadingMore()}
                  >
                    <Show when={loadingMore()} fallback="Load More Posts">
                      <svg class="nbw-animate-spin nbw-h-5 nbw-w-5 nbw-inline nbw-mr-2" fill="none" viewBox="0 0 24 24">
                        <circle class="nbw-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="nbw-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </Show>
                  </button>
                </div>
              </Show>
            </>
          }
        >
          {(post) => (
            <PostDetail
              post={post()}
              config={currentConfig()}
              allPosts={allPosts()}
              onBack={router.navigateToList}
              onFetchPost={(eventId) => nostrService.fetchPostById(eventId)}
              onNavigate={router.navigateToPost}
            />
          )}
        </Show>
      </Show>
    </div>
  );
};
