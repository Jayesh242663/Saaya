import { MusicService } from '../services/musicService.js';
import { PlaylistService } from '../services/playlistService.js';

export function handleMusicRequest(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  res.setHeader('Content-Type', 'application/json');

  // POST /api/playlist/extract - Extract tracks from Spotify, JioSaavn, Apple Music, or YouTube
  if (req.method === 'POST' && (pathname === '/api/playlist/extract' || pathname === '/api/playlist/extract/')) {
    const processExtraction = async (bodyPayload) => {
      try {
        const parsed = typeof bodyPayload === 'string' ? JSON.parse(bodyPayload || '{}') : (bodyPayload || {});
        const url = parsed.url;
        if (!url || typeof url !== 'string') {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'INVALID_INPUT', message: 'Please provide a playlist URL.' }));
          return;
        }

        const result = await PlaylistService.extractPlaylist(url);
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            ...result
          })
        );
      } catch (err) {
        console.error('[Playlist Extract Error]', err);
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            error: 'EXTRACTION_FAILED',
            message: err.message || 'Failed to extract playlist.'
          })
        );
      }
    };

    // If body is already parsed by Vercel serverless environment
    if (req.body) {
      processExtraction(req.body);
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 32768) {
        res.statusCode = 413;
        res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds limit' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      processExtraction(body);
    });
    return;
  }

  // GET /api/tracks/search?q=...&limit=... - Search songs dynamically
  if (req.method === 'GET' && (pathname === '/api/tracks/search' || pathname === '/api/tracks/search/')) {
    const query = searchParams.get('q') || '';
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    if (!query.trim()) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'INVALID_QUERY', message: 'Query parameter q is required.' }));
      return;
    }

    PlaylistService.searchSongs(query.trim(), limit)
      .then((results) => {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            count: results.length,
            results
          })
        );
      })
      .catch((err) => {
        console.error('[Track Search Error]', err);
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            error: 'SEARCH_FAILED',
            message: err.message || 'Search failed.'
          })
        );
      });
    return;
  }

  // GET /api/tracks/random - Pick a fresh random track
  if (req.method === 'GET' && (pathname === '/api/tracks/random' || pathname === '/api/tracks/random/')) {
    const randomTrack = MusicService.pickRandomTrack();
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        track: randomTrack
      })
    );
    return;
  }

  // GET /api/tracks/initial or /api/tracks/session - Get the track selected at backend project run
  if (
    req.method === 'GET' &&
    (pathname === '/api/tracks/initial' || pathname === '/api/tracks/session')
  ) {
    const initialTrack = MusicService.getInitialSelectedTrack();
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        initialTrack: initialTrack,
        sessionStartedAt: MusicService.sessionStartedAt
      })
    );
    return;
  }

  // GET /api/tracks/languages - Get supported music languages
  if (req.method === 'GET' && (pathname === '/api/tracks/languages' || pathname === '/api/tracks/languages/')) {
    const languages = MusicService.getLanguages();
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        languages: languages,
        totalTracks: MusicService.getAllTracks().length
      })
    );
    return;
  }

  // GET /api/tracks - Get all tracks (or filtered by language, ordered with the session's random pick first)
  if (req.method === 'GET' && (pathname === '/api/tracks' || pathname === '/api/tracks/')) {
    const lang = searchParams.get('lang');
    const tracks = lang ? MusicService.getTracksByLanguage(lang) : MusicService.getSessionPlaylist();
    const initialTrack = MusicService.getInitialSelectedTrack();

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        initialSelectedTrack: initialTrack,
        totalTracks: tracks.length,
        tracks: tracks
      })
    );
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Music endpoint not found.' }));
}
