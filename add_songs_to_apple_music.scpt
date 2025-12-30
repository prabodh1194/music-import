-- AppleScript to add songs from a text file to an Apple Music playlist
-- Each line in the text file should be in format: "Song Title - Artist"

-- Configuration
set playlistName to "Imported Songs"
set songsFilePath to (path to home folder as text) & "personal:music-import:songs.txt"

-- Read the songs file
try
    set songsFile to open for access file songsFilePath
    set songsContent to read songsFile as «class utf8»
    close access songsFile
on error errMsg
    display dialog "Error reading songs file: " & errMsg buttons {"OK"} default button "OK"
    return
end try

-- Split into lines
set AppleScript's text item delimiters to {linefeed, return}
set songLines to text items of songsContent
set AppleScript's text item delimiters to ""

-- Filter out empty lines
set validSongs to {}
repeat with songLine in songLines
    if (length of songLine) > 0 then
        set end of validSongs to songLine as text
    end if
end repeat

set totalSongs to count of validSongs
set addedCount to 0
set failedSongs to {}

tell application "Music"
    activate

    -- Create or get the playlist
    if not (exists playlist playlistName) then
        make new playlist with properties {name:playlistName}
    end if
    set targetPlaylist to playlist playlistName

    -- Process each song
    repeat with i from 1 to totalSongs
        set songLine to item i of validSongs

        -- Parse song title and artist (format: "Title - Artist")
        set AppleScript's text item delimiters to " - "
        set songParts to text items of songLine
        set AppleScript's text item delimiters to ""

        if (count of songParts) >= 2 then
            set songTitle to item 1 of songParts
            -- Join remaining parts as artist (in case artist name contains " - ")
            set artistName to ""
            repeat with j from 2 to (count of songParts)
                if j > 2 then set artistName to artistName & " - "
                set artistName to artistName & (item j of songParts)
            end repeat

            -- Search in library first
            set searchQuery to songTitle
            try
                set foundTracks to (search library playlist 1 for searchQuery)

                set matchFound to false
                repeat with foundTrack in foundTracks
                    -- Check if artist matches (case insensitive partial match)
                    set trackArtist to artist of foundTrack as text
                    if trackArtist contains artistName or artistName contains trackArtist then
                        -- Add to playlist if not already there
                        try
                            duplicate foundTrack to targetPlaylist
                            set addedCount to addedCount + 1
                            set matchFound to true
                            exit repeat
                        end try
                    end if
                end repeat

                if not matchFound then
                    set end of failedSongs to songLine
                end if

            on error
                set end of failedSongs to songLine
            end try
        else
            set end of failedSongs to songLine
        end if

        -- Progress update every 50 songs
        if i mod 50 = 0 then
            display notification "Processed " & i & " of " & totalSongs & " songs..." with title "Adding Songs"
        end if
    end repeat
end tell

-- Report results
set resultMessage to "Added " & addedCount & " songs to playlist '" & playlistName & "'." & return & return
if (count of failedSongs) > 0 then
    set resultMessage to resultMessage & (count of failedSongs) & " songs were not found in your library." & return
    set resultMessage to resultMessage & "These songs may need to be searched in Apple Music catalog."
end if

display dialog resultMessage buttons {"OK", "Show Failed Songs"} default button "OK"
if button returned of result = "Show Failed Songs" then
    set failedList to ""
    repeat with failedSong in failedSongs
        set failedList to failedList & failedSong & return
    end repeat
    display dialog "Songs not found:" & return & return & failedList buttons {"OK"} default button "OK"
end if