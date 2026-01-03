import { createSignal, onCleanup } from 'solid-js';
import { RouterState } from '../types/config';

export function createRouter() {
  const [route, setRoute] = createSignal<RouterState>(parseHash());

  function parseHash(): RouterState {
    const hash = window.location.hash.slice(1); // Remove #

    if (!hash || hash === '/') {
      return { view: 'list' };
    }

    // Match pattern: /post/{id}
    const postMatch = hash.match(/^\/post\/(.+)$/);
    if (postMatch) {
      return { view: 'detail', postId: postMatch[1] };
    }

    return { view: 'list' };
  }

  function handleHashChange() {
    setRoute(parseHash());
  }

  // Listen for hash changes
  window.addEventListener('hashchange', handleHashChange);
  onCleanup(() => window.removeEventListener('hashchange', handleHashChange));

  function navigateToPost(postId: string) {
    window.location.hash = `/post/${postId}`;
  }

  function navigateToList() {
    window.location.hash = '/';
  }

  return {
    route,
    navigateToPost,
    navigateToList,
  };
}
