# YouTube Transcript Fetcher

A lightweight Node.js module to get transcripts from any YouTube video that has one, without needing an official API key.

## Features

- No API keys needed
- Zero external runtime dependencies
- Simple, promise-based API
- Works in Node.js

## Installation

```bash
npm install youtube-transcript-fetch
```

## Usage

The package exports a single asynchronous function `getTranscript`.

```javascript
import { getTranscript } from 'youtube-transcript-fetch';

const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function fetchMyTranscript() {
    try {
        const transcript = await getTranscript(videoUrl);
        console.log(transcript);
        // Expected output: "We're no strangers to love..."
    } catch (error) {
        console.error('Error fetching transcript:', error.message);
    }
}

fetchMyTranscript();
```

## Disclaimer

This package works by scraping the public YouTube website. This might be against YouTube's Terms of Service. Use it responsibly and at your own risk. The package may break if YouTube makes significant changes to its website structure.

## License

This project is licensed under the [MIT License](LICENSE).