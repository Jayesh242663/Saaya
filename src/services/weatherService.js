/**
 * SAAYA Weather & 24-Hour Broadcast Programming Service
 * Automatically maps real-time weather and 24-hour local time into dynamic
 * radio show programs, titles, atmospheric cues, and host personas.
 */

const CITY_COORDINATES = {
  tokyo: { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
  mumbai: { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777, timezone: 'Asia/Kolkata' },
  delhi: { name: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090, timezone: 'Asia/Kolkata' },
  paris: { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
  'new york': { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York' },
  london: { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
  berlin: { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin' },
  seoul: { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780, timezone: 'Asia/Seoul' },
  madrid: { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038, timezone: 'Europe/Madrid' },
  pune: { name: 'Pune', country: 'India', lat: 18.5204, lon: 73.8567, timezone: 'Asia/Kolkata' },
  kyoto: { name: 'Kyoto', country: 'Japan', lat: 35.0116, lon: 135.7681, timezone: 'Asia/Tokyo' }
};

// Weather code mapping (WMO code to descriptive phrase)
function decodeWmo(code, isDay = 0) {
  if (code === 0) {
    return {
      summary: isDay ? 'Clear Skies' : 'Clear Midnight',
      description: isDay ? 'bright daylight soaking the streets' : 'still, starlit dark'
    };
  }
  if (code === 1 || code === 2) {
    return {
      summary: isDay ? 'Sun & Passing Clouds' : 'Partly Cloudy Night',
      description: isDay ? 'sunlight filtering through gentle clouds' : 'passing midnight clouds over the skyline'
    };
  }
  if (code === 3) {
    return {
      summary: 'Overcast',
      description: 'a soft blanket of gray skies'
    };
  }
  if (code === 45 || code === 48) {
    return {
      summary: 'Misty Fog',
      description: 'shrouded in damp, peaceful fog'
    };
  }
  if (code >= 51 && code <= 55) {
    return {
      summary: 'Gentle Drizzle',
      description: 'a steady, soft drizzle whispering on the rooftops'
    };
  }
  if (code >= 61 && code <= 65) {
    return {
      summary: 'Steady Rain',
      description: 'rain washing over the streets and windowpanes'
    };
  }
  if (code >= 71 && code <= 77) {
    return {
      summary: 'Light Snow',
      description: 'quiet snow drifting through cold air'
    };
  }
  if (code >= 80 && code <= 82) {
    return {
      summary: 'Passing Showers',
      description: 'passing rain showers echoing against the pavement'
    };
  }
  if (code >= 95) {
    return {
      summary: 'Thunderstorm',
      description: 'distant thunder rumbling over the horizon'
    };
  }
  return {
    summary: isDay ? 'Breezy Daylight' : 'Cool Night Air',
    description: isDay ? 'a calm, breezy afternoon' : 'a tranquil, quiet night breeze'
  };
}

/**
 * 24-Hour Radio Programming Classifier
 */
export function getBroadcastProgram(date = new Date(), timezone = 'UTC') {
  try {
    const timeStr = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const [h, m] = timeStr.split(':').map(Number);
    const minuteFormatted = String(m).padStart(2, '0');
    const ampmHour = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const clockDisplay = `${ampmHour}:${minuteFormatted} ${ampm}`;

    // 1. MORNING (06:00 - 11:59)
    if (h >= 6 && h < 12) {
      return {
        id: 'morning',
        showTitle: 'SAAYA Morning Drift',
        greeting: 'Good morning',
        tone: 'warm, awakening, and gently uplifting',
        energy: 'mellow-uplift',
        clockTime: clockDisplay,
        militaryHour: h,
        label: 'Morning Awakening',
        themes: [
          'first light breaking across the rooftops',
          'brewing that first warm cup of coffee or tea',
          'the quiet momentum of the city waking up',
          'easing gently into the rhythm of the day ahead'
        ]
      };
    }

    // 2. DAYLIGHT / AFTERNOON (12:00 - 16:59)
    if (h >= 12 && h < 17) {
      return {
        id: 'daylight',
        showTitle: 'SAAYA Daylight Frequencies',
        greeting: 'Good afternoon',
        tone: 'breezy, flowing, focused, and steady',
        energy: 'moderate',
        clockTime: clockDisplay,
        militaryHour: h,
        label: 'Sunlit Midday',
        themes: [
          'sunlight cutting through the window blinds',
          'taking a breather in the middle of a moving day',
          'steady background rhythms for focus and wandering thoughts',
          'the city humming in full motion outside'
        ]
      };
    }

    // 3. GOLDEN HOUR / DUSK (17:00 - 20:59)
    if (h >= 17 && h < 21) {
      return {
        id: 'golden-hour',
        showTitle: 'SAAYA Golden Hour Drive',
        greeting: 'Welcome to the golden hour',
        tone: 'melodic, amber, nostalgic, and unwinding',
        energy: 'moderate-mellow',
        clockTime: clockDisplay,
        militaryHour: h,
        label: 'Sunset & Dusk',
        themes: [
          'amber skies and long shadows stretching down the avenues',
          'heading home or watching the dusk settle over the skyline',
          'exhaling after a long workday',
          'the magic transition when daylight turns into neon glow'
        ]
      };
    }

    // 4. VELVET EVENING (21:00 - 23:59)
    if (h >= 21 && h < 24) {
      return {
        id: 'evening',
        showTitle: 'SAAYA Velvet Evening',
        greeting: 'Good evening',
        tone: 'intimate, cozy, mellow, and conversational',
        energy: 'mellow',
        clockTime: clockDisplay,
        militaryHour: h,
        label: 'Velvet Evening',
        themes: [
          'the dinner dishes put away and lamps dimmed low',
          'city lights sparkling across the dark skyline',
          'unwinding on the couch with sound to fill the room',
          'the peaceful transition into the quiet night'
        ]
      };
    }

    // 5. AFTER DARK / MIDNIGHT (00:00 - 05:59)
    return {
      id: 'after-dark',
      showTitle: 'SAAYA After Dark',
      greeting: 'Broadcasting into the deep night',
      tone: 'velvety, nocturnal, whispered, and introspective',
      energy: 'deep-mellow',
      clockTime: clockDisplay,
      militaryHour: h,
      label: 'The Midnight Hour',
      themes: [
        'empty streets, quiet rooms, and neon reflections',
        'companionship for night owls, shift workers, and restless thinkers',
        'the stillness where thoughts finally have space to wander',
        'frequencies drifting through the midnight dark'
      ]
    };
  } catch {
    return {
      id: 'after-dark',
      showTitle: 'SAAYA Radio Airwaves',
      greeting: 'Welcome to SAAYA',
      tone: 'intimate and atmospheric',
      energy: 'mellow',
      clockTime: 'On Air',
      militaryHour: 0,
      label: 'On Air',
      themes: ['music drifting across the airwaves']
    };
  }
}

// Memory cache
const cache = new Map();
let ipLocationPromise = null;

export const weatherService = {
  /**
   * Automatically detect the user's city, coordinates, and timezone from their IP
   */
  async detectLocationFromIp() {
    // Check localStorage first
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('saaya_ip_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            return parsed.data;
          }
        }
      }
    } catch {}

    if (ipLocationPromise) return ipLocationPromise;

    ipLocationPromise = (async () => {
      try {
        const res = await fetch('https://ipwho.is/');
        if (!res.ok) throw new Error('IP lookup failed');
        const data = await res.json();
        if (data && data.success !== false && data.city) {
          const loc = {
            name: data.city,
            country: data.country || '',
            lat: data.latitude || 19.076,
            lon: data.longitude || 72.8777,
            timezone: data.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
          };
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('saaya_ip_location', JSON.stringify({ timestamp: Date.now(), data: loc }));
            }
          } catch {}
          return loc;
        }
      } catch (err) {
        console.warn('[WeatherService] IP lookup note (using timezone fallback):', err.message);
      }

      // Fallback: Infer city from browser timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      let fallbackName = 'Mumbai';
      if (tz.includes('Tokyo')) fallbackName = 'Tokyo';
      else if (tz.includes('London')) fallbackName = 'London';
      else if (tz.includes('New_York')) fallbackName = 'New York';
      else if (tz.includes('Paris')) fallbackName = 'Paris';
      else if (tz.includes('Berlin')) fallbackName = 'Berlin';
      else if (tz.includes('Kolkata')) fallbackName = 'Mumbai';

      return {
        name: fallbackName,
        country: '',
        lat: CITY_COORDINATES[fallbackName.toLowerCase()]?.lat || 19.076,
        lon: CITY_COORDINATES[fallbackName.toLowerCase()]?.lon || 72.8777,
        timezone: tz || 'Asia/Kolkata'
      };
    })();

    return ipLocationPromise;
  },

  /**
   * Get complete weather & 24-hour broadcast program for a city (auto-detects from IP if omitted)
   */
  async getWeather(cityName = null) {
    let cityData = null;

    if (!cityName || cityName.toLowerCase() === 'auto' || cityName === 'Tokyo') {
      const ipLoc = await this.detectLocationFromIp();
      cityData = ipLoc;
    } else {
      const cleanCity = cityName.trim().toLowerCase();
      cityData = CITY_COORDINATES[cleanCity] || {
        name: cityName,
        country: '',
        lat: 19.076,
        lon: 72.8777,
        timezone: 'Asia/Kolkata'
      };
    }

    const cleanCity = cityData.name.toLowerCase();
    const cacheKey = `weather_${cleanCity}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 10 * 60 * 1000) {
      return cached.data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API returned status ${res.status}`);

      const json = await res.json();
      const current = json.current || {};
      const tempC = Math.round(current.temperature_2m ?? 18);
      const isDay = current.is_day ?? 0;
      const weatherCode = current.weather_code ?? 0;
      const humidity = current.relative_humidity_2m ?? 65;
      const windSpeed = Math.round(current.wind_speed_10m ?? 8);
      const condition = decodeWmo(weatherCode, isDay);
      const program = getBroadcastProgram(new Date(), json.timezone || cityData.timezone);

      const result = {
        city: cityData.name,
        country: cityData.country,
        tempC: tempC,
        tempF: Math.round((tempC * 9) / 5 + 32),
        humidity: humidity,
        windSpeed: windSpeed,
        isDay: Boolean(isDay),
        summary: condition.summary,
        description: condition.description,
        emoji: condition.emoji,
        program: program,
        timeLabel: program.label,
        clockTime: program.clockTime,
        showTitle: program.showTitle,
        formattedBadge: `${cityData.name} · ${program.clockTime} · ${tempC}°C ${condition.emoji} ${condition.summary}`
      };

      cache.set(cacheKey, { timestamp: now, data: result });
      return result;
    } catch (err) {
      console.warn('[WeatherService] Open-Meteo fetch failed, using realistic atmospheric fallback:', err);
      const program = getBroadcastProgram(new Date(), cityData.timezone);
      const fallback = {
        city: cityData.name,
        country: cityData.country,
        tempC: 18,
        tempF: 64,
        humidity: 68,
        windSpeed: 10,
        isDay: program.militaryHour >= 6 && program.militaryHour < 18,
        summary: program.militaryHour >= 6 && program.militaryHour < 18 ? 'Mild Breeze' : 'Calm Night',
        description: 'a pleasant, gentle breeze through the city',
        emoji: program.militaryHour >= 6 && program.militaryHour < 18 ? '☀️' : '🌙',
        program: program,
        timeLabel: program.label,
        clockTime: program.clockTime,
        showTitle: program.showTitle,
        formattedBadge: `${cityData.name} · ${program.clockTime} · 18°C 🌙`
      };
      return fallback;
    }
  },

  getSupportedCities() {
    return Object.values(CITY_COORDINATES).map((c) => c.name);
  }
};
