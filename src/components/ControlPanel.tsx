import { Component, Show, For, createMemo } from 'solid-js';
import { NostrBlogConfig, BlogPost } from '../types/config';

interface ControlPanelProps {
  config: NostrBlogConfig;
  posts: BlogPost[];
  onLayoutChange: (layout: 'list' | 'grid' | 'compact') => void;
  onContentTypeChange: (type: 'all' | 'long-form' | 'short-form') => void;
  onDateRangeChange: (range: 'all' | 'week' | 'month' | 'year') => void;
  onAuthorChange: (authorPubkey: string) => void;
  onRefresh: () => void;
}

export const ControlPanel: Component<ControlPanelProps> = (props) => {
  // Get unique authors from all posts (not filtered posts)
  // This ensures the author dropdown doesn't disappear when filtering
  const uniqueAuthors = createMemo(() => {
    const authorMap = new Map<string, { pubkey: string; name: string; avatar?: string }>();

    props.posts.forEach(post => {
      if (!authorMap.has(post.pubkey)) {
        authorMap.set(post.pubkey, {
          pubkey: post.pubkey,
          name: post.authorName || post.pubkey.substring(0, 8) + '...',
          avatar: post.authorAvatar
        });
      }
    });

    return Array.from(authorMap.values());
  });

  // Check if we have multiple authors
  const hasMultipleAuthors = createMemo(() => uniqueAuthors().length > 1);

  // Keep author select in sync via a single derived value
  const selectedAuthorValue = createMemo(() => props.config.selectedAuthor ?? '');

  return (
    <div class="nbw-control-panel nbw-bg-white nbw-border nbw-border-gray-200 nbw-rounded-lg nbw-shadow-sm nbw-mb-6 nbw-p-4">
      <div class="nbw-control-panel-inner nbw-flex nbw-flex-wrap nbw-items-center nbw-gap-3 md:nbw-gap-4">

        {/* Layout Toggle */}
        <div class="nbw-control-group nbw-layout-control nbw-flex nbw-flex-col nbw-gap-1">
          <div class="nbw-button-group nbw-flex nbw-rounded-md nbw-shadow-sm">
            <button
              class="nbw-layout-btn nbw-layout-btn-list nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-rounded-l-md nbw-transition-all"
              classList={{
                'nbw-active nbw-bg-blue-600 nbw-text-white nbw-border-blue-600': props.config.layout === 'list',
                'nbw-bg-white nbw-text-gray-700 nbw-border-gray-300 hover:nbw-bg-gray-50': props.config.layout !== 'list'
              }}
              onClick={() => props.onLayoutChange('list')}
              title="List View"
            >
              <svg class="nbw-icon nbw-w-4 nbw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              class="nbw-layout-btn nbw-layout-btn-grid nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-border-l-0 nbw-transition-all"
              classList={{
                'nbw-active nbw-bg-blue-600 nbw-text-white nbw-border-blue-600': props.config.layout === 'grid',
                'nbw-bg-white nbw-text-gray-700 nbw-border-gray-300 hover:nbw-bg-gray-50': props.config.layout !== 'grid'
              }}
              onClick={() => props.onLayoutChange('grid')}
              title="Grid View"
            >
              <svg class="nbw-icon nbw-w-4 nbw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
            <button
              class="nbw-layout-btn nbw-layout-btn-compact nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-border-l-0 nbw-rounded-r-md nbw-transition-all"
              classList={{
                'nbw-active nbw-bg-blue-600 nbw-text-white nbw-border-blue-600': props.config.layout === 'compact',
                'nbw-bg-white nbw-text-gray-700 nbw-border-gray-300 hover:nbw-bg-gray-50': props.config.layout !== 'compact'
              }}
              onClick={() => props.onLayoutChange('compact')}
              title="Compact View"
            >
              <svg class="nbw-icon nbw-w-4 nbw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
          <span class="nbw-control-label nbw-text-xs nbw-text-gray-500 nbw-text-center">View</span>
        </div>

        {/* Divider */}
        <div class="nbw-divider nbw-hidden md:nbw-block nbw-h-8 nbw-w-px nbw-bg-gray-300"></div>

        {/* Content Type Filter */}
        <div class="nbw-control-group nbw-content-type-control nbw-flex nbw-flex-col nbw-gap-1">
          <div class="nbw-button-group nbw-flex nbw-rounded-md nbw-shadow-sm">
            <button
              class="nbw-content-btn nbw-content-btn-all nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-rounded-l-md nbw-transition-all"
              classList={{
                'nbw-active nbw-bg-blue-600 nbw-text-white nbw-border-blue-600': props.config.contentType === 'all',
                'nbw-bg-white nbw-text-gray-700 nbw-border-gray-300 hover:nbw-bg-gray-50': props.config.contentType !== 'all'
              }}
              onClick={() => props.onContentTypeChange('all')}
              title="All Content"
            >
              All
            </button>
            <button
              class="nbw-content-btn nbw-content-btn-articles nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-border-l-0 nbw-transition-all"
              classList={{
                'nbw-active nbw-bg-blue-600 nbw-text-white nbw-border-blue-600': props.config.contentType === 'long-form',
                'nbw-bg-white nbw-text-gray-700 nbw-border-gray-300 hover:nbw-bg-gray-50': props.config.contentType !== 'long-form'
              }}
              onClick={() => props.onContentTypeChange('long-form')}
              title="Articles Only"
            >
              Articles
            </button>
            <button
              class="nbw-content-btn nbw-content-btn-notes nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-border-l-0 nbw-rounded-r-md nbw-transition-all"
              classList={{
                'nbw-active nbw-bg-blue-600 nbw-text-white nbw-border-blue-600': props.config.contentType === 'short-form',
                'nbw-bg-white nbw-text-gray-700 nbw-border-gray-300 hover:nbw-bg-gray-50': props.config.contentType !== 'short-form'
              }}
              onClick={() => props.onContentTypeChange('short-form')}
              title="Notes Only"
            >
              Notes
            </button>
          </div>
          <span class="nbw-control-label nbw-text-xs nbw-text-gray-500 nbw-text-center">Type</span>
        </div>

        {/* Divider */}
        <div class="nbw-divider nbw-hidden md:nbw-block nbw-h-8 nbw-w-px nbw-bg-gray-300"></div>

        {/* Date Range Filter */}
        <div class="nbw-control-group nbw-date-control nbw-flex nbw-flex-col nbw-gap-1">
          <select
            class="nbw-date-select nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-border-gray-300 nbw-rounded-md nbw-bg-white nbw-text-gray-700 hover:nbw-bg-gray-50 nbw-transition-all nbw-cursor-pointer focus:nbw-outline-none focus:nbw-ring-2 focus:nbw-ring-blue-500"
            onChange={(e) => props.onDateRangeChange(e.currentTarget.value as any)}
          >
            <option class="nbw-date-option" value="all">All Time</option>
            <option class="nbw-date-option" value="week">Last Week</option>
            <option class="nbw-date-option" value="month">Last Month</option>
            <option class="nbw-date-option" value="year">Last Year</option>
          </select>
          <span class="nbw-control-label nbw-text-xs nbw-text-gray-500 nbw-text-center">Period</span>
        </div>

        {/* Author Filter - Only show when multiple authors */}
        <Show when={hasMultipleAuthors()}>
          <div class="nbw-divider nbw-hidden md:nbw-block nbw-h-8 nbw-w-px nbw-bg-gray-300"></div>

          <div class="nbw-control-group nbw-author-control nbw-flex nbw-flex-col nbw-gap-1">
            <select
              class="nbw-author-select nbw-px-3 nbw-py-1.5 nbw-text-sm nbw-font-medium nbw-border nbw-border-gray-300 nbw-rounded-md nbw-bg-white nbw-text-gray-700 hover:nbw-bg-gray-50 nbw-transition-all nbw-cursor-pointer focus:nbw-outline-none focus:nbw-ring-2 focus:nbw-ring-blue-500"
              value={selectedAuthorValue()}
              onChange={(e) => props.onAuthorChange(e.currentTarget.value || undefined)}
            >
              <option
                class="nbw-author-option"
                value=""
                selected={selectedAuthorValue() === ''}
              >
                All Authors
              </option>
              <For each={uniqueAuthors()}>
                {(author) => (
                  <option
                    class="nbw-author-option"
                    value={author.pubkey}
                    selected={selectedAuthorValue() === author.pubkey}
                  >
                    {author.name}
                  </option>
                )}
              </For>
            </select>
            <span class="nbw-control-label nbw-text-xs nbw-text-gray-500 nbw-text-center">Author</span>
          </div>
        </Show>

        {/* Spacer to push refresh to the right on larger screens */}
        <div class="nbw-spacer nbw-flex-1 nbw-hidden lg:nbw-block"></div>

        {/* Refresh Button */}
        <div class="nbw-control-group nbw-refresh-control nbw-flex nbw-flex-col nbw-gap-1">
          <button
            class="nbw-refresh-btn nbw-px-4 nbw-py-1.5 nbw-bg-blue-600 nbw-text-white nbw-text-sm nbw-font-medium nbw-rounded-md hover:nbw-bg-blue-700 nbw-transition-all nbw-shadow-sm hover:nbw-shadow focus:nbw-outline-none focus:nbw-ring-2 focus:nbw-ring-blue-500"
            onClick={() => props.onRefresh()}
            title="Refresh Posts"
          >
            <svg class="nbw-icon nbw-w-4 nbw-h-4 nbw-inline nbw-mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="nbw-hidden sm:nbw-inline">Refresh</span>
          </button>
          <span class="nbw-control-label nbw-text-xs nbw-text-gray-500 nbw-text-center nbw-invisible">Action</span>
        </div>
      </div>
    </div>
  );
};
