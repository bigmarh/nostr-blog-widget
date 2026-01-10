import { Component, For, Show, onMount } from 'solid-js';
import { BlogPost, NostrBlogConfig } from '../types/config';
import { formatDate } from '../services/date';

const STORAGE_KEY = 'nbw-read-posts';
const MAX_READ_HISTORY = 50;

const getReadPosts = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const markPostAsRead = (postId: string): void => {
  try {
    const readPosts = getReadPosts();
    if (!readPosts.includes(postId)) {
      readPosts.unshift(postId);
      // Keep only the most recent entries
      const trimmed = readPosts.slice(0, MAX_READ_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // localStorage unavailable, ignore
  }
};

interface RelatedPostsProps {
  currentPost: BlogPost;
  allPosts: BlogPost[];
  config: NostrBlogConfig;
  onNavigate: (postId: string) => void;
}

export const RelatedPosts: Component<RelatedPostsProps> = (props) => {
  // Mark current post as read when component mounts
  onMount(() => {
    markPostAsRead(props.currentPost.id);
  });

  const getRelatedPosts = (): BlogPost[] => {
    const { currentPost, allPosts, config } = props;
    const readPosts = getReadPosts();

    // Filter out the current post and respect contentType config
    let otherPosts = allPosts.filter(p => p.id !== currentPost.id);

    // Filter by content type from config
    if (config.contentType === 'long-form') {
      otherPosts = otherPosts.filter(p => p.kind === 30023);
    } else if (config.contentType === 'short-form') {
      otherPosts = otherPosts.filter(p => p.kind === 1);
    }

    if (otherPosts.length === 0) return [];

    // Separate unread and read posts
    const unreadPosts = otherPosts.filter(p => !readPosts.includes(p.id));
    const readPostsList = otherPosts.filter(p => readPosts.includes(p.id));

    // Score posts - prefer same author and recent posts
    const scorePost = (post: BlogPost): number => {
      let score = 0;

      // Same author gets a boost
      if (post.pubkey === currentPost.pubkey) {
        score += 10;
      }

      // Same content type (kind) gets a boost
      if (post.kind === currentPost.kind) {
        score += 5;
      }

      // More recent posts get a small boost (normalized to 0-3)
      const postTime = post.published_at || post.created_at;
      const maxTime = Math.max(...otherPosts.map(p => p.published_at || p.created_at));
      const minTime = Math.min(...otherPosts.map(p => p.published_at || p.created_at));
      const timeRange = maxTime - minTime || 1;
      score += ((postTime - minTime) / timeRange) * 3;

      return score;
    };

    // Score unread posts and add randomization for variety
    const scoredUnread = unreadPosts
      .map(post => ({
        post,
        score: scorePost(post) + Math.random() * 5 // Add randomness for variety
      }))
      .sort((a, b) => b.score - a.score);

    // If we have enough unread posts, use only those
    if (scoredUnread.length >= config.relatedPostsCount) {
      return scoredUnread.slice(0, config.relatedPostsCount).map(s => s.post);
    }

    // Otherwise, fill in with read posts (sorted by score with randomness)
    const scoredRead = readPostsList
      .map(post => ({
        post,
        score: scorePost(post) + Math.random() * 5
      }))
      .sort((a, b) => b.score - a.score);

    const needed = config.relatedPostsCount - scoredUnread.length;
    const combined = [
      ...scoredUnread.map(s => s.post),
      ...scoredRead.slice(0, needed).map(s => s.post)
    ];

    return combined;
  };

  const relatedPosts = () => getRelatedPosts();

  return (
    <Show when={relatedPosts().length > 0}>
      <div class="nbw-related-posts nbw-mt-12 nbw-pt-8 nbw-border-t nbw-border-gray-200">
        <h2 class="nbw-text-2xl nbw-font-bold nbw-mb-6 nbw-text-gray-900">
          You may also like
        </h2>

        <div class="nbw-grid nbw-grid-cols-1 md:nbw-grid-cols-3 nbw-gap-6">
          <For each={relatedPosts()}>
            {(post) => (
              <article
                class="nbw-related-post nbw-bg-gray-50 nbw-rounded-lg nbw-overflow-hidden nbw-cursor-pointer nbw-transition-all hover:nbw-shadow-md hover:nbw-bg-gray-100"
                onClick={() => props.onNavigate(post.naddr || post.id)}
              >
                <Show when={props.config.showImages && post.image}>
                  <img
                    src={post.image}
                    alt={post.title}
                    class="nbw-w-full nbw-h-32 nbw-object-cover"
                  />
                </Show>

                <div class="nbw-p-4">
                  <h3 class="nbw-font-semibold nbw-text-gray-900 nbw-mb-2 nbw-line-clamp-2">
                    {post.title || 'Untitled'}
                  </h3>

                  <div class="nbw-flex nbw-items-center nbw-gap-2 nbw-text-sm nbw-text-gray-600">
                    <Show when={post.authorAvatar}>
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        class="nbw-w-5 nbw-h-5 nbw-rounded-full nbw-object-cover"
                      />
                    </Show>
                    <span>{post.authorName}</span>
                    <span class="nbw-text-gray-400">·</span>
                    <span>
                      {formatDate(
                        post.published_at || post.created_at,
                        props.config.dateFormat
                      )}
                    </span>
                  </div>
                </div>
              </article>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
};
