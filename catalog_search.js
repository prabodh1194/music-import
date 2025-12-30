#!/usr/bin/env node

/**
 * Apple Music Catalog Search
 * Searches Apple Music catalog for songs in songs.txt using the web API
 */

import { readFileSync, writeFileSync } from 'fs';

// Configuration
const SONGS_FILE = './songs.txt';
const RESULTS_FILE = './results.json';
const API_SEARCH = 'https://amp-api-edge.music.apple.com/v1/catalog/in/search';
const API_LIBRARY = 'https://amp-api.music.apple.com/v1/me/library';
const DELAY_MS = 150; // Delay between requests to avoid rate limiting

// Auth tokens - get these from Safari DevTools when logged into music.apple.com
// Network tab > any API request > Headers > Authorization (Bearer token) and media-user-token
const BEARER_TOKEN = process.env.APPLE_BEARER_TOKEN;
const MEDIA_USER_TOKEN = process.env.APPLE_MEDIA_USER_TOKEN;

/**
 * Read and parse songs.txt
 */
function readSongs(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    return content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
            const parts = line.split(' - ');
            if (parts.length >= 2) {
                return {
                    title: parts[0].trim(),
                    artist: parts.slice(1).join(' - ').trim(),
                    original: line.trim()
                };
            }
            return { title: line.trim(), artist: '', original: line.trim() };
        });
}

/**
 * Search Apple Music catalog for a song
 */
async function searchSong(title, artist) {
    const searchTerm = `${title} ${artist}`.trim();
    const params = new URLSearchParams({
        'format[resources]': 'map',
        'l': 'en-GB',
        'limit': '5',
        'platform': 'web',
        'term': searchTerm,
        'types': 'songs'
    });

    const url = `${API_SEARCH}?${params.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': '*/*',
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            'media-user-token': MEDIA_USER_TOKEN,
            'Origin': 'https://music.apple.com',
            'Referer': 'https://music.apple.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15'
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized - token may be expired');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Add a song to the user's Apple Music library
 */
async function addToLibrary(songId) {
    const params = new URLSearchParams({
        'ids[songs]': songId,
        'representation': 'ids'
    });

    const url = `${API_LIBRARY}?${params.toString()}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': '*/*',
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            'media-user-token': MEDIA_USER_TOKEN,
            'Origin': 'https://music.apple.com',
            'Referer': 'https://music.apple.com/',
            'Content-Length': '0',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15'
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized - token may be expired');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
}

/**
 * Find best matching song from search results
 */
function findBestMatch(results, targetArtist, targetTitle, verbose = false) {
    // The catalog search returns results in resources.songs (map format)
    const songs = results?.resources?.songs;

    if (!songs || Object.keys(songs).length === 0) {
        return null;
    }

    // Log all results if verbose
    if (verbose) {
        console.log(`\n  API returned ${Object.keys(songs).length} results:`);
        for (const [songId, song] of Object.entries(songs)) {
            console.log(`    - [${songId}] "${song.attributes?.name}" by ${song.attributes?.artistName}`);
        }
    }

    const target = targetArtist.toLowerCase();
    const titleTarget = targetTitle.toLowerCase();

    // First, try to find an exact title + artist match
    for (const [songId, song] of Object.entries(songs)) {
        const songArtist = song.attributes?.artistName?.toLowerCase() || '';
        const songName = song.attributes?.name?.toLowerCase() || '';

        // Check if both title and artist match
        const artistMatch = songArtist.includes(target) || target.includes(songArtist);
        const titleMatch = songName.includes(titleTarget) || titleTarget.includes(songName);

        if (artistMatch && titleMatch) {
            return {
                id: songId,
                name: song.attributes?.name,
                artist: song.attributes?.artistName,
                album: song.attributes?.albumName,
                url: song.attributes?.url
            };
        }
    }

    // Second pass: just artist match
    for (const [songId, song] of Object.entries(songs)) {
        const songArtist = song.attributes?.artistName?.toLowerCase() || '';

        if (songArtist.includes(target) || target.includes(songArtist)) {
            return {
                id: songId,
                name: song.attributes?.name,
                artist: song.attributes?.artistName,
                album: song.attributes?.albumName,
                url: song.attributes?.url
            };
        }
    }

    // If no match, return first song result
    const firstSongId = Object.keys(songs)[0];
    const song = songs[firstSongId];
    return {
        id: firstSongId,
        name: song.attributes?.name,
        artist: song.attributes?.artistName,
        album: song.attributes?.albumName,
        url: song.attributes?.url
    };
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
    console.log('Apple Music Catalog Search');
    console.log('==========================\n');

    // Validate tokens
    if (!BEARER_TOKEN || !MEDIA_USER_TOKEN) {
        console.error('Missing required environment variables!');
        console.error('');
        console.error('Set these from Safari DevTools (music.apple.com > Network tab > any request):');
        console.error('  APPLE_BEARER_TOKEN     - from Authorization header (without "Bearer " prefix)');
        console.error('  APPLE_MEDIA_USER_TOKEN - from media-user-token header');
        console.error('');
        console.error('Example:');
        console.error('  APPLE_BEARER_TOKEN="eyJ..." APPLE_MEDIA_USER_TOKEN="An6..." node catalog_search.js');
        process.exit(1);
    }

    // Read songs
    console.log(`Reading songs from ${SONGS_FILE}...`);
    const songs = readSongs(SONGS_FILE);
    console.log(`Found ${songs.length} songs to search\n`);

    // Limit for testing (set to songs.length for full run)
    const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : 10;
    const songsToProcess = songs.slice(0, LIMIT);
    console.log(`Processing first ${songsToProcess.length} songs (set LIMIT env var to change)\n`);

    const results = {
        added: [],
        notFound: [],
        errors: []
    };

    for (let i = 0; i < songsToProcess.length; i++) {
        const song = songsToProcess[i];
        const progress = `[${i + 1}/${songsToProcess.length}]`;

        try {
            process.stdout.write(`${progress} Searching: ${song.original}... `);

            const searchResults = await searchSong(song.title, song.artist);
            const verbose = process.env.VERBOSE === '1';
            const match = findBestMatch(searchResults, song.artist, song.title, verbose);

            if (match) {
                // Add to library
                await addToLibrary(match.id);
                console.log(`Added: ${match.name} by ${match.artist}`);
                results.added.push({
                    query: song.original,
                    match: match
                });
            } else {
                console.log('Not found');
                results.notFound.push(song.original);
            }

            // Rate limiting delay
            if (i < songsToProcess.length - 1) {
                await sleep(DELAY_MS);
            }
        } catch (error) {
            console.log(`Error: ${error.message}`);
            results.errors.push({
                query: song.original,
                error: error.message
            });

            // If unauthorized, stop processing
            if (error.message.includes('Unauthorized')) {
                console.log('\nToken expired! Please update the token and try again.');
                break;
            }
        }
    }

    // Save results
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    // Print summary
    console.log('\n==========================');
    console.log('Summary:');
    console.log(`  Added: ${results.added.length}`);
    console.log(`  Not found: ${results.notFound.length}`);
    console.log(`  Errors: ${results.errors.length}`);
    console.log(`\nResults saved to ${RESULTS_FILE}`);
}

main().catch(console.error);
