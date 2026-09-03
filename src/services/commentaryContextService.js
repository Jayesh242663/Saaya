/**
 * SAAYA Commentary Context & Genre Intelligence Service
 * Maps musical textures, genre dynamics, 24-hour city atmospheres,
 * and artist lore for authentic, time-dynamic radio broadcasts.
 */

export const GENRE_PROFILES = {
  'dream pop': {
    tags: ['reverb-drenched guitars', 'hazy synths', 'drifting vocals'],
    mood: 'ethereal and nostalgic',
    descriptor: 'dream pop tapestry',
    vibe: 'floating through soft memories'
  },
  'city pop': {
    tags: ['crisp basslines', 'brass horn sections', 'neon nostalgia', 'shinjuku driving groove'],
    mood: 'vibrant, groovy, and bittersweet',
    descriptor: 'classic Japanese city pop soundscape',
    vibe: 'cruising beneath skyline lights'
  },
  'hindi indie': {
    tags: ['poetic lyricism', 'acoustic strumming', 'rain-soaked windowpanes', 'warm heartfelt emotion'],
    mood: 'soulful, tender, and contemplative',
    descriptor: 'intimate Hindi indie acoustic melody',
    vibe: 'warm chai and heartfelt confessions'
  },
  'slowcore': {
    tags: ['deliberate slow tempo', 'whispered confession', 'room reverb'],
    mood: 'haunting, intimate, and raw',
    descriptor: 'slowcore lullaby',
    vibe: 'lying awake in the quiet stillness'
  },
  'french chanson': {
    tags: ['parisian cobblestones', 'accordion swells', 'cinematic melancholy'],
    mood: 'dramatic, romantic, and nocturnal',
    descriptor: 'French chanson noir',
    vibe: 'footsteps echoing through damp streets'
  },
  'french synthpop': {
    tags: ['analog synths', 'youthful duets', 'retro tape warmth'],
    mood: 'whimsical, breezy, and warm',
    descriptor: 'French electro-pop dream',
    vibe: 'a youthful romance frozen in polaroid hues'
  },
  'k-indie': {
    tags: ['gentle acoustic fingerpicking', 'lofi beat', 'subtle r&b phrasing'],
    mood: 'soothing, lonely, and comforting',
    descriptor: 'K-indie nocturne',
    vibe: 'the quiet glow of a screen and soft thoughts'
  },
  'folk latino': {
    tags: ['wooden percussion', 'huapango guitar melodies', 'ancestral roots'],
    mood: 'grounded, warm, and poetic',
    descriptor: 'Latin folk heartbeat',
    vibe: 'remembering where you came from as time passes'
  },
  'bhavgeet': {
    tags: ['devotional emotion', 'classical flute', 'timeless Marathi poetry'],
    mood: 'deeply evocative, sacred, and serene',
    descriptor: 'Marathi bhavgeet harmony',
    vibe: 'devotion echoing across quiet balconies'
  },
  'ambient electronic': {
    tags: ['panoramic synthesizer landscapes', 'tape delay', 'weightless rhythm'],
    mood: 'expansive, tranquil, and cinematic',
    descriptor: 'ambient electronic odyssey',
    vibe: 'watching the city skyline glow like circuit boards'
  },
  'indie rock': {
    tags: ['raw guitar riffs', 'emotive vocals', 'driving rhythm'],
    mood: 'urgent, emotional, and cathartic',
    descriptor: 'indie rock anthem',
    vibe: 'racing thoughts finding release'
  },
  'urdu indie': {
    tags: ['melodic guitar arpeggios', 'poetic Urdu ghazal phrasing', 'intimate bedroom production'],
    mood: 'melancholic, tender, and deeply romantic',
    descriptor: 'Urdu acoustic ballad',
    vibe: 'late night conversations in the quiet of Lahore'
  },
  'punjabi soul': {
    tags: ['acoustic strums', 'soulful Punjabi poetry', 'warm baritone delivery'],
    mood: 'emotional, raw, and bittersweet',
    descriptor: 'soulful Punjabi indie confession',
    vibe: 'long highway drives under open twilight skies'
  },
  'tamil indie': {
    tags: ['acoustic fingerpicking', 'soothing Carnatic nuances', 'gentle melody'],
    mood: 'intimate, sweet, and comforting',
    descriptor: 'Tamil acoustic poetry',
    vibe: 'sea breeze through coastal window grilles'
  },
  'bossa nova': {
    tags: ['nylon string guitar', 'whispering vocals', 'syncopated swaying rhythm'],
    mood: 'sun-drenched, breezy, and effortlessly cool',
    descriptor: 'timeless Brazilian bossa nova',
    vibe: 'waves gently breaking along Ipanema beach'
  },
  'bengali indie': {
    tags: ['philosophical songwriting', 'acoustic guitar', 'existential warmth'],
    mood: 'introspective, bohemian, and literary',
    descriptor: 'contemporary Bengali indie folk',
    vibe: 'rain falling over Kolkata balconies and book-lined rooms'
  },
  'italian indie': {
    tags: ['vintage keyboards', 'mediterranean melody', 'ironic heartbreak'],
    mood: 'wistful, catchy, and romantic',
    descriptor: 'Italian indie pop daydream',
    vibe: 'scooters humming through warm Roman alleys'
  },
  'arabic indie': {
    tags: ['acoustic violin', 'beirut nocturne', 'delicate falsetto'],
    mood: 'poignant, tender, and haunting',
    descriptor: 'modern Arabic acoustic lullaby',
    vibe: 'evening sea breeze over the terraces of Beirut'
  },
  'anatolian rock': {
    tags: ['saz lute riffs', 'wah-wah pedals', 'disco-funk groove'],
    mood: 'hypnotic, psychedelic, and infectious',
    descriptor: 'Turkish psych-folk groove',
    vibe: 'watching the Bosphorus ferries lights glide through the fog'
  },
  'neo soul': {
    tags: ['laid-back drums', 'warm bass groove', 'sweet falsetto harmonies'],
    mood: 'smooth, golden, and deeply comforting',
    descriptor: 'warm neo-soul groove',
    vibe: 'watching a Texas sunset roll across desert highways'
  }
};

export const CITY_VIGNETTES = {
  tokyo: {
    morning: 'commuters emerging into the crisp morning light around Shinjuku and Shibuya stations',
    daylight: 'bicycles weaving quietly down quiet residential side-streets beneath power lines',
    'golden-hour': 'amber sunset reflecting off the glass towers of Roppongi and the elevated Shuto expressway',
    evening: 'red lanterns flickering outside izakayas as the city transitions from work to conversation',
    'after-dark': 'the neon signs humming quietly over damp asphalt after the final trains have left'
  },
  mumbai: {
    morning: 'the golden haze lifting over Marine Drive with runners and tea vendors brewing cutting chai',
    daylight: 'the relentless pulse of local trains and harbor breezes carrying sea salt across the avenues',
    'golden-hour': 'the sky turning fiery saffron over the Arabian Sea as thousands pause to watch the waves',
    evening: 'the Queen’s Necklace glowing yellow against the dark coastline as taxis hum into the night',
    'after-dark': 'the quiet salt spray blowing across the empty promenade under the starlight'
  },
  paris: {
    morning: 'the aroma of fresh espresso and warm croissants spilling out of corner zinc-bar cafés',
    daylight: 'sunlight dappling through chestnut trees along the boulevards and across the Seine',
    'golden-hour': 'the Haussmann limestone facades glowing golden-pink in the long Parisian twilight',
    evening: 'clinking wine glasses along bistro terraces and cobblestones catching the yellow streetlamps',
    'after-dark': 'the dark ribbon of the river reflecting bridge arches under the quiet midnight breeze'
  },
  'new york': {
    morning: 'steam rising from corner bagels and subway grates as the early rush picks up momentum',
    daylight: 'shadows of skyscrapers sweeping across avenues while sirens and footsteps echo in rhythm',
    'golden-hour': 'the low sun blinding crosstown traffic, turning brick brownstones into burning bronze',
    evening: 'the glow of yellow cabs and theater marquees lighting up the gathering dusk',
    'after-dark': 'the endless grid humming at 3 AM with distant train rumbles and solitary walkers'
  },
  london: {
    morning: 'red buses navigating through cool morning mist across Waterloo Bridge',
    daylight: 'the steady hum of coffee shops and parks dotted with people walking between meetings',
    'golden-hour': 'the Thames turning slate-blue and copper as pub doorways spill warm chatter onto the pavement',
    evening: 'amber sodium streetlamps reflecting on wet asphalt after a passing shower',
    'after-dark': 'the quiet silhouette of brick terraces and telephone boxes sleeping in the dark'
  }
};

export const commentaryContextService = {
  /**
   * Determine genre profile from track metadata
   */
  getGenreProfile(track) {
    if (!track) return GENRE_PROFILES['dream pop'];
    const meta = (track.meta || '').toLowerCase();
    const title = (track.title || '').toLowerCase();

    for (const [key, profile] of Object.entries(GENRE_PROFILES)) {
      if (meta.includes(key) || title.includes(key)) {
        return profile;
      }
    }

    if (meta.includes('city') || meta.includes('pop')) return GENRE_PROFILES['city pop'];
    if (meta.includes('hindi') || meta.includes('acoustic')) return GENRE_PROFILES['hindi indie'];
    if (meta.includes('slow') || meta.includes('ambient')) return GENRE_PROFILES['slowcore'];
    if (meta.includes('french') || meta.includes('chanson')) return GENRE_PROFILES['french chanson'];
    if (meta.includes('korean') || meta.includes('k-')) return GENRE_PROFILES['k-indie'];
    if (meta.includes('marathi')) return GENRE_PROFILES['bhavgeet'];
    if (meta.includes('folk')) return GENRE_PROFILES['folk latino'];

    return GENRE_PROFILES['dream pop'];
  },

  /**
   * Get poetic city vignette tailored to the current 24-hour broadcast window
   */
  getCityVignette(cityName = 'Tokyo', programId = 'after-dark') {
    const key = (cityName || 'Tokyo').trim().toLowerCase();
    const cityData = CITY_VIGNETTES[key] || CITY_VIGNETTES['tokyo'];
    return cityData[programId] || cityData['after-dark'] || 'the quiet rhythms of the city moving in time';
  },

  /**
   * Extract authentic lore and backstory for a track
   */
  getTrackLore(track) {
    if (track?.lore) return track.lore;
    const profile = this.getGenreProfile(track);
    return `Captured with ${profile.tags[0]} and ${profile.tags[1]}, designed to create ${profile.vibe}.`;
  },

  /**
   * Characterize the transition dynamic between two songs
   */
  analyzeTransition(currentTrack, nextTrack) {
    const fromProfile = this.getGenreProfile(currentTrack);
    const toProfile = this.getGenreProfile(nextTrack);
    const isSameLanguage = (currentTrack?.language || '') === (nextTrack?.language || '');

    let transitionType = 'harmonic';
    if (!isSameLanguage) {
      transitionType = 'cultural-bridge';
    } else if (fromProfile.descriptor !== toProfile.descriptor) {
      transitionType = 'mood-shift';
    }

    return {
      fromProfile,
      toProfile,
      isSameLanguage,
      transitionType,
      culturalBridge: !isSameLanguage ? `from ${currentTrack?.language || 'the airwaves'} into ${nextTrack?.language || 'new frequencies'}` : null
    };
  }
};
