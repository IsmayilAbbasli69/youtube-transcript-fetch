import fetch from 'node-fetch';

/**
 * Extracts the YouTube video ID from a URL.
 * @param {string} url - The YouTube video URL.
 * @returns {string|null} The 11-character video ID or null if not found.
 */
function getVideoId(url) {
    const patterns = [
        /(?:v=|\/)([\w-]{11})(?:\?|&|$)/,
        /^([\w-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Finds the transcript endpoint from the initial YouTube page data.
 * @param {object} data - The ytInitialData JSON object.
 * @returns {object|undefined} The transcript endpoint object or undefined if not found.
 */
function findTranscriptEndpoint(data) {
    if (!data.engagementPanels) return undefined;

    for (const panel of data.engagementPanels) {
        const renderer = panel.engagementPanelSectionListRenderer;
        if (
            renderer?.targetId === "engagement-panel-searchable-transcript" &&
            renderer.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint
        ) {
            return renderer.content.continuationItemRenderer.continuationEndpoint.getTranscriptEndpoint;
        }
    }
    return undefined;
}

/**
 * Fetches the transcript for a YouTube video.
 * @param {string} videoURL The full URL of the YouTube video.
 * @returns {Promise<string>} A promise that resolves to the full transcript text.
 * @throws {Error} Throws an error if the URL is invalid or the transcript cannot be found.
 */
export async function getTranscript(videoURL) {
    if (!videoURL) {
        throw new Error("No URL provided.");
    }

    const videoId = getVideoId(videoURL);
    if (!videoId) {
        throw new Error("Invalid YouTube URL.");
    }

    const watchPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'Accept-Language': 'en-US' },
    });
    const watchPageHtml = await watchPageResponse.text();

    let initialData;
    try {
        const match = watchPageHtml.match(/var ytInitialData = (.*?);<\/script>/);
        if (!match || !match[1]) {
            throw new Error("Could not find ytInitialData. The video may be private, unavailable, or require a login.");
        }
        initialData = JSON.parse(match[1]);
    } catch (e) {
        throw new Error("Failed to parse YouTube page data.");
    }

    const transcriptEndpoint = findTranscriptEndpoint(initialData);
    if (!transcriptEndpoint || !transcriptEndpoint.params) {
        throw new Error("Could not find a transcript for this video.");
    }

    const transcriptResponse = await fetch("https://www.youtube.com/youtubei/v1/get_transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            context: { client: { clientName: "WEB", clientVersion: "2.20240725.01.00" } },
            params: transcriptEndpoint.params,
        }),
    });
    const transcriptData = await transcriptResponse.json();

    if (transcriptData.actions && transcriptData.actions[0]?.updateEngagementPanelAction?.content) {
        const segments = transcriptData.actions[0].updateEngagementPanelAction.content.transcriptRenderer.content.transcriptSearchPanelRenderer.body.transcriptSegmentListRenderer.initialSegments;
        const transcriptText = segments
            .map(segment => {
                const runs = segment.transcriptSegmentRenderer?.snippet?.runs;
                if (!Array.isArray(runs)) return '';
                return runs.map(run => run.text).join('');
            })
            .filter(text => text) // Remove any empty strings
            .join(' ')
            .trim();
        
        return transcriptText || "Transcript is available but empty.";
    } else {
        throw new Error("Failed to extract transcript from the received data.");
    }
}