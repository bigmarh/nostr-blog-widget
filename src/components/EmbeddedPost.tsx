import { Component, Show, createSignal, onMount } from 'solid-js';
import { BlogPost } from '../types/config';

interface EmbeddedPostProps {
  eventId: string; // naddr, nevent, or note
  onFetch: (eventId: string) => Promise<BlogPost | null>;
}

export const EmbeddedPost: Component<EmbeddedPostProps> = (props) => {
  const [post, setPost] = createSignal<BlogPost | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(false);

  onMount(async () => {
    try {
      setLoading(true);
      const fetchedPost = await props.onFetch(props.eventId);
      setPost(fetchedPost);
      setError(!fetchedPost);
    } catch (err) {
      console.error('Failed to fetch embedded post:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div class="nbw-embedded-post nbw-my-4 nbw-border nbw-border-gray-300 nbw-rounded-lg nbw-overflow-hidden nbw-bg-gray-50 hover:nbw-bg-gray-100 nbw-transition-colors">
      <Show when={loading()}>
        <div class="nbw-p-4 nbw-text-gray-500 nbw-text-sm">
          Loading post...
        </div>
      </Show>

      <Show when={error() && !loading()}>
        <div class="nbw-p-4 nbw-text-red-500 nbw-text-sm">
          Failed to load embedded post
        </div>
      </Show>

      <Show when={post() && !loading()}>
        <a
          href={`#/post/${props.eventId}`}
          class="nbw-block nbw-no-underline hover:nbw-no-underline"
        >
          <div class="nbw-embedded-post-content nbw-p-4">
            <Show when={post()!.image}>
              <img
                src={post()!.image}
                alt={post()!.title}
                class="nbw-w-full nbw-h-32 nbw-object-cover nbw-rounded nbw-mb-3"
              />
            </Show>

            <h4 class="nbw-text-lg nbw-font-semibold nbw-text-gray-900 nbw-mb-2 nbw-line-clamp-2">
              {post()!.title || 'Untitled Post'}
            </h4>

            <Show when={post()!.summary}>
              <p class="nbw-text-sm nbw-text-gray-600 nbw-mb-3 nbw-line-clamp-2">
                {post()!.summary}
              </p>
            </Show>

            <div class="nbw-flex nbw-items-center nbw-gap-2 nbw-text-xs nbw-text-gray-500">
              <Show when={post()!.authorAvatar}>
                <img
                  src={post()!.authorAvatar}
                  alt={post()!.authorName}
                  class="nbw-w-5 nbw-h-5 nbw-rounded-full"
                />
              </Show>
              <span class="nbw-font-medium nbw-text-gray-700">
                {post()!.authorName}
              </span>
              <span>•</span>
              <span>
                {formatDate(post()!.published_at || post()!.created_at)}
              </span>
            </div>
          </div>
        </a>
      </Show>
    </div>
  );
};
