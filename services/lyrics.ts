
export interface LyricLine {
    time: number;
    text: string;
}

export interface LrcLibResponse {
    id: number;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string;
    syncedLyrics: string; // This is the LRC format string we need
}

/**
 * Fetches lyrics from the LRCLIB API.
 * 
 * @param trackName The name of the track
 * @param artistName The name of the artist
 * @param albumName The name of the album
 * @param duration The duration of the track in seconds
 * @returns The raw syncedLyrics string or null if not found
 */
export async function fetchLyrics(
    trackName: string,
    artistName: string,
    albumName: string,
    duration: number
): Promise<string | null> {
    try {
        const params = new URLSearchParams({
            track_name: trackName,
            artist_name: artistName,
            album_name: albumName,
            duration: duration.toString(),
        });

        const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);

        if (response.status === 404) {
            console.log('Lyrics not found for this track.');
            return null;
        }

        if (!response.ok) {
            throw new Error(`LRCLIB API Error: ${response.statusText}`);
        }

        const data: LrcLibResponse = await response.json();
        return data.syncedLyrics || null;

    } catch (error) {
        console.error('Failed to fetch lyrics:', error);
        return null;
    }
}

/**
 * Parses a raw LRC string into a structured array of LyricLine objects.
 * 
 * Regex Explanation:
 * ^\[(\d{2}):(\d{2}\.\d{2})\](.*)$
 * ^           - Start of string (or line in multiline mode)
 * \[          - Literal opening bracket
 * (\d{2})     - Group 1: Minutes (2 digits)
 * :           - Literal colon separator
 * (\d{2}\.\d{2}) - Group 2: Seconds (2 digits, dot, 2 decimal digits)
 * \]          - Literal closing bracket
 * (.*)        - Group 3: The lyric text (rest of the line)
 * $           - End of string (or line)
 * 
 * @param lrcString The raw LRC string
 * @returns Array of LyricLine objects
 */
export function parseLRC(lrcString: string): LyricLine[] {
    if (!lrcString) return [];

    const lines = lrcString.split('\n');
    const regex = /^\[(\d{2}):(\d{2}\.\d{2})\](.*)$/;
    const lyrics: LyricLine[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(regex);

        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const text = match[3].trim();

            // Convert total timestamp to seconds
            const totalTime = minutes * 60 + seconds;

            lyrics.push({
                time: totalTime,
                text: text,
            });
        }
    }

    return lyrics;
}

/**
 * Finds the active lyric line based on the current player time.
 * Returns the line that started most recently relative to currentTime.
 * 
 * @param currentTime Current playback time in seconds
 * @param lyrics Array of parsed LyricLine objects
 * @returns The active LyricLine object or null
 */
export function getCurrentLyric(currentTime: number, lyrics: LyricLine[]): LyricLine | null {
    if (!lyrics || lyrics.length === 0) return null;

    // Find the last lyric whose time is <= currentTime
    let activeLyric: LyricLine | null = null;

    for (let i = 0; i < lyrics.length; i++) {
        if (lyrics[i].time <= currentTime) {
            activeLyric = lyrics[i];
        } else {
            // Since lyrics are sorted by time, once we find a future lyric,
            // we can stop searching. The previous one (activeLyric) is the correct one.
            break;
        }
    }

    return activeLyric;
}
