#!/bin/bash
# Script to search for songs in Apple Music
# This opens Apple Music search for each song so you can add them

SONGS_FILE="${1:-$HOME/aoc/songs.txt}"
DELAY="${2:-3}"  # seconds between searches

if [ ! -f "$SONGS_FILE" ]; then
    echo "Songs file not found: $SONGS_FILE"
    echo "Usage: $0 [songs_file] [delay_seconds]"
    exit 1
fi

echo "=== Apple Music Song Importer ==="
echo "Songs file: $SONGS_FILE"
echo "Delay between searches: ${DELAY}s"
echo ""
echo "This will open Apple Music search for each song."
echo "Press Cmd+Shift+A to add a song to your library when you find it."
echo ""
read -p "Press Enter to start (Ctrl+C to cancel)..."

count=0
total=$(wc -l < "$SONGS_FILE" | tr -d ' ')

while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines
    [ -z "$line" ] && continue

    ((count++))

    # Extract song title (before the " - ")
    song_title=$(echo "$line" | sed 's/ - .*//')
    artist=$(echo "$line" | sed 's/^[^-]*- //')

    # Create search query
    search_query="$song_title $artist"

    echo "[$count/$total] Searching: $line"

    # URL encode the search query
    encoded_query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$search_query'''))")

    # Open Apple Music search
    open "music://music.apple.com/search?term=$encoded_query"

    sleep "$DELAY"

done < "$SONGS_FILE"

echo ""
echo "Done! Processed $count songs."