import { MUSIC_CATALOG } from '../config/musicCatalog.js';

export class MusicService {
  static catalog = [...MUSIC_CATALOG];
  static sessionSelectedTrack = null;
  static sessionStartedAt = new Date();

  // Initialize and choose one random track at startup
  static {
    this.sessionSelectedTrack = this.pickRandomTrack();
  }

  /**
   * Pick any track at random from the catalog
   */
  static pickRandomTrack() {
    if (!this.catalog || this.catalog.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.catalog.length);
    return this.catalog[randomIndex];
  }

  /**
   * Get the track chosen at random on project run
   */
  static getInitialSelectedTrack() {
    if (!this.sessionSelectedTrack) {
      this.sessionSelectedTrack = this.pickRandomTrack();
    }
    return this.sessionSelectedTrack;
  }

  /**
   * Get all tracks in the catalog
   */
  static getAllTracks() {
    return this.catalog;
  }

  /**
   * Get a session playlist starting with the randomly chosen track,
   * followed by all other tracks in the catalog in a varied order
   */
  static getSessionPlaylist() {
    const initialTrack = this.getInitialSelectedTrack();
    const otherTracks = this.catalog.filter((t) => t.id !== initialTrack.id);
    
    // Shuffle the remaining tracks for fresh variety across languages
    const shuffledOthers = [...otherTracks].sort(() => Math.random() - 0.5);

    return [initialTrack, ...shuffledOthers];
  }

  /**
   * Get tracks by language code or language name
   */
  static getTracksByLanguage(languageQuery) {
    if (!languageQuery) return this.catalog;
    const query = languageQuery.toLowerCase().trim();
    return this.catalog.filter(
      (t) =>
        t.language.toLowerCase().includes(query) ||
        t.languageCode.toLowerCase().includes(query)
    );
  }

  /**
   * Get list of unique languages present in the catalog
   */
  static getLanguages() {
    const langMap = {};
    for (const track of this.catalog) {
      if (!langMap[track.language]) {
        langMap[track.language] = {
          language: track.language,
          code: track.languageCode,
          count: 0,
          sampleTracks: []
        };
      }
      langMap[track.language].count += 1;
      langMap[track.language].sampleTracks.push(track.title);
    }
    return Object.values(langMap);
  }
}
