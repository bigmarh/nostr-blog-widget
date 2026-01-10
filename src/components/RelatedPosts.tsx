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
      <div style={{ 'margin-top': '3rem', 'padding-top': '2rem', 'border-top': '1px solid #e5e7eb' }}>
        <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '1.5rem', color: '#111827' }}>
          Related Posts
        </h2>

        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '1.5rem' }}>
          <For each={relatedPosts()}>
            {(post) => (
              <article
                style={{
                  'background-color': '#f9fafb',
                  'border-radius': '0.5rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => props.onNavigate(post.naddr || post.id)}
              >
                <Show when={props.config.showImages && post.image}>
                  <img
                    src={post.image}
                    alt={post.title}
                    style={{ width: '100%', height: '8rem', 'object-fit': 'cover' }}
                  />
                </Show>

                <div style={{ padding: '1rem' }}>
                  <h3 style={{
                    'font-weight': '600',
                    color: '#111827',
                    'margin-bottom': '0.5rem',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    '-webkit-line-clamp': '2',
                    '-webkit-box-orient': 'vertical'
                  }}>
                    {post.title || 'Untitled'}
                  </h3>

                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'font-size': '0.875rem', color: '#4b5563' }}>
                    <Show when={post.authorAvatar}>
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        style={{ width: '1.25rem', height: '1.25rem', 'border-radius': '9999px', 'object-fit': 'cover' }}
                      />
                    </Show>
                    <span>{post.authorName}</span>
                    <span style={{ color: '#9ca3af' }}>·</span>
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
