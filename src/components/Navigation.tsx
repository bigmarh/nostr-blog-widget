import { Component, For } from 'solid-js';
import { BlogPost } from '../types/config';

interface NavigationProps {
  posts: BlogPost[];
  currentPostId?: string;
  onNavigate: (postId: string) => void;
  onHome: () => void;
}

export const Navigation: Component<NavigationProps> = (props) => {
  return (
    <nav class="nbw-space-y-2">
      <a
        href="#/"
        class="nbw-block nbw-px-4 nbw-py-2 nbw-rounded nbw-transition-colors hover:nbw-bg-gray-100 nbw-text-gray-900 nbw-no-underline"
        classList={{ 'nbw-bg-gray-200 nbw-font-semibold': !props.currentPostId }}
        onClick={(e) => {
          e.preventDefault();
          props.onHome();
        }}
      >
        Home
      </a>
      <div class="nbw-border-t nbw-border-gray-200 nbw-my-2"></div>
      <For each={props.posts}>
        {(post) => (
          <a
            href={`#/post/${post.id}`}
            class="nbw-block nbw-px-4 nbw-py-2 nbw-rounded nbw-transition-colors hover:nbw-bg-gray-100 nbw-text-gray-700 nbw-no-underline nbw-text-sm"
            classList={{ 'nbw-bg-gray-200 nbw-font-semibold': props.currentPostId === post.id }}
            onClick={(e) => {
              e.preventDefault();
              props.onNavigate(post.id);
            }}
          >
            {post.title}
          </a>
        )}
      </For>
    </nav>
  );
};
