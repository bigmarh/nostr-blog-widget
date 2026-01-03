# Nostr Blog Widget

A drop-in JavaScript widget that transforms any webpage into a Nostr-powered blog. Display long-form articles (kind 30023) and short notes (kind 1) from Nostr with zero backend required.

## Features

- 📝 **Dual Content Support**: Display both long-form articles (kind 30023) and short notes (kind 1)
- 👥 **Multi-Author Support**: Aggregate posts from multiple Nostr authors
- 🎨 **Three View Modes**: Grid, List, and Compact layouts
- 🖼️ **Rich Media**: Automatic image and video embedding
- 🔗 **Nostr Reference Embedding**: Embedded preview cards for referenced Nostr posts (nevent, naddr, note)
- 🎛️ **Built-in Controls**: Filter by author, content type, date range, and layout
- 🌓 **Theme Support**: Light, dark, and auto modes
- 📱 **Responsive Design**: Works on all devices
- ⚡ **No Backend Required**: Connects directly to Nostr relays

## Installation

### Via NPM

```bash
npm install nostr-blog-widget
```

Then include in your HTML:

```html
<script src="node_modules/nostr-blog-widget/dist/nostr-blog.js"></script>
<link rel="stylesheet" href="node_modules/nostr-blog-widget/dist/nostr-blog.css">
```

### Via CDN

```html
<script src="https://unpkg.com/nostr-blog-widget@latest/dist/nostr-blog.js"></script>
<link rel="stylesheet" href="https://unpkg.com/nostr-blog-widget@latest/dist/nostr-blog.css">
```

## Quick Start

Add this to your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/nostr-blog-widget@latest/dist/nostr-blog.css">
</head>
<body>
  <div
    id="nostr-blog"
    data-pubkey='["3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", "npub1j8y6tcdfw3q3f3h794s6un0gyc5742s0k5h5s2yqj0r70cpklqeqjavrvg", "npub1k7cnst4fh4ajgg8w6ndcmqen4fnyc7ahhm3zpp255vdxqarrtekq5rrg96"]'
    data-relays='["wss://relay.damus.io", "wss://nos.lol"]'
  ></div>

  <script src="https://unpkg.com/nostr-blog-widget@latest/dist/nostr-blog.js"></script>
</body>
</html>
```

That's it! Your Nostr blog is live.

## Configuration

Configure the widget using data attributes:

```html
<div
  id="nostr-blog"
  data-pubkey='["npub1..."]'
  data-relays='["wss://relay.damus.io", "wss://nos.lol"]'
  data-layout="grid"
  data-theme="light"
  data-posts-per-page="10"
  data-show-images="true"
  data-date-format="relative"
  data-content-type="all"
  data-show-controls="true"
  data-pagination="load-more"
></div>
```

### Available Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-pubkey` | string or array | *required* | Nostr pubkey(s) in hex or npub format |
| `data-relays` | array | *required* | Array of Nostr relay URLs |
| `data-layout` | `grid` \| `list` \| `compact` | `grid` | Display layout |
| `data-theme` | `light` \| `dark` \| `auto` | `light` | Color theme |
| `data-posts-per-page` | number | `10` | Number of posts to load |
| `data-show-images` | boolean | `true` | Show post images |
| `data-date-format` | `short` \| `long` \| `relative` | `relative` | Date display format |
| `data-content-type` | `all` \| `long-form` \| `short-form` | `all` | Filter by content type |
| `data-show-controls` | boolean | `true` | Show control panel |
| `data-pagination` | `infinite-scroll` \| `load-more` \| `none` | `load-more` | Pagination style |

## View Modes

### Grid View
Cards displayed in a responsive grid with images, titles, and summaries.

### List View
Full-width cards with complete content preview.

### Compact View
Minimal single-line entries with just date and title - perfect for blog archives.

## Content Types

### Long-form Articles (kind 30023)
- Displays title, summary, author, date, and feature image
- "Read more" button to view full article
- Full markdown support in article view

### Short Notes (kind 1)
- Shows complete content in grid/list view
- Automatic media embedding (images and videos)
- Embedded preview cards for Nostr references
- No "Read more" button needed

## Advanced Usage

### Multiple Authors

```html
data-pubkey='["npub1abc...", "npub1def...", "hex-pubkey-123"]'
```

The widget automatically:
- Fetches posts from all authors
- Shows author filter dropdown
- Displays author avatars and names

### Custom Styling

Override default styles with CSS:

```css
/* Customize colors */
.nbw-bg-white { background: #f5f5f5 !important; }
.nbw-text-blue-600 { color: #0066cc !important; }

/* Customize card appearance */
.nbw-rounded-lg { border-radius: 8px !important; }
.nbw-shadow-md { box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important; }
```

All widget classes are prefixed with `nbw-` to avoid conflicts.

### Embedding Options

The widget automatically handles:
- Image URLs (jpg, png, gif, webp, svg)
- Video URLs (mp4, webm, mov, avi)
- Nostr references (nevent1, naddr1, note1) - shows embedded post cards
- Nostr profiles (npub1, nprofile1) - shows clickable links

## Examples

### Personal Blog
```html
<div
  id="nostr-blog"
  data-pubkey="npub1yourpubkey..."
  data-relays='["wss://relay.damus.io"]'
  data-layout="list"
  data-content-type="long-form"
></div>
```

### Multi-Author Publication
```html
<div
  id="nostr-blog"
  data-pubkey='["npub1author1...", "npub1author2..."]'
  data-relays='["wss://relay.damus.io", "wss://nos.lol"]'
  data-layout="grid"
  data-show-controls="true"
></div>
```

### Compact Archive
```html
<div
  id="nostr-blog"
  data-pubkey="npub1yourpubkey..."
  data-relays='["wss://relay.damus.io"]'
  data-layout="compact"
  data-show-controls="false"
  data-posts-per-page="50"
></div>
```

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

## Technical Details

- Built with [SolidJS](https://www.solidjs.com/) for reactive UI
- Uses [nostr-tools](https://github.com/nbd-wtf/nostr-tools) for Nostr protocol
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Markdown rendering via [marked](https://marked.js.org/)

## License

MIT

## Contributing

Issues and pull requests welcome at [github.com/bigmarh/nostr-blog-widget](https://github.com/bigmarh/nostr-blog-widget)

## Author

Created by [Lamar Wilson](https://lamarwilson.com)

## Support

- GitHub Issues: [Report bugs](https://github.com/bigmarh/nostr-blog-widget/issues)
