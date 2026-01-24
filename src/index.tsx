import { render } from 'solid-js/web';
import { App } from './App';
import { NostrBlogConfig } from './types/config';
import './styles/index.css';

// Auto-initialize from script tag
function init() {
  // Find the script tag with our attributes
  const scriptTag = document.querySelector('script[data-pubkey]') as HTMLScriptElement;
  if (!scriptTag) {
    console.error('NostrBlog: Could not find script tag with data-pubkey attribute');
    return;
  }

  // Read configuration from data attributes
  const pubkeyData = scriptTag.dataset.pubkey || '';

  // Parse pubkey - can be a single string or JSON array
  let pubkey: string | string[];
  try {
    // Try to parse as JSON array first
    pubkey = JSON.parse(pubkeyData);
  } catch {
    // If not JSON, treat as single pubkey string
    pubkey = pubkeyData;
  }

  // Parse date range if provided
  let dateRange: { since?: number; until?: number } | undefined;
  if (scriptTag.dataset.dateSince || scriptTag.dataset.dateUntil) {
    dateRange = {};
    if (scriptTag.dataset.dateSince) {
      dateRange.since = parseInt(scriptTag.dataset.dateSince, 10);
    }
    if (scriptTag.dataset.dateUntil) {
      dateRange.until = parseInt(scriptTag.dataset.dateUntil, 10);
    }
  }

  const config: NostrBlogConfig = {
    pubkey,
    relays: JSON.parse(scriptTag.dataset.relays || '["wss://relay.damus.io", "wss://nos.lol"]'),
    navSelector: scriptTag.dataset.navSelector || '',
    contentSelector: scriptTag.dataset.contentSelector || '',
    layout: (scriptTag.dataset.layout as 'list' | 'grid' | 'compact') || 'list',
    theme: (scriptTag.dataset.theme as 'light' | 'dark' | 'auto') || 'light',
    postsPerPage: parseInt(scriptTag.dataset.postsPerPage || '10', 10),
    showImages: scriptTag.dataset.showImages !== 'false',
    dateFormat: (scriptTag.dataset.dateFormat as 'short' | 'long' | 'relative') || 'short',
    contentType: (scriptTag.dataset.contentType as 'all' | 'long-form' | 'short-form') || 'all',
    dateRange,
    showControls: scriptTag.dataset.showControls === 'true',
    pagination: (scriptTag.dataset.pagination as 'infinite-scroll' | 'load-more' | 'none') || 'load-more',
    showSummary: scriptTag.dataset.showSummary !== 'false',
    showRelatedPosts: scriptTag.dataset.showRelatedPosts !== 'false',
    relatedPostsCount: parseInt(scriptTag.dataset.relatedPostsCount || '3', 10),
    markedBreaks: scriptTag.dataset.markedBreaks === 'true',
  };

  // Validate required config
  if (!config.pubkey || (Array.isArray(config.pubkey) && config.pubkey.length === 0)) {
    console.error('NostrBlog: pubkey is required');
    return;
  }

  if (!config.contentSelector) {
    console.error('NostrBlog: contentSelector is required');
    return;
  }

  // Find content container
  const contentElement = document.querySelector(config.contentSelector);
  if (!contentElement) {
    console.error(`NostrBlog: Could not find element with selector "${config.contentSelector}"`);
    return;
  }

  // Find navigation container (optional)
  const navElement = config.navSelector ? document.querySelector(config.navSelector) : null;

  // Render main app
  render(() => <App config={config} />, contentElement as HTMLElement);

  // Render navigation if selector provided
  if (navElement) {
    import('./components/Navigation').then(({ Navigation }) => {
      import('./services/nostr').then(({ NostrService }) => {
        import('./services/router').then(({ createRouter }) => {
          const nostrService = new NostrService(config.relays);
          const router = createRouter();

          nostrService.fetchPosts(config.pubkey).then(posts => {
            render(
              () => (
                <Navigation
                  posts={posts}
                  currentPostId={router.route().postId}
                  onNavigate={router.navigateToPost}
                  onHome={router.navigateToList}
                />
              ),
              navElement as HTMLElement
            );
          });
        });
      });
    });
  }

  console.log('NostrBlog initialized with config:', config);
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for manual initialization
export default { init };
