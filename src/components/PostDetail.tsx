import { Component, Show } from 'solid-js';
import { BlogPost, NostrBlogConfig } from '../types/config';
import { formatDate } from '../services/date';
import { ContentRenderer } from './ContentRenderer';

interface PostDetailProps {
  post: BlogPost;
  config: NostrBlogConfig;
  onBack: () => void;
  onFetchPost: (eventId: string) => Promise<BlogPost | null>;
}

export const PostDetail: Component<PostDetailProps> = (props) => {
  console.log(`[PostDetail] Rendering post:`, {
    title: props.post.title,
    naddr: props.post.naddr,
    id: props.post.id,
    published_at: props.post.published_at,
    created_at: props.post.created_at,
    displayDate: props.post.published_at || props.post.created_at
  });

  return (
    <article class="nbw-bg-white nbw-rounded-lg nbw-shadow-lg nbw-overflow-hidden">
      <Show when={props.config.showImages && props.post.image}>
        <img
          src={props.post.image}
          alt={props.post.title}
          class="nbw-w-full nbw-h-64 nbw-object-cover"
        />
      </Show>

      <div class="nbw-p-8">
        <button
          onClick={() => props.onBack()}
          class="nbw-mb-4 nbw-text-blue-600 hover:nbw-text-blue-800 nbw-font-semibold nbw-bg-transparent nbw-border-none nbw-cursor-pointer nbw-p-0"
        >
          ← Back to posts
        </button>

        <h1 class="nbw-text-4xl nbw-font-bold nbw-mb-4 nbw-text-gray-900">
          {props.post.title}
        </h1>

        <div class="nbw-flex nbw-items-center nbw-gap-4 nbw-mb-6 nbw-pb-6 nbw-border-b nbw-border-gray-200">
          <Show when={props.post.authorAvatar}>
            <img
              src={props.post.authorAvatar}
              alt={props.post.authorName}
              class="nbw-w-12 nbw-h-12 nbw-rounded-full nbw-object-cover"
            />
          </Show>
          <div class="nbw-flex-1">
            <p class="nbw-text-gray-900 nbw-font-semibold">
              {props.post.authorName}
            </p>
            <p class="nbw-text-gray-600 nbw-text-sm">
              {formatDate(
                props.post.published_at || props.post.created_at,
                'long',
                { includeTime: false }
              )}
            </p>
          </div>
        </div>

        <div class="nbw-prose nbw-max-w-none nbw-text-gray-800">
          <ContentRenderer
            content={props.post.content || ''}
            onFetchPost={props.onFetchPost}
            useMarkdown={props.post.kind === 30023 || props.post.kind === '30023'}
          />
        </div>
      </div>
    </article>
  );
};
