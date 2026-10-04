import { useState, useEffect, useRef, useCallback } from 'react';
import { searchService } from '../../services/searchService';
import { playlistCurationService } from '../../services/playlistCurationService';
import './SongInput.css';

export function SongInput({
  variant = 'compact', // 'hero' | 'compact'
  onImportPlaylist,
  onPlayNext,
  onAddToQueue,
  onPlayNow,
  isPlayerScreen = false,
  disabled = false,
  placeholder
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExtractingLink, setIsExtractingLink] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pastedSingleTrack, setPastedSingleTrack] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const isUrl = useCallback((text) => {
    if (!text) return false;
    const trimmed = text.trim();
    return (
      /^https?:\/\//i.test(trimmed) ||
      trimmed.includes('spotify.com') ||
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      trimmed.includes('apple.com') ||
      trimmed.includes('jiosaavn.com') ||
      trimmed.includes('saavn.com')
    );
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search when query changes
  useEffect(() => {
    const trimmed = query.trim();

    if (isUrl(trimmed) || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      if (trimmed.length === 0) setIsDropdownOpen(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsSearching(true);
      setIsDropdownOpen(true);

      const items = await searchService.search(trimmed, {
        signal: controller.signal,
        limit: 8
      });

      if (items !== null) {
        setResults(items);
        setIsSearching(false);
        setSelectedIndex(-1);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [query, isUrl]);

  const handleLinkSubmit = async (targetUrl) => {
    const url = (targetUrl || query).trim();
    if (!url) return;

    setIsExtractingLink(true);
    try {
      const data = await playlistCurationService.fetchPlaylist(url);
      if (data?.isSingleSong && data.tracks?.[0]) {
        const single = data.tracks[0];
        if (isPlayerScreen) {
          setPastedSingleTrack(single);
          setIsDropdownOpen(true);
        } else {
          onPlayNow ? onPlayNow(single) : onImportPlaylist?.(url);
          setQuery('');
        }
      } else {
        onImportPlaylist?.(url);
        setQuery('');
        setIsDropdownOpen(false);
      }
    } catch {
      onImportPlaylist?.(url);
      setQuery('');
      setIsDropdownOpen(false);
    } finally {
      setIsExtractingLink(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (isUrl(query)) {
      handleLinkSubmit(query);
    } else {
      const target = results[selectedIndex >= 0 ? selectedIndex : 0];
      if (target) {
        if (isPlayerScreen) {
          handleAction('next', target);
        } else {
          handleAction('now', target);
        }
      }
    }
  };

  const handleAction = (actionType, track) => {
    if (!track) return;
    if (actionType === 'next') {
      onPlayNext?.(track);
    } else if (actionType === 'queue') {
      onAddToQueue?.(track);
    } else if (actionType === 'now') {
      onPlayNow?.(track);
    }

    setQuery('');
    setResults([]);
    setPastedSingleTrack(null);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  if (variant === 'hero') {
    // Exact original landing screen styling
    return (
      <div ref={containerRef} className="hero-song-input-container">
        <form className="import-form" onSubmit={handleFormSubmit}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="link-icon">
            <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 7 20l1.1-1.1" />
          </svg>
          <label className="sr-only" htmlFor="landingPlaylistUrl">
            Playlist or song link, or search song
          </label>
          <input
            ref={inputRef}
            id="landingPlaylistUrl"
            type="text"
            placeholder={placeholder || 'Paste playlist / song link, or search song'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (pastedSingleTrack) setPastedSingleTrack(null);
            }}
            onFocus={() => {
              if (results.length > 0) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            required
            autoFocus
            disabled={disabled || isExtractingLink}
            autoComplete="off"
            spellCheck="false"
          />
          <button className="tune-submit-btn" type="submit" disabled={isExtractingLink}>
            <span>{isExtractingLink ? 'Tuning...' : 'Tune in'}</span>
            <span className="tune-arrow">→</span>
          </button>
        </form>

        {/* Dropdown for search results on landing */}
        {isDropdownOpen && (isSearching || results.length > 0 || (query.trim().length >= 2 && !isUrl(query))) && (
          <div className="song-dropdown-minimal hero-dropdown">
            {isSearching && (
              <div className="dropdown-searching-state" aria-label="Searching songs">
                <span className="dropdown-circular-loader" aria-hidden="true" />
              </div>
            )}

            {!isSearching && results.length === 0 && query.trim().length >= 2 && (
              <div className="dropdown-empty-state">
                <span className="dropdown-empty-glyph" aria-hidden="true">✧</span>
                <span>No matching songs found for "{query}"</span>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="dropdown-header-bar">
                  <span className="dropdown-header-label">Search Results</span>
                  <span className="dropdown-header-count">{results.length} found</span>
                </div>
                <ul className="dropdown-results-list" role="listbox">
                  {results.map((track, idx) => (
                    <li
                      key={track.id || `res-${idx}`}
                      role="option"
                      aria-selected={selectedIndex === idx}
                      className={`dropdown-result-item ${selectedIndex === idx ? 'is-selected' : ''}`}
                      onClick={() => handleAction('now', track)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="dropdown-thumb-wrap">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt="" className="dropdown-track-thumb" loading="lazy" />
                        ) : (
                          <div className="dropdown-thumb-placeholder">♪</div>
                        )}
                        <span className="dropdown-thumb-glow" aria-hidden="true" />
                      </div>
                      <div className="dropdown-track-info">
                        <div className="dropdown-track-title" title={track.title}>{track.title}</div>
                        <div className="dropdown-track-artist" title={track.artist}>{track.artist}</div>
                        {(track.subtitle || (track.channel && track.channel !== track.artist) || track.duration) && (
                          <div className="dropdown-track-meta">
                            {track.subtitle && <span className="track-subtitle">{track.subtitle}</span>}
                            {track.channel && track.channel !== track.artist && (
                              <span className="track-channel">{track.channel}</span>
                            )}
                            {track.duration && <span className="track-dur">{track.duration}</span>}
                          </div>
                        )}
                      </div>
                      <span className="dropdown-action-minimal" aria-label="Play">
                        <svg viewBox="0 0 24 24" className="dropdown-play-svg" aria-hidden="true">
                          <path d="M7 4.5v15a1 1 0 0 0 1.53.84l12-7.5a1 1 0 0 0 0-1.68l-12-7.5A1 1 0 0 0 7 4.5z" />
                        </svg>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="dropdown-footer-hints">
                  <span>Press Enter or click to play</span>
                  <span className="footer-keys">↑↓ Navigate · ESC Close</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Player screen quick-search styling (matching provided template)
  return (
    <div ref={containerRef} className="quick-search nav-song-input-container" id="quickSearch">
      <form className="quick-search-field" onSubmit={handleFormSubmit}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="quick-search-icon">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
        <label className="sr-only" htmlFor="quickSearchInput">
          Search songs, artists, and playlists
        </label>
        <input
          id="quickSearchInput"
          ref={inputRef}
          type="search"
          placeholder={placeholder || 'Search radio'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (pastedSingleTrack) setPastedSingleTrack(null);
          }}
          onFocus={() => {
            if (results.length > 0 || pastedSingleTrack) {
              setIsDropdownOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search radio"
          disabled={disabled || isExtractingLink}
          autoComplete="off"
          spellCheck="false"
        />
        {isExtractingLink && (
          <span className="dropdown-circular-loader" aria-hidden="true" />
        )}
      </form>

      {/* Quick search dropdown for results in player */}
      {isDropdownOpen && (isSearching || results.length > 0 || pastedSingleTrack || (query.trim().length >= 2 && !isUrl(query))) && (
        <div className="quick-search-results open" id="quickSearchResults" role="listbox">
          {isSearching && (
            <div className="quick-search-empty" aria-label="Searching songs">
              <span className="dropdown-circular-loader" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
              Searching radio...
            </div>
          )}

          {!isSearching && results.length === 0 && !pastedSingleTrack && query.trim().length >= 2 && (
            <div className="quick-search-empty">
              No signals found
            </div>
          )}

          {pastedSingleTrack && (
            <button
              type="button"
              className="quick-search-row"
              role="option"
              onClick={() => handleAction('now', pastedSingleTrack)}
            >
              {pastedSingleTrack.thumbnail ? (
                <img
                  src={pastedSingleTrack.thumbnail}
                  alt=""
                />
              ) : (
                <div className="quick-thumb-placeholder">♪</div>
              )}
              <span>
                {pastedSingleTrack.title}
                <small>{pastedSingleTrack.artist || 'DIRECT SONG'} · READY</small>
              </span>
            </button>
          )}

          {results.length > 0 && results.slice(0, 8).map((track, idx) => (
            <button
              key={track.id || `quick-res-${idx}`}
              type="button"
              role="option"
              aria-selected={selectedIndex === idx}
              className={`quick-search-row ${selectedIndex === idx ? 'is-selected' : ''}`}
              onClick={() => handleAction('now', track)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {track.thumbnail ? (
                <img
                  src={track.thumbnail}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="quick-thumb-placeholder">♪</div>
              )}
              <span>
                {track.title}
                <small>
                  {track.kind ? `${track.kind} · ` : 'SONG · '}
                  {track.artist || 'Artist'}
                  {track.duration ? ` · ${track.duration}` : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
