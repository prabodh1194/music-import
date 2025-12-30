# Apple Music Import

Bulk import songs to your Apple Music library using the web API.

## Songs

The `songs.txt` file contains 662 songs in `Title - Artist` format, ready to import.

## Setup

1. **Login to Apple Music in Safari**
   - Go to [music.apple.com](https://music.apple.com)
   - Sign in with your Apple ID

2. **Get API tokens from Safari DevTools**

   Open Safari DevTools: `Cmd + Option + I` → Network tab

   Then search for any song on music.apple.com. Look for a request to `amp-api.music.apple.com` or `amp-api-edge.music.apple.com`.

   Click the request → Headers tab → find these two values:

   | Header | Environment Variable | Example |
   |--------|---------------------|---------|
   | `Authorization` | `APPLE_BEARER_TOKEN` | `eyJhbGciOiJFUzI1NiIs...` (remove "Bearer " prefix) |
   | `media-user-token` | `APPLE_MEDIA_USER_TOKEN` | `An6AQ9Duh8BSQMauz...` |

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run the import**
   ```bash
   APPLE_BEARER_TOKEN="eyJ..." APPLE_MEDIA_USER_TOKEN="An6..." node catalog_search.js
   ```

## Options

```bash
# Import first 10 songs (default)
APPLE_BEARER_TOKEN="..." APPLE_MEDIA_USER_TOKEN="..." node catalog_search.js

# Import all songs
APPLE_BEARER_TOKEN="..." APPLE_MEDIA_USER_TOKEN="..." LIMIT=662 node catalog_search.js

# Verbose mode (show all search results)
APPLE_BEARER_TOKEN="..." APPLE_MEDIA_USER_TOKEN="..." VERBOSE=1 LIMIT=10 node catalog_search.js
```

## How it works

The script uses the Apple Music web API to:
1. Search the catalog for each song
2. Match by title + artist
3. Add to your library

Results are saved to `results.json`.

## Note

Tokens are fetched from your Safari session - no secrets are stored in the code.
