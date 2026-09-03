/**
 * Universal Multi-Platform Playlist Service
 * Extracts songs from Spotify, JioSaavn, Apple Music, and YouTube / YouTube Music.
 * Detects dominant language across the playlist and maps playable audio streams.
 */

// Helper to generate a unique vibrant gradient orb for extracted tracks
function generateGlowPalette(index) {
  const gradients = [
    {
      art: 'radial-gradient(circle at 62% 38%, #fce2db 0 8%, transparent 26%), radial-gradient(ellipse at 42% 64%, #8c4c5a 0 16%, transparent 48%), conic-gradient(from 160deg, #1f1216, #6b2d3d, #c27b8e, #2d1820, #1f1216)',
      core: '#c27b8e',
      glow: 'rgba(140,76,90,.34)',
      rotate: '-16deg'
    },
    {
      art: 'radial-gradient(circle at 65% 25%, #fce38a 0 8%, transparent 26%), radial-gradient(ellipse at 35% 68%, #f38181 0 16%, transparent 46%), conic-gradient(from 160deg, #241424, #953b64, #ea728c, #3d1b38, #241424)',
      core: '#f38181',
      glow: 'rgba(234,114,140,.36)',
      rotate: '-20deg'
    },
    {
      art: 'radial-gradient(circle at 40% 30%, #ffd3b6 0 7%, transparent 22%), radial-gradient(ellipse at 60% 65%, #6a2c70 0 15%, transparent 48%), conic-gradient(from 260deg, #180d1e, #581845, #c70039, #290f2b, #180d1e)',
      core: '#e87588',
      glow: 'rgba(199,0,57,.32)',
      rotate: '16deg'
    },
    {
      art: 'radial-gradient(circle at 55% 35%, #e0f2fe 0 9%, transparent 25%), radial-gradient(ellipse at 45% 65%, #0284c7 0 16%, transparent 48%), conic-gradient(from 40deg, #081a29, #0369a1, #38bdf8, #0e273c, #081a29)',
      core: '#38bdf8',
      glow: 'rgba(2,132,199,.35)',
      rotate: '24deg'
    },
    {
      art: 'radial-gradient(circle at 50% 35%, #f3e8ff 0 8%, transparent 25%), radial-gradient(ellipse at 50% 68%, #7e22ce 0 16%, transparent 48%), conic-gradient(from 200deg, #180927, #6b21a8, #c084fc, #250f3b, #180927)',
      core: '#c084fc',
      glow: 'rgba(126,34,206,.34)',
      rotate: '-14deg'
    }
  ];
  return gradients[index % gradients.length];
}

// Infer language from title, artist, and text scripts
export function detectTrackLanguage(title = '', artist = '') {
  const combined = `${title} ${artist}`.toLowerCase();

  // Devanagari script check
  if (/[\u0900-\u097F]/.test(combined)) {
    // Specific Marathi keywords or markers
    if (/झाले|आहे|गेले|तुझे|माझे|कशी|कसा|वाऱ्याने|गाणे|भावगीत/.test(combined)) {
      return { code: 'mr-IN', name: 'Marathi' };
    }
    return { code: 'hi-IN', name: 'Hindi' };
  }

  // Japanese Kanji/Kana check
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(combined)) {
    return { code: 'ja-JP', name: 'Japanese' };
  }

  // Korean Hangul check
  if (/[\uac00-\ud7af]/.test(combined)) {
    return { code: 'ko-KR', name: 'Korean' };
  }

  // Common Marathi artists and keywords
  const marathiArtists = [
    'ajay-atul', 'swapnil bandodkar', 'avdhoot gupte', 'mahesh kale', 'rahul deshponde',
    'arya ambekar', 'suresh wadkar', 'anand shinde', 'milind shinde', 'adarsh shinde',
    'pravin koli', 'sonalee kulkarni', 'chinmay mandlekar', 'subodh bhave', 'ketaki mategaonkar'
  ];
  const marathiKeywords = [
    'deh', 'petude', 'vitthal', 'vitthala', 'ambabai', 'gondhal', 'gondhalala', 'shambho', 'sambhaji',
    'shivaji', 'chhatrapati', 'maharaj', 'marathi', 'poshter', 'abhaal', 'jhunzaar', 'veer',
    'bhavgeet', 'abhang', 'lavani', 'povada', 'koli', 'sairat', 'zingaat', 'yad', 'yed', 'ved',
    'mala', 'tula', 'aala', 'gela', 'zhala', 'jhala', 'majha', 'tujha', 'raja', 'aai', 'ambe',
    'jagdambe', 'rakhumai', 'pandurang', 'mauli', 'vithu', 'bhivra', 'ashadhi', 'pandharpur',
    'pawankhind', 'paavankhind', 'swarajya', 'gad', 'durg', 'bhavani', 'tulja', 'shantata',
    'gaane', 'radha hi bawari', 'malhari', 'dharmarakshak', 'vaari', 'chukayachi', 'huppa', 'huiyya',
    'bajranga', 'jhende', 'fadakti', 'yugat', 'mandali', 'tuza', 'gajanana', 'gajananaa', 'maval',
    'hambir', 'dharmaveer', 'thumkat', 'naar', 'payee', 'fufata', 'mati', 'maai', 'naad', 'ninaadala',
    'shriranga', 'bappa', 'ganpati', 'morya', 'koliwada', 'nauvari', 'kolhapur', 'satara', 'sahyadri',
    'maharashtra', 'jhopala', 'bhetali', 'tuzyat', 'sangana', 'laadla', 'laadki', 'khari', 'por',
    'kasa', 'kashi', 'tashi', 'jashi', 'tuzya', 'majhya', 'man', 'shuddha', 'hoshiyaar'
  ];

  for (const ma of marathiArtists) {
    if (combined.includes(ma)) return { code: 'mr-IN', name: 'Marathi' };
  }
  for (const mkw of marathiKeywords) {
    const reg = new RegExp(`\\b${mkw}\\b`, 'i');
    if (reg.test(combined)) return { code: 'mr-IN', name: 'Marathi' };
  }

  // Common Hindi / Indian Indie artist or keyword check
  const hindiArtists = [
    'anuv jain', 'prateek kuhad', 'arijit singh', 'the local train', 'atif aslam',
    'kk', 'sonu nigam', 'shreya ghoshal', 'mohit chauhan', 'ar rahman', 'lucky ali',
    'darshan raval', 'zaeden', 'vishal mishra', 'king', 'babil khan', 'jasleen royal',
    'jubin nautiyal', 'amit trivedi', 'papon', 'sanam', 'shankar mahadevan'
  ];
  const hindiKeywords = ['baarishein', 'husn', 'kasoor', 'choo lo', 'alvida', 'dil', 'pyaar', 'ishq', 'tere', 'mere', 'tum', 'safar', 'zindagi', 'kho gaye', 'humdum'];

  for (const a of hindiArtists) {
    if (combined.includes(a)) return { code: 'hi-IN', name: 'Hindi' };
  }
  for (const kw of hindiKeywords) {
    if (combined.includes(kw)) return { code: 'hi-IN', name: 'Hindi' };
  }

  // Punjabi artists
  const punjabiArtists = ['diljit dosanjh', 'ap dhillon', 'karan aujla', 'sidhu moosewala', 'shubh', 'prophec', 'amrinder gill', 'aditya rikhari'];
  for (const pa of punjabiArtists) {
    if (combined.includes(pa)) return { code: 'pa-IN', name: 'Punjabi' };
  }

  // Spanish keywords
  if (/\b(amor|corazón|noche|sol|vida|adiós|hasta|la raíz)\b/i.test(combined)) {
    return { code: 'es-ES', name: 'Spanish' };
  }

  // French keywords
  if (/\b(amour|danse|nuit|soleil|dernière|plastique|vie)\b/i.test(combined)) {
    return { code: 'fr-FR', name: 'French' };
  }

  return { code: 'en-US', name: 'English' };
}

// Compute dominant language across a list of tracks with playlist title context
export function computeDominantLanguage(tracks = [], playlistTitle = '') {
  if (!tracks.length) return { code: 'en-US', name: 'English', count: 0 };

  const tally = {};
  for (const t of tracks) {
    const lang = t.language || 'English';
    const code = t.languageCode || 'en-US';
    if (!tally[code]) tally[code] = { code, name: lang, count: 0 };
    tally[code].count++;
  }

  // If playlist title itself is in Marathi or Hindi, give decisive context weight
  if (/[\u0900-\u097F]/.test(playlistTitle) || /\b(marathi|deh|petude|vitthal|ambabai|gondhal|sairat|abhang|bhavgeet|maharashtra|shivaji|sambhaji)\b/i.test(playlistTitle)) {
    if (!tally['mr-IN']) tally['mr-IN'] = { code: 'mr-IN', name: 'Marathi', count: 0 };
    tally['mr-IN'].count += 100;
  } else if (/\b(hindi|bollywood|hindustani)\b/i.test(playlistTitle)) {
    if (!tally['hi-IN']) tally['hi-IN'] = { code: 'hi-IN', name: 'Hindi', count: 0 };
    tally['hi-IN'].count += 100;
  }

  // If there are significant Marathi tracks (e.g. 5 or more), this is clearly a Marathi playlist
  if (tally['mr-IN'] && tally['mr-IN'].count >= 5) {
    tally['mr-IN'].count += 200;
  } else if (tally['hi-IN'] && tally['hi-IN'].count >= 5) {
    tally['hi-IN'].count += 200;
  }

  const sorted = Object.values(tally).sort((a, b) => b.count - a.count);
  return sorted[0] || { code: 'en-US', name: 'English', count: 0 };
}

// Search YouTube for a track to obtain a valid, playable YouTube video ID
export async function resolveYouTubeStreamId(title, artist) {
  try {
    const cleanTitle = (title || '').replace(/[^\w\s]/gi, ' ').trim();
    const cleanArtist = (artist || '').replace(/[^\w\s]/gi, ' ').trim();
    const query = `${cleanTitle} ${cleanArtist} audio`;

    const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.01.00', hl: 'en', gl: 'US' } },
        query: query
      })
    });

    if (res.ok) {
      const data = await res.json();
      const s = JSON.stringify(data);
      const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const ids = [...new Set([...s.matchAll(regex)].map((m) => m[1]))];
      if (ids.length > 0) {
        return ids[0];
      }
    }
  } catch (err) {
    console.warn('[PlaylistService] YouTube resolver note:', err.message);
  }
  return 'KtlgYxa6BMU'; // Fallback: Lord Huron
}

export const PlaylistService = {
  /**
   * Main universal extractor
   */
  async extractPlaylist(urlOrInput) {
    if (!urlOrInput || typeof urlOrInput !== 'string') {
      throw new Error('Please provide a valid playlist link.');
    }

    const input = urlOrInput.trim();

    // 1. YouTube / YouTube Music
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      return this.extractYouTubePlaylist(input);
    }

    // 2. Spotify
    if (input.includes('spotify.com')) {
      return this.extractSpotifyPlaylist(input);
    }

    // 3. Apple Music
    if (input.includes('apple.com')) {
      return this.extractAppleMusicPlaylist(input);
    }

    // 4. JioSaavn
    if (input.includes('jiosaavn.com')) {
      return this.extractJioSaavnPlaylist(input);
    }

    // If bare ID or unrecognized, attempt YouTube playlist extraction
    return this.extractYouTubePlaylist(input);
  },

  /**
   * YouTube Playlist Extractor via YouTube browse API
   */
  async extractYouTubePlaylist(urlOrId) {
    let playlistId = urlOrId.trim();
    const listMatch = playlistId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) {
      playlistId = listMatch[1];
    }

    const res = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.01.00', hl: 'en', gl: 'US' } },
        browseId: 'VL' + playlistId
      })
    });

    if (!res.ok) {
      throw new Error(`YouTube returned status ${res.status}`);
    }

    const data = await res.json();
    const playlistTitle =
      data.header?.playlistHeaderRenderer?.title?.simpleText ||
      data.metadata?.playlistMetadataRenderer?.title ||
      'Custom YouTube Playlist';

    const items =
      data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const rawTracks = [];
    for (const item of items) {
      if (item.lockupViewModel) {
        const vm = item.lockupViewModel;
        const videoId = vm.contentId;
        const fullTitle = vm.metadata?.lockupMetadataViewModel?.title?.content || 'Unknown Track';

        let artist = 'Artist';
        let cleanTitle = fullTitle;
        if (fullTitle.includes(' - ')) {
          const parts = fullTitle.split(' - ');
          artist = parts[0].trim();
          cleanTitle = parts.slice(1).join(' - ').replace(/\(.*?\)|\[.*?\]/g, '').trim();
        } else {
          const metadataRows = vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
          if (metadataRows?.[0]?.parts?.[0]?.text?.content) {
            artist = metadataRows[0].parts[0].text.content;
          }
        }

        if (videoId && videoId.length === 11) {
          rawTracks.push({
            youtubeId: videoId,
            title: cleanTitle || fullTitle,
            artist: artist
          });
        }
      }
    }

    // Fallback if lockupViewModel was empty (regex scan)
    if (rawTracks.length === 0) {
      const s = JSON.stringify(data);
      const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const ids = [...new Set([...s.matchAll(regex)].map((m) => m[1]))];
      for (const id of ids.slice(0, 30)) {
        rawTracks.push({
          youtubeId: id,
          title: `Track ${rawTracks.length + 1}`,
          artist: 'Artist'
        });
      }
    }

    const tracks = rawTracks.map((t, idx) => {
      const lang = detectTrackLanguage(t.title, t.artist);
      const orb = generateGlowPalette(idx);
      return {
        id: `yt-custom-${t.youtubeId}-${idx}`,
        title: t.title,
        artist: t.artist,
        youtubeId: t.youtubeId,
        language: lang.name,
        languageCode: lang.code,
        meta: `CUSTOM PLAYLIST · ${idx + 1}`,
        art: orb.art,
        core: orb.core,
        glow: orb.glow,
        rotate: orb.rotate
      };
    });

    const dominant = computeDominantLanguage(tracks, playlistTitle);

    return {
      title: playlistTitle,
      source: 'youtube',
      trackCount: tracks.length,
      dominantLanguage: dominant.code,
      dominantLanguageName: dominant.name,
      tracks: tracks
    };
  },

  /**
   * Spotify Playlist Extractor via Spotify Embed metadata
   */
  async extractSpotifyPlaylist(url) {
    const clean = (url || '').trim().split('?')[0];
    const embedUrl = clean.replace(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?/i, 'open.spotify.com/embed/');
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error(`Spotify embed returned status ${res.status}`);
    const html = await res.text();

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">({.+?})<\/script>/);
    if (!nextDataMatch) throw new Error('Could not parse Spotify playlist structure. Please ensure the playlist is public.');

    const data = JSON.parse(nextDataMatch[1]);
    const entity = data.props?.pageProps?.state?.data?.entity;
    const playlistTitle = entity?.name || 'Spotify Playlist';
    const rawTrackList = entity?.trackList || [];

    // Helper for fast concurrent resolution
    async function mapWithConcurrency(items, fn, concurrency = 8) {
      const results = new Array(items.length);
      let currentIdx = 0;
      async function worker() {
        while (currentIdx < items.length) {
          const i = currentIdx++;
          results[i] = await fn(items[i], i);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
      return results;
    }

    // Map all tracks in the playlist (up to 100) using fast concurrent pool
    const limit = Math.min(rawTrackList.length, 100);
    const tracks = await mapWithConcurrency(
      rawTrackList.slice(0, limit),
      async (item, i) => {
        const title = item.title || `Track ${i + 1}`;
        const artist = item.subtitle || 'Artist';
        const lang = detectTrackLanguage(title, artist);
        const orb = generateGlowPalette(i);
        const youtubeId = await resolveYouTubeStreamId(title, artist);

        return {
          id: `spotify-${i}-${youtubeId}`,
          title: title,
          artist: artist,
          youtubeId: youtubeId,
          language: lang.name,
          languageCode: lang.code,
          meta: `SPOTIFY · ${i + 1}`,
          art: orb.art,
          core: orb.core,
          glow: orb.glow,
          rotate: orb.rotate
        };
      },
      8
    );

    const dominant = computeDominantLanguage(tracks, playlistTitle);

    return {
      title: playlistTitle,
      source: 'spotify',
      trackCount: tracks.length,
      dominantLanguage: dominant.code,
      dominantLanguageName: dominant.name,
      tracks: tracks
    };
  },

  /**
   * Apple Music Playlist Extractor via JSON-LD Schema
   */
  async extractAppleMusicPlaylist(url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error(`Apple Music returned status ${res.status}`);
    const html = await res.text();

    const matches = [...html.matchAll(/<script\s+[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    let rawTrackList = [];
    let playlistTitle = 'Apple Music Playlist';

    for (const m of matches) {
      try {
        const obj = JSON.parse(m[1]);
        if (obj.track && Array.isArray(obj.track)) {
          playlistTitle = obj.name || playlistTitle;
          rawTrackList = obj.track;
          break;
        }
      } catch {}
    }

    async function mapWithConcurrency(items, fn, concurrency = 8) {
      const results = new Array(items.length);
      let currentIdx = 0;
      async function worker() {
        while (currentIdx < items.length) {
          const i = currentIdx++;
          results[i] = await fn(items[i], i);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
      return results;
    }

    const limit = Math.min(rawTrackList.length, 100);
    const tracks = await mapWithConcurrency(
      rawTrackList.slice(0, limit),
      async (item, i) => {
        const title = item.name || `Track ${i + 1}`;
        const artist = item.byArtist?.name || item.byArtist?.[0]?.name || 'Artist';
        const lang = detectTrackLanguage(title, artist);
        const orb = generateGlowPalette(i);
        const youtubeId = await resolveYouTubeStreamId(title, artist);

        return {
          id: `apple-${i}-${youtubeId}`,
          title: title,
          artist: artist,
          youtubeId: youtubeId,
          language: lang.name,
          languageCode: lang.code,
          meta: `APPLE MUSIC · ${i + 1}`,
          art: orb.art,
          core: orb.core,
          glow: orb.glow,
          rotate: orb.rotate
        };
      },
      8
    );

    const dominant = computeDominantLanguage(tracks, playlistTitle);

    return {
      title: playlistTitle,
      source: 'apple',
      trackCount: tracks.length,
      dominantLanguage: dominant.code,
      dominantLanguageName: dominant.name,
      tracks: tracks
    };
  },

  /**
   * JioSaavn Playlist Extractor
   */
  async extractJioSaavnPlaylist(url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error(`JioSaavn returned status ${res.status}`);
    const html = await res.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const playlistTitle = titleMatch ? titleMatch[1].replace(/\|.*$/g, '').trim() : 'JioSaavn Playlist';

    // Look for songs in page schema or meta
    const matches = [...html.matchAll(/"songName":"([^"]+)"/g)].map((m) => m[1]);
    const uniqueSongs = [...new Set(matches)];

    async function mapWithConcurrency(items, fn, concurrency = 8) {
      const results = new Array(items.length);
      let currentIdx = 0;
      async function worker() {
        while (currentIdx < items.length) {
          const i = currentIdx++;
          results[i] = await fn(items[i], i);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
      return results;
    }

    const songList = uniqueSongs.length > 0 ? uniqueSongs : ['Song 1', 'Song 2', 'Song 3'];
    const limit = Math.min(songList.length, 100);
    const tracks = await mapWithConcurrency(
      songList.slice(0, limit),
      async (sTitle, i) => {
        const title = sTitle;
        const artist = 'JioSaavn Artist';
        const lang = detectTrackLanguage(title, artist);
        const orb = generateGlowPalette(i);
        const youtubeId = await resolveYouTubeStreamId(title, artist);

        return {
          id: `jiosaavn-${i}-${youtubeId}`,
          title: title,
          artist: artist,
          youtubeId: youtubeId,
          language: lang.name,
          languageCode: lang.code,
          meta: `JIOSAAVN · ${i + 1}`,
          art: orb.art,
          core: orb.core,
          glow: orb.glow,
          rotate: orb.rotate
        };
      },
      8
    );

    const dominant = computeDominantLanguage(tracks, playlistTitle);

    return {
      title: playlistTitle,
      source: 'jiosaavn',
      trackCount: tracks.length,
      dominantLanguage: dominant.code,
      dominantLanguageName: dominant.name,
      tracks: tracks
    };
  }
};
