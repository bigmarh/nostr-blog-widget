import { Component, createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { NostrBlogConfig, BlogPost } from './types/config';
import { NostrService } from './services/nostr';
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
  const [displayedCount, setDisplayedCount] = createSignal(0); // For pagination
  const [currentPost, setCurrentPost] = createSignal<BlogPost | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Make config reactive so controls can update it
  const [currentConfig, setCurrentConfig] = createSignal<NostrBlogConfig>(props.config);

  const router = createRouter();
  const nostrService = new NostrService(currentConfig().relays);

  // Fetch posts function
  const fetchPosts = async (append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const config = currentConfig();

      // Fetch more posts than postsPerPage for pagination and related posts
      // Always fetch from all configured pubkeys, filter client-side
      // Fetch at least 20 posts to have good variety for "You may also like"
      const fetchLimit = Math.max(config.postsPerPage * 3, 20);
      const fetchedPosts = await nostrService.fetchPosts(
        config.pubkey,
        fetchLimit,
        config.contentType,
        config.dateRange
      );

      setAllPosts(fetchedPosts);

      // Filter by selected author if one is chosen
      const filteredPosts = config.selectedAuthor
        ? fetchedPosts.filter(post => post.pubkey === config.selectedAuthor)
        : fetchedPosts;

      // Set initial display count or append more
      if (!append) {
        setDisplayedCount(Math.min(config.postsPerPage, filteredPosts.length));
      } else {
        setDisplayedCount(Math.min(displayedCount() + config.postsPerPage, filteredPosts.length));
      }

      // Slice displayed posts based on count
      const displayPosts = filteredPosts.slice(0, displayedCount());
      setPosts(displayPosts);

      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      setError('Failed to load posts. Please try again later.');
      setLoading(false);
      setLoadingMore(false);
      console.error('Error fetching posts:', err);
    }
  };

  // Load more posts
  const loadMore = () => {
    const displayed = displayedCount();
    const all = allPosts();
    const config = currentConfig();

    // Filter by selected author if one is chosen
    const filteredPosts = config.selectedAuthor
      ? all.filter(post => post.pubkey === config.selectedAuthor)
      : all;

    const newCount = Math.min(displayed + config.postsPerPage, filteredPosts.length);
    setDisplayedCount(newCount);
    setPosts(filteredPosts.slice(0, newCount));
  };

  // Check if there are more posts to load
  const hasMore = () => {
    const config = currentConfig();
    const all = allPosts();

    // Filter by selected author if one is chosen
    const filteredPosts = config.selectedAuthor
      ? all.filter(post => post.pubkey === config.selectedAuthor)
      : all;

    return displayedCount() < filteredPosts.length;
  };

  // Load posts on mount and when config changes
  createEffect(() => {
    // Track currentConfig reactively
    currentConfig();
    fetchPosts();
  });

  // Handle route changes
  createEffect(async () => {
    const currentRoute = router.route();

    if (currentRoute.view === 'detail' && currentRoute.postId) {
      // Try to find post in cache first
      const cachedPost = posts().find(p => p.id === currentRoute.postId);
      if (cachedPost) {
        setCurrentPost(cachedPost);
      } else {
        // Fetch individual post
        try {
          setLoading(true);
          const fetchedPost = await nostrService.fetchPostById(currentRoute.postId);
          setCurrentPost(fetchedPost);
          setLoading(false);
        } catch (err) {
          setError('Failed to load post.');
          setLoading(false);
          console.error('Error fetching post:', err);
        }
      }
    } else {
      setCurrentPost(null);
    }
  });

  onCleanup(() => {
    nostrService.close();
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
              <Show when={hasMore() && currentConfig().pagination === 'load-more'}>
                <div class="nbw-load-more-container nbw-flex nbw-justify-center nbw-mt-8">
                  <button
                    class="nbw-load-more-btn nbw-px-6 nbw-py-3 nbw-bg-blue-600 nbw-text-white nbw-font-medium nbw-rounded-lg hover:nbw-bg-blue-700 nbw-transition-all nbw-shadow-md hover:nbw-shadow-lg disabled:nbw-opacity-50 disabled:nbw-cursor-not-allowed"
                    onClick={loadMore}
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
