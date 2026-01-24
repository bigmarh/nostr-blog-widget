import { Component, For } from 'solid-js';
import { BlogPost, NostrBlogConfig } from '../types/config';
import { formatDate } from '../services/date';
import { ContentRenderer } from './ContentRenderer';

interface PostListProps {
  posts: BlogPost[];
  config: NostrBlogConfig;
  onNavigate: (postId: string) => void;
  onFetchPost: (eventId: string) => Promise<BlogPost | null>;
}

export const PostList: Component<PostListProps> = (props) => {
  return (
    <div
      class="nbw-grid nbw-gap-6"
      classList={{
        'nbw-grid-cols-1': props.config.layout === 'list' || props.config.layout === 'compact',
        'nbw-grid-cols-1 md:nbw-grid-cols-2 lg:nbw-grid-cols-3': props.config.layout === 'grid',
      }}
    >
      <For each={props.posts}>
        {(post) => props.config.layout === 'compact' ? (
          <div class="nbw-py-2 nbw-border-b nbw-border-gray-200">
            <div class="nbw-text-gray-500 nbw-text-xs nbw-mb-1">
              {(() => {
                console.log(`[PostList] Rendering date for "${post.title}": published_at=${post.published_at}, created_at=${post.created_at}, using=${post.published_at || post.created_at}`);
                return formatDate(post.published_at || post.created_at, props.config.dateFormat);
              })()}
            </div>
            <a
              href={`#/post/${post.naddr || post.id}`}
              onClick={(e) => {
                e.preventDefault();
                console.log(`[PostList] Clicked post:`, {
                  title: post.title,
                  naddr: post.naddr,
                  id: post.id,
                  published_at: post.published_at,
                  created_at: post.created_at,
                  displayDate: post.published_at || post.created_at
                });
                props.onNavigate(post.naddr || post.id);
              }}
              class="nbw-text-blue-600 hover:nbw-underline nbw-font-medium nbw-no-underline hover:nbw-text-blue-800"
            >
              {post.title}
            </a>
          </div>
        ) : (
          <article
            class="nbw-bg-white nbw-rounded-lg nbw-shadow-md nbw-overflow-hidden nbw-cursor-pointer"
            onClick={() => props.onNavigate(post.naddr || post.id)}
          >
            {props.config.showImages && post.image && (
              <img
                src={post.image}
                alt={post.title}
                class="nbw-w-full nbw-h-48 nbw-object-cover"
              />
            )}
            <div class="nbw-p-6">
              <h2 class="nbw-text-2xl nbw-font-bold nbw-mb-2 nbw-text-gray-900 hover:nbw-underline">
                {post.title}
              </h2>
              <div class="nbw-flex nbw-items-center nbw-gap-3 nbw-mb-3">
                {post.authorAvatar && (
                  <img
                    src={post.authorAvatar}
                    alt={post.authorName}
                    class="nbw-w-8 nbw-h-8 nbw-rounded-full nbw-object-cover"
                  />
                )}
                <div class="nbw-flex-1">
                  <p class="nbw-text-gray-900 nbw-text-sm nbw-font-medium">
                    {post.authorName}
                  </p>
                  <p class="nbw-text-gray-600 nbw-text-xs">
                    {formatDate(post.published_at || post.created_at, props.config.dateFormat)}
                  </p>
                </div>
              </div>
              {/* For kind 1 (short notes), show full content with media and embeds. For kind 30023, show summary */}
              {(post.kind === 1 || post.kind === '1') ? (
                <ContentRenderer
                  content={post.content || ''}
                  onFetchPost={props.onFetchPost}
                  useMarkdown={false}
                  markedBreaks={props.config.markedBreaks}
                />
              ) : (
                <>
                  {props.config.showSummary && post.summary && (
                    <p class="nbw-text-gray-700 nbw-mb-4">
                      {post.summary}
                    </p>
                  )}
                  <div class="nbw-flex nbw-justify-end">
                    <a
                      href={`#/post/${post.naddr || post.id}`}
                      class="nbw-read-more nbw-text-black nbw-font-medium nbw-no-underline hover:nbw-underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        props.onNavigate(post.naddr || post.id);
                      }}
                    >
                      Read more →
                    </a>
                  </div>
                </>
              )}
            </div>
          </article>
        )}
      </For>
    </div>
  );
};
