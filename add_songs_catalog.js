#!/usr/bin/env osascript -l JavaScript

// JXA Script to add songs from Apple Music catalog to a playlist
// Run with: osascript add_songs_catalog.js

const Music = Application('Music');
Music.includeStandardAdditions = true;
const app = Application.currentApplication();
app.includeStandardAdditions = true;

const PLAYLIST_NAME = 'Imported Songs';
const SONGS_FILE = '/Users/pbd/personal/music-import/songs.txt';

function readSongsFile(filePath) {
    const fileContent = app.doShellScript(`cat "${filePath}"`);
    return fileContent.split(/[\r\n]+/).filter(line => line.trim().length > 0);
}

function parseSongLine(line) {
    const parts = line.split(' - ');
    if (parts.length >= 2) {
        const title = parts[0].trim();
        const artist = parts.slice(1).join(' - ').trim();
        return { title, artist, original: line };
    }
    return { title: line.trim(), artist: '', original: line };
}

function searchLibrary(title, artist) {
    try {
        const results = Music.search(Music.libraryPlaylists[0], { for: title });
        for (const track of results) {
            const trackArtist = track.artist().toLowerCase();
            const searchArtist = artist.toLowerCase();
            if (trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist)) {
                return track;
            }
        }
    } catch (e) {
        // Search failed
    }
    return null;
}

function getOrCreatePlaylist(name) {
    try {
        return Music.playlists.byName(name);
    } catch (e) {
        return Music.make({ new: 'playlist', withProperties: { name: name } });
    }
}

function main() {
    Music.activate();

    console.log('Reading songs file...');
    const songLines = readSongsFile(SONGS_FILE);
    console.log(`Found ${songLines.length} songs to process`);

    const playlist = getOrCreatePlaylist(PLAYLIST_NAME);
    console.log(`Using playlist: ${PLAYLIST_NAME}`);

    let added = 0;
    let notFound = [];

    for (let i = 0; i < songLines.length; i++) {
        const { title, artist, original } = parseSongLine(songLines[i]);

        if (i % 25 === 0) {
            console.log(`Processing ${i + 1}/${songLines.length}...`);
        }

        const track = searchLibrary(title, artist);
        if (track) {
            try {
                Music.duplicate(track, { to: playlist });
                added++;
            } catch (e) {
                // May already be in playlist
            }
        } else {
            notFound.push(original);
        }
    }

    console.log(`\n=== Results ===`);
    console.log(`Added: ${added} songs`);
    console.log(`Not found: ${notFound.length} songs`);

    if (notFound.length > 0) {
        console.log(`\nSongs not found in library:`);
        notFound.forEach(s => console.log(`  - ${s}`));
    }

    // Show dialog with results
    app.displayDialog(
        `Added ${added} songs to playlist "${PLAYLIST_NAME}".\n\n` +
        `${notFound.length} songs were not found in your library and may need to be ` +
        `added from Apple Music catalog first.`,
        {
            buttons: ['OK'],
            defaultButton: 'OK',
            withTitle: 'Import Complete'
        }
    );

    return `Added ${added}, Not found: ${notFound.length}`;
}

main();