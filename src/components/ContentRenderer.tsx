import { Component, For, createSignal, createEffect } from 'solid-js';
import { marked } from 'marked';
import { BlogPost } from '../types/config';
import { EmbeddedPost } from './EmbeddedPost';

interface ContentRendererProps {
  content: string;
  onFetchPost: (eventId: string) => Promise<BlogPost | null>;
  useMarkdown?: boolean; // Default false for kind 1, true for kind 30023
}

interface NostrReference {
  id: string;
  fullId: string;
  type: 'naddr' | 'nevent' | 'note' | 'other';
}

export const ContentRenderer: Component<ContentRendererProps> = (props) => {
  const [nostrRefs, setNostrRefs] = createSignal<NostrReference[]>([]);
  const [contentParts, setContentParts] = createSignal<string[]>([]);

  // Convert media URLs to HTML
  const convertMediaUrls = (content: string) => {
    return content.replace(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi))/gi, (match) => {
      const lowerMatch = match.toLowerCase();
      if (lowerMatch.endsWith('.mp4') || lowerMatch.endsWith('.webm') ||
          lowerMatch.endsWith('.mov') || lowerMatch.endsWith('.avi')) {
        return `\n\n<video controls class="nbw-content-video nbw-max-w-full nbw-h-auto nbw-rounded-lg nbw-my-4"><source src="${match}"></video>\n\n`;
      }
      return `\n\n<img src="${match}" alt="Image" class="nbw-content-image nbw-max-w-full nbw-h-auto nbw-rounded-lg nbw-my-4" />\n\n`;
    });
  };

  // Parse content and extract nostr references for embedding
  const parseContent = (content: string) => {
    // Allow odd spacing around `nostr:` and trim trailing punctuation so we still embed
    const nostrRegex = /(?:nostr\s*:?\s*)?(naddr1\S+|note1\S+|nevent1\S+|nprofile1\S+|npub1\S+|nrelay1\S+)/gi;
    const refs: NostrReference[] = [];
    const parts: string[] = [];
    let lastIndex = 0;
    let counter = 0;

    let match;
    while ((match = nostrRegex.exec(content)) !== null) {
      const rawId = match[1].trim();
      // Drop trailing punctuation/quotes/brackets that break decoding
      const fullId = rawId.replace(/[)\]\}\.,!?:;"'>]+$/, '');
      const prefix = fullId.substring(0, fullId.indexOf('1') + 1).toLowerCase();

      let type: NostrReference['type'] = 'other';
      if (prefix.startsWith('naddr')) type = 'naddr';
      else if (prefix.startsWith('nevent')) type = 'nevent';
      else if (prefix.startsWith('note')) type = 'note';

      // Embed naddr, nevent, and note references
      if (type !== 'other') {
        parts.push(content.substring(lastIndex, match.index));
        const refId = `nostr-ref-${counter++}`;
        parts.push(`[[${refId}]]`);
        refs.push({ id: refId, fullId, type });
        lastIndex = match.index + match[0].length;
      }
    }

    parts.push(content.substring(lastIndex));

    // Process each part
    const processedParts = parts.map(part => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        return part; // Keep placeholders
      }

      // Convert media
      let processed = convertMediaUrls(part);

      // Convert remaining nostr refs (npub, nprofile) to external links
      processed = processed.replace(/(?:nostr:\s*)?(npub1\S+|nprofile1\S+|nrelay1\S+)/gi, (match, fullId) => {
        return `<a href="https://njump.me/${fullId}" target="_blank" rel="noopener noreferrer" class="nbw-nostr-link nbw-text-blue-600 hover:nbw-underline">${fullId}</a>`;
      });

      return processed;
    });

    setNostrRefs(refs);
    setContentParts(processedParts);
  };

  createEffect(() => {
    parseContent(props.content);
  });

  return (
    <div class="nbw-content-renderer">
      <For each={contentParts()}>
        {(part) => {
          // Check if placeholder for embedded post
          if (part.startsWith('[[') && part.endsWith(']]')) {
            const refId = part.slice(2, -2);
            const ref = nostrRefs().find(r => r.id === refId);
            if (ref) {
              return (
                <EmbeddedPost
                  eventId={ref.fullId}
                  onFetch={props.onFetchPost}
                />
              );
            }
            return null;
          }

          // Render content - use markdown only if specified (for kind 30023)
          if (props.useMarkdown) {
            return <div innerHTML={marked(part)} />;
          } else {
            // For kind 1, render as HTML directly (already has <img>, <video>, <a> tags)
            // Convert newlines to <br> tags for proper formatting
            const htmlWithBreaks = part.replace(/\n/g, '<br />');
            return <div innerHTML={htmlWithBreaks} />;
          }
        }}
      </For>
    </div>
  );
};
