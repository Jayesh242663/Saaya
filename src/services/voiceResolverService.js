/**
 * SAAYA Smart Voice Resolver & Artist Gender Classification Service
 * Automatically chooses the ideal DJ Voice:
 * - Marathi or Hindi -> Meher
 * - English playlist with majority Male artists -> Blake
 * - English playlist with majority Female artists -> Sarah
 */

// Curated artist gender knowledge base
const KNOWN_ARTISTS = {
  // Female artists
  'lana del rey': 'female',
  'taylor swift': 'female',
  'billie eilish': 'female',
  'adele': 'female',
  'olivia rodrigo': 'female',
  'phoebe bridgers': 'female',
  'dua lipa': 'female',
  'lorde': 'female',
  'mitski': 'female',
  'clairo': 'female',
  'boygenius': 'female',
  'hania rani': 'female',
  'beabadoobee': 'female',
  'gracie abrams': 'female',
  'sabrina carpenter': 'female',
  'sza': 'female',
  'ariana grande': 'female',
  'beyonce': 'female',
  'beyoncé': 'female',
  'rihanna': 'female',
  'alicia keys': 'female',
  'amy winehouse': 'female',
  'carly rae jepsen': 'female',
  'charli xcx': 'female',
  'florence + the machine': 'female',
  'florence and the machine': 'female',
  'kacey musgraves': 'female',
  'kali uchis': 'female',
  'kesha': 'female',
  'maggie rogers': 'female',
  'marina': 'female',
  'rosalia': 'female',
  'rosalía': 'female',
  'shakira': 'female',
  'sigrid': 'female',
  'stevie nicks': 'female',
  'whitney houston': 'female',
  'norah jones': 'female',
  'kate bush': 'female',
  'fiona apple': 'female',
  'lucy dacus': 'female',
  'julien baker': 'female',
  'natalia lafourcade': 'female',
  'iu': 'female',
  'chappell roan': 'female',
  'shreya ghoshal': 'female',
  'sunidhi chauhan': 'female',
  'alka yagnik': 'female',
  'lata mangeshkar': 'female',
  'asha bhosle': 'female',
  'sonalee kulkarni': 'female',

  // Male artists
  'lord huron': 'male',
  'tom odell': 'male',
  'tycho': 'male',
  'kavinsky': 'male',
  'cigarettes after sex': 'male',
  'the xx': 'male',
  'm83': 'male',
  'the weeknd': 'male',
  'post malone': 'male',
  'frank sinatra': 'male',
  'antônio carlos jobim': 'male',
  'ed sheeran': 'male',
  'hozier': 'male',
  'bon iver': 'male',
  'joji': 'male',
  'mac demarco': 'male',
  'sufjan stevens': 'male',
  'noah kahan': 'male',
  'khalid': 'male',
  'harry styles': 'male',
  'bruno mars': 'male',
  'justin bieber': 'male',
  'shawn mendes': 'male',
  'charlie puth': 'male',
  'drake': 'male',
  'travis scott': 'male',
  'coldplay': 'male',
  'radiohead': 'male',
  'arctic monkeys': 'male',
  'the 1975': 'male',
  'deftones': 'male',
  'nirvana': 'male',
  'fleetwood mac': 'female', // mixed, but Stevie/Christine prominent
  'queen': 'male',
  'pink floyd': 'male',
  'the beatles': 'male',
  'david bowie': 'male',
  'elton john': 'male',
  'prince': 'male',
  'michael jackson': 'male',
  'kendrick lamar': 'male',
  'frank ocean': 'male',
  'steve lacy': 'male',
  'daniel caesar': 'male',
  'sam smith': 'male',
  'john mayer': 'male',
  'abdul hannan': 'male',
  'rovalio': 'male',
  'rodrigo amarante': 'male',
  'ajay-atul': 'male',
  'swapnil bandodkar': 'male',
  'anand shinde': 'male',
  'avdhoot gupte': 'male',
  'mahesh kale': 'male',
  'vishal dadlani': 'male',
  'arijit singh': 'male',
  'prateek kuhad': 'male',
  'anuv jain': 'male',
  'atif aslam': 'male',
  'kishore kumar': 'male',
  'mohammed rafi': 'male'
};

const FEMALE_FIRST_NAMES = new Set([
  'lana', 'taylor', 'billie', 'adele', 'olivia', 'phoebe', 'dua', 'ella', 'emma',
  'hannah', 'lily', 'maya', 'mia', 'chloe', 'zoe', 'grace', 'nora', 'eva', 'sophia',
  'maria', 'laura', 'sarah', 'claire', 'lucy', 'julien', 'alicia', 'amy', 'ariana',
  'carly', 'charli', 'florence', 'kacey', 'kali', 'kesha', 'maggie', 'marina',
  'shakira', 'sigrid', 'stevie', 'whitney', 'norah', 'fiona', 'chappell', 'shreya',
  'sunidhi', 'alka', 'lata', 'asha', 'sonalee'
]);

const MALE_FIRST_NAMES = new Set([
  'ben', 'tom', 'scott', 'frank', 'john', 'james', 'david', 'michael', 'chris',
  'alex', 'sam', 'jack', 'daniel', 'matthew', 'luke', 'ryan', 'ed', 'george',
  'paul', 'brian', 'harry', 'zayn', 'liam', 'louis', 'niall', 'bruno', 'justin',
  'shawn', 'charlie', 'drake', 'travis', 'abel', 'hozier', 'joji', 'mac', 'sufjan',
  'noah', 'khalid', 'elton', 'prince', 'kendrick', 'steve', 'arijit', 'prateek',
  'anuv', 'atif', 'kishore', 'swapnil', 'anand', 'avdhoot', 'mahesh', 'vishal'
]);

/**
 * Infer artist gender
 */
export function classifyArtistGender(artistName) {
  if (!artistName) return 'unknown';
  const clean = artistName.trim().toLowerCase();

  // 1. Direct dictionary match
  if (KNOWN_ARTISTS[clean]) {
    return KNOWN_ARTISTS[clean];
  }

  // 2. Check if dictionary contains substring
  for (const [known, gender] of Object.entries(KNOWN_ARTISTS)) {
    if (clean.includes(known) || known.includes(clean)) {
      return gender;
    }
  }

  // 3. First name heuristic
  const firstName = clean.split(/[\s,.-]+/)[0];
  if (FEMALE_FIRST_NAMES.has(firstName)) return 'female';
  if (MALE_FIRST_NAMES.has(firstName)) return 'male';

  return 'unknown';
}

export const voiceResolverService = {
  /**
   * Automatically resolves the DJ voice:
   * - Marathi or Hindi -> Meher
   * - English playlist with majority Male artists -> Blake
   * - English playlist with majority Female artists -> Sarah
   */
  resolveAutoVoice(tracks = [], dominantLanguage = 'en-US') {
    const lang = (dominantLanguage || '').toLowerCase();

    // Marathi or Hindi always selects Meher
    if (lang.includes('mr') || lang.includes('marathi') || lang.includes('hi') || lang.includes('hindi')) {
      return 'Meher';
    }

    // English (or other Western languages)
    let femaleVotes = 0;
    let maleVotes = 0;

    const trackList = Array.isArray(tracks) ? tracks : [];
    for (const t of trackList) {
      const gender = classifyArtistGender(t.artist || '');
      if (gender === 'female') {
        femaleVotes++;
      } else if (gender === 'male') {
        maleVotes++;
      }
    }

    // If more female artists, pick Sarah; if more or equal male artists, pick Blake
    if (femaleVotes > maleVotes) {
      return 'Sarah';
    } else {
      return 'Blake';
    }
  },

  /**
   * Resolves the voice respecting user preference (Auto vs manual selection)
   */
  resolveVoice(preferredVoiceId, tracks = [], dominantLanguage = 'en-US') {
    if (!preferredVoiceId || preferredVoiceId.toLowerCase() === 'auto') {
      return this.resolveAutoVoice(tracks, dominantLanguage);
    }
    return preferredVoiceId;
  }
};
