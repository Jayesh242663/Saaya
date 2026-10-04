/**
 * Client service for searching songs dynamically
 */

const searchCache = new Map();
const MAX_CACHE_SIZE = 40;

export const searchService = {
  /**
   * Search songs by query
   * @param {string} query
   * @param {Object} options
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.limit]
   */
  async search(query, { signal, limit = 10 } = {}) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      return [];
    }

    const cacheKey = `${cleanQuery.toLowerCase()}_${limit}`;
    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey);
    }

    try {
      const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(cleanQuery)}&limit=${limit}`, {
        signal
      });

      if (!res.ok) {
        throw new Error(`Search failed with status ${res.status}`);
      }

      const data = await res.json();
      const rawResults = Array.isArray(data.results) ? data.results : [];
      const results = rawResults.map((t) => {
        let title = t.title || '';
        let artist = t.artist || '';
        let subtitle = t.subtitle || '';
        let channel = t.channel || '';

        // Extra client-side safeguard if title contains raw pipe clutter
        if (title.includes('|')) {
          const parts = title.split('|').map((s) => s.trim()).filter(Boolean);
          title = parts[0]
            .replace(/\s*[\(\[](?:official|lyrics|with lyrics|audio|video|4k|hd|remastered)[^\]\)]*[\]\)]/gi, '')
            .replace(/\bwith lyrics\b/gi, '')
            .trim();
          if (parts.length > 1 && (!artist || artist === 'Artist' || artist === channel)) {
            const valid = parts.slice(1).filter((p) => !/(?:hindi|songs?|video|audio|lyrics|quality|hd|4k)/i.test(p));
            if (valid.length > 0) artist = valid.join(' · ');
          }
        }

        return { ...t, title, artist, subtitle, channel };
      });

      // Cache result
      if (searchCache.size >= MAX_CACHE_SIZE) {
        const firstKey = searchCache.keys().next().value;
        searchCache.delete(firstKey);
      }
      searchCache.set(cacheKey, results);

      return results;
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request cancelled by user typing faster
        return null;
      }
      console.warn('[searchService] Search error:', err.message);
      return [];
    }
  },

  clearCache() {
    searchCache.clear();
  }
};
