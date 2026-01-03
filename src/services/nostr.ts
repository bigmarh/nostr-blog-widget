import { SimplePool, Event, Filter, nip19 } from 'nostr-tools';
import { BlogPost, AuthorProfile } from '../types/config';

export class NostrService {
  private pool: SimplePool;
  private relays: string[];
  private profileCache: Map<string, AuthorProfile> = new Map();

  constructor(relays: string[]) {
    this.pool = new SimplePool();
    this.relays = relays;
  }

  // Convert npub to hex if needed
  private normalizePublicKey(pubkey: string): string {
    if (pubkey.startsWith('npub')) {
      try {
        const decoded = nip19.decode(pubkey);
        return decoded.data as string;
      } catch (err) {
        console.error('Invalid npub format:', err);
        return pubkey;
      }
    }
    return pubkey;
  }

  async fetchPosts(
    pubkey: string | string[],
    limit: number = 50,
    contentType: 'all' | 'long-form' | 'short-form' = 'all',
    dateRange?: { since?: number; until?: number }
  ): Promise<BlogPost[]> {
    // Handle single or multiple pubkeys
    const pubkeys = Array.isArray(pubkey) ? pubkey : [pubkey];
    const normalizedPubkeys = pubkeys.map(pk => this.normalizePublicKey(pk));

    // Determine which kinds to fetch based on contentType
    let kinds: number[];
    switch (contentType) {
      case 'long-form':
        kinds = [30023]; // Only long-form articles
        break;
      case 'short-form':
        kinds = [1]; // Only short notes
        break;
      default:
        kinds = [30023, 1]; // Both
    }

    // When multiple authors, fetch from each separately to ensure we get posts from all
    // Otherwise a single prolific author could fill the entire limit
    let allEvents: Event[] = [];

    if (normalizedPubkeys.length > 1) {
      // Fetch from each author separately
      const limitPerAuthor = Math.ceil(limit / normalizedPubkeys.length);

      for (const author of normalizedPubkeys) {
        const filter: Filter = {
          authors: [author],
          kinds,
          limit: limitPerAuthor,
        };

        // Add date range filters if provided
        if (dateRange?.since) {
          filter.since = dateRange.since;
        }
        if (dateRange?.until) {
          filter.until = dateRange.until;
        }

        const events = await this.pool.querySync(this.relays, filter);
        allEvents = allEvents.concat(events);
      }
    } else {
      // Single author, fetch normally
      const filter: Filter = {
        authors: normalizedPubkeys,
        kinds,
        limit,
      };

      // Add date range filters if provided
      if (dateRange?.since) {
        filter.since = dateRange.since;
      }
      if (dateRange?.until) {
        filter.until = dateRange.until;
      }

      allEvents = await this.pool.querySync(this.relays, filter);
    }

    // Client-side filter for date range (in case relays don't honor it)
    if (dateRange) {
      console.log('Filtering events by date range:', dateRange);
      console.log('Events before filter:', allEvents.length);

      allEvents = allEvents.filter(event => {
        // Check for published_at tag first, fallback to created_at
        const publishedAtTag = event.tags.find(([key]) => key === 'published_at');
        const eventDate = publishedAtTag ? parseInt(publishedAtTag[1], 10) : event.created_at;

        console.log(`Event date: ${eventDate} (${new Date(eventDate * 1000).toISOString()}) [${publishedAtTag ? 'published_at' : 'created_at'}]`);

        if (dateRange.since && eventDate < dateRange.since) {
          console.log(`  ✗ Filtered out (before ${new Date(dateRange.since * 1000).toISOString()})`);
          return false;
        }
        if (dateRange.until && eventDate > dateRange.until) {
          console.log(`  ✗ Filtered out (after ${new Date(dateRange.until * 1000).toISOString()})`);
          return false;
        }
        console.log(`  ✓ Kept`);
        return true;
      });

      console.log('Events after filter:', allEvents.length);
    }

    // Fetch author profiles for all unique authors
    await this.fetchAuthorProfiles(normalizedPubkeys);

    return this.parsePosts(allEvents);
  }

  async fetchAuthorProfiles(pubkeys: string[]): Promise<void> {
    // Filter out already cached profiles
    const uncachedPubkeys = pubkeys.filter(pk => !this.profileCache.has(pk));
    if (uncachedPubkeys.length === 0) return;

    const filter: Filter = {
      authors: uncachedPubkeys,
      kinds: [0], // Kind 0 is user metadata
      limit: uncachedPubkeys.length,
    };

    try {
      const events = await this.pool.querySync(this.relays, filter);

      events.forEach(event => {
        try {
          const profile: AuthorProfile = JSON.parse(event.content);
          this.profileCache.set(event.pubkey, profile);
        } catch (err) {
          console.error('Failed to parse profile for', event.pubkey, err);
        }
      });
    } catch (err) {
      console.error('Failed to fetch author profiles:', err);
    }
  }

  async fetchPostById(eventId: string): Promise<BlogPost | null> {
    // Check if it's an naddr (nostr address)
    if (eventId.startsWith('naddr')) {
      return this.fetchPostByNaddr(eventId);
    }

    // Check if it's a nevent (note event)
    if (eventId.startsWith('nevent')) {
      return this.fetchPostByNevent(eventId);
    }

    // Check if it's a note1 (bech32 encoded note ID)
    if (eventId.startsWith('note1')) {
      try {
        const decoded = nip19.decode(eventId);
        if (decoded.type === 'note') {
          eventId = decoded.data as string; // Convert to hex
        }
      } catch (err) {
        console.error('Failed to decode note1:', err);
      }
    }

    const filter: Filter = {
      ids: [eventId],
    };

    const events = await this.pool.querySync(this.relays, filter);
    if (events.length === 0) return null;

    // Fetch author profile for this post
    if (events[0]?.pubkey) {
      await this.fetchAuthorProfiles([events[0].pubkey]);
    }

    const parsed = this.parsePosts(events);
    return parsed[0] || null;
  }

  async fetchPostByNevent(nevent: string): Promise<BlogPost | null> {
    try {
      const decoded = nip19.decode(nevent);

      if (decoded.type !== 'nevent') {
        console.error('Not a valid nevent');
        return null;
      }

      const data = decoded.data as nip19.EventPointer;

      // Use the relays from nevent if provided, otherwise use configured relays
      const relaysToUse = data.relays && data.relays.length > 0
        ? data.relays
        : this.relays;

      const filter: Filter = {
        ids: [data.id],
      };

      // Optionally filter by author if provided in the nevent
      if (data.author) {
        filter.authors = [data.author];
      }

      const events = await this.pool.querySync(relaysToUse, filter);
      if (events.length === 0) return null;

      // Fetch author profile for this post
      if (events[0]?.pubkey) {
        await this.fetchAuthorProfiles([events[0].pubkey]);
      }

      const parsed = this.parsePosts(events);
      return parsed[0] || null;
    } catch (err) {
      console.error('Failed to decode nevent:', err);
      return null;
    }
  }

  async fetchPostByNaddr(naddr: string): Promise<BlogPost | null> {
    try {
      const decoded = nip19.decode(naddr);

      if (decoded.type !== 'naddr') {
        console.error('Not a valid naddr');
        return null;
      }

      const data = decoded.data as nip19.AddressPointer;

      // Use the relays from naddr if provided, otherwise use configured relays
      const relaysToUse = data.relays && data.relays.length > 0
        ? data.relays
        : this.relays;

      const filter: Filter = {
        authors: [data.pubkey],
        kinds: [data.kind],
        '#d': [data.identifier],
        limit: 1,
      };

      const events = await this.pool.querySync(relaysToUse, filter);
      if (events.length === 0) return null;

      // For replaceable events, get the one with the highest created_at (most recent)
      const latestEvent = events.reduce((latest, current) =>
        current.created_at > latest.created_at ? current : latest
      );

      // Fetch author profile for this post
      if (latestEvent?.pubkey) {
        await this.fetchAuthorProfiles([latestEvent.pubkey]);
      }

      const parsed = this.parsePost(latestEvent);
      return parsed;
    } catch (err) {
      console.error('Failed to decode naddr:', err);
      return null;
    }
  }

  private parsePosts(events: Event[]): BlogPost[] {
    console.log(`[parsePosts] Processing ${events.length} events`);

    // For kind 30023 (replaceable events), deduplicate by d tag and keep only latest
    const deduplicatedEvents: Event[] = [];
    const kind30023Map = new Map<string, Event>(); // key: "pubkey:dtag"

    for (const event of events) {
      if (event.kind === 30023) {
        const dTag = event.tags.find(([key]) => key === 'd')?.[1];
        const publishedAt = event.tags.find(([key]) => key === 'published_at')?.[1];
        console.log(`Event kind 30023: d=${dTag}, created_at=${event.created_at}, published_at=${publishedAt}`);

        if (dTag) {
          const key = `${event.pubkey}:${dTag}`;
          const existing = kind30023Map.get(key);

          // Keep the newest version (highest created_at)
          if (!existing || event.created_at > existing.created_at) {
            console.log(`  → ${existing ? 'Replacing' : 'Adding'} event with key: ${key}`);
            kind30023Map.set(key, event);
          } else {
            console.log(`  → Skipping older version with key: ${key}`);
          }
        }
      } else {
        // Kind 1 and others are not replaceable
        deduplicatedEvents.push(event);
      }
    }

    // Add the deduplicated kind 30023 events
    console.log(`[parsePosts] Deduplicated ${kind30023Map.size} kind 30023 events from ${events.filter(e => e.kind === 30023).length} total`);
    deduplicatedEvents.push(...kind30023Map.values());

    return deduplicatedEvents
      .map((event) => this.parsePost(event))
      .sort((a, b) => (b.published_at || b.created_at) - (a.published_at || a.created_at));
  }

  private parsePost(event: Event): BlogPost {
    const post: BlogPost = { ...event };

    // Parse tags for metadata
    let dTag: string | undefined;
    event.tags.forEach(([key, value]) => {
      switch (key) {
        case 'title':
          post.title = value;
          break;
        case 'summary':
          post.summary = value;
          break;
        case 'image':
          post.image = value;
          break;
        case 'published_at':
          post.published_at = parseInt(value, 10);
          break;
        case 'd':
          dTag = value;
          break;
      }
    });

    // Generate naddr for kind 30023, nevent for kind 1
    if (event.kind === 30023 && dTag) {
      post.naddr = nip19.naddrEncode({
        kind: event.kind,
        pubkey: event.pubkey,
        identifier: dTag,
        relays: this.relays.slice(0, 2), // Include first 2 relays
      });
    } else if (event.kind === 1) {
      post.naddr = nip19.neventEncode({
        id: event.id,
        relays: this.relays.slice(0, 2),
        author: event.pubkey,
      });
    }

    // For kind 30023, content is the full article
    // For kind 1, content is the note text
    post.content = event.content;

    // Generate summary if not provided
    if (!post.summary && event.content) {
      // Remove URLs, nostr references, and extra whitespace for cleaner summaries
      let cleanContent = event.content
        .replace(/https?:\/\/\S+/gi, '') // Remove URLs
        .replace(/nostr:(naddr1|note1|npub1|nevent1|nprofile1|nrelay1)\S+/gi, '') // Remove nostr: refs
        .replace(/(naddr1|note1|npub1|nevent1|nprofile1|nrelay1)\S+/gi, '') // Remove bare nostr refs
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      post.summary = cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : '');
    }

    // Use event title or generate from content
    if (!post.title) {
      if (event.kind === 30023) {
        // Try to extract first heading from markdown
        const headingMatch = event.content.match(/^#\s+(.+)$/m);
        post.title = headingMatch ? headingMatch[1] : 'Untitled Post';
      } else {
        // For short notes, use first line or truncated content
        const firstLine = event.content.split('\n')[0];
        post.title = firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
      }
    }

    // Add author information from cache
    const profile = this.profileCache.get(event.pubkey);
    if (profile) {
      post.authorName = profile.display_name || profile.name || 'Anonymous';
      post.authorAvatar = profile.picture;
      post.authorNip05 = profile.nip05;
    } else {
      // Fallback to shortened pubkey if no profile
      post.authorName = event.pubkey.substring(0, 8) + '...';
    }

    // For kind 30023 (replaceable events), also generate naddr
    if (event.kind === 30023) {
      const dTag = event.tags.find(([key]) => key === 'd');
      if (dTag && dTag[1]) {
        try {
          const naddr = nip19.naddrEncode({
            kind: event.kind,
            pubkey: event.pubkey,
            identifier: dTag[1],
            relays: this.relays.slice(0, 2), // Include first 2 relays
          });
          post.naddr = naddr;
        } catch (err) {
          console.error('Failed to encode naddr:', err);
        }
      }
    }

    return post;
  }

  close() {
    this.pool.close(this.relays);
  }
}
