# Apple Music Song Importer

Import songs from `songs.txt` into Apple Music playlists.

## Files

- `songs.txt` - Your song list (format: `Song Title - Artist`)
- `add_songs_to_apple_music.scpt` - AppleScript to add songs from your library
- `add_songs_catalog.js` - JXA script (more advanced)
- `search_apple_music.sh` - Shell script to search Apple Music catalog

## Quick Start

### Option 1: Add songs already in your library

```bash
osascript add_songs_to_apple_music.scpt
```

### Option 2: Search Apple Music catalog interactively

```bash
chmod +x search_apple_music.sh
./search_apple_music.sh
```

This opens Apple Music search for each song. Press `Cmd+Shift+A` to add to library.

### Option 3: JXA script (recommended for library songs)

```bash
osascript add_songs_catalog.js
```

## Notes

- Songs are added to a playlist called "Imported Songs"
- The scripts search your local library first
- Songs not in your library need to be added from Apple Music catalog
- Make sure you have an active Apple Music subscription for catalog access