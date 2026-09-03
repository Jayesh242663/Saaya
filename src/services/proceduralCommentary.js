/**
 * SAAYA Procedural Radio Commentary Engine (24-Hour Time-Dynamic & Multilingual)
 * Crafts authentic, multi-segment radio host monologues that dynamically
 * transform across Morning, Daylight, Golden Hour, Evening, and After Dark,
 * with full native support for English, Hindi (हिंदी), and Marathi (मराठी).
 */

import { commentaryContextService } from './commentaryContextService.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
let transitionCounter = 0;

export const proceduralCommentary = {
  /**
   * Generate an authentic, multi-segment radio opening monologue tailored to the local time of day and language
   */
  generateIntro(weather, firstTrack, targetLang = null) {
    const lang = (targetLang || firstTrack?.languageCode || '').toLowerCase();
    const trackLang = (firstTrack?.language || '').toLowerCase();

    if (lang === 'hi-in' || lang === 'hi' || trackLang === 'hindi') {
      return this.generateHindiIntro(weather, firstTrack);
    }
    if (lang === 'mr-in' || lang === 'mr' || trackLang === 'marathi') {
      return this.generateMarathiIntro(weather, firstTrack);
    }

    return this.generateEnglishIntro(weather, firstTrack);
  },

  /**
   * Hindi Radio Opening Monologue (RJ Meher)
   */
  generateHindiIntro(weather, firstTrack) {
    const city = weather?.city || 'Mumbai';
    const temp = weather?.tempC !== undefined ? `${weather.tempC}°C` : 'khushgawar mausam';
    const program = weather?.program || {
      id: 'after-dark',
      showTitle: 'SAAYA After Dark',
      clockTime: 'Raat ke pal'
    };

    const clockTime = program.clockTime || 'is waqt';
    const programId = program.id || 'after-dark';
    const songLore = firstTrack?.lore || 'dil ko chhoo lene wali dhun aur khoobsurat shayari.';

    if (programId === 'morning') {
      return `Namaskar aur shubh prabhat. Aap sun rahe hain SAAYA Morning Drift. Is waqt ${city} mein subah ke ${clockTime} ho rahe hain, aur taapman lagbhag ${temp} hai. Chai ki chuskiyon ke saath apne naye din ki shuruaat kijiye. Hamare is safar ka pehla geet hai ${firstTrack.artist} ka "${firstTrack.title}". ${songLore} Suniye ${firstTrack.artist}, sirf SAAYA par.`;
    }

    if (programId === 'daylight') {
      return `Shubh dopahar. Aap jude hain SAAYA Daylight Frequencies ke saath. ${city} mein is waqt ${clockTime} hain aur taapman ${temp} hai. Din ki bhagdod mein se kuch pal apne liye nikaliye aur is sangeet ko mehsoos kijiye. Pesh hai ${firstTrack.artist} ka khoobsurat naghma "${firstTrack.title}". ${songLore} Suna rahe hain ${firstTrack.artist}, SAAYA par.`;
    }

    if (programId === 'golden-hour') {
      return `Shubh sandhya. Sham dhal rahi hai aur aap sun rahe hain SAAYA Golden Hour Drive. ${city} mein ${clockTime} ho rahe hain aur taapman ${temp} hai. Din bhar ki thakan ko pichhe chhodiye aur is shaam ko sangeet ke naam kijiye. Shuru karte hain ${firstTrack.artist} ke behtareen geet "${firstTrack.title}" se. ${songLore} Sunte rahiye SAAYA.`;
    }

    if (programId === 'evening') {
      return `Namaskar. Ek suhani shaam mein aapka swagat hai SAAYA Velvet Evening par. ${city} mein raat ke ${clockTime} baje hain aur halki thandak ke saath taapman ${temp} hai. Kamre ki battiyan dheemi kijiye aur is sukoon bhare sangeet mein kho jaiye. Hazir hai ${firstTrack.artist} ka geet "${firstTrack.title}". ${songLore} Suniye ${firstTrack.artist}, SAAYA par.`;
    }

    // After Dark / Midnight
    return `Aap sun rahe hain SAAYA After Dark. Khamosh sadkon aur dheemi roshni ke darmiyaan, yahan hum hain aur aap hain. Is waqt ${city} mein raat ke ${clockTime} baje hain aur taapman ${temp} hai. Agar aap abhi tak jaag rahe hain, to aap akele nahi hain. Pesh-e-khidmat hai ${firstTrack.artist} ka geet "${firstTrack.title}". ${songLore} Suniye ${firstTrack.artist}, SAAYA par.`;
  },

  /**
   * Marathi Radio Opening Monologue (RJ Meher)
   */
  generateMarathiIntro(weather, firstTrack) {
    const city = weather?.city || 'Pune';
    const temp = weather?.tempC !== undefined ? `${weather.tempC}°C` : 'thandi hawa';
    const program = weather?.program || {
      id: 'after-dark',
      showTitle: 'SAAYA After Dark',
      clockTime: 'Ratrichi vel'
    };

    const clockTime = program.clockTime || 'ya weli';
    const programId = program.id || 'after-dark';
    const songLore = firstTrack?.lore || 'manala sparshun jaanaari madhur dhun.';

    if (programId === 'morning') {
      return `Namaskar aani shubh sakal. Tumhi aikhat aahat SAAYA Morning Drift. ${city} madhe sakalche ${clockTime} vaazle asun taapmaan ${temp} aahe. Garam chahachya ghotasobat ya nava divasachi sundar surwat karuya. Aplya ya sangeetmay pravasachi surwat karuya ${firstTrack.artist} yanchya "${firstTrack.title}" ya geetane. ${songLore} Aikhat raha SAAYA.`;
    }

    if (programId === 'daylight') {
      return `Shubh dupar. Tumhi jodle gele aahat SAAYA Daylight Frequencies sobat. ${city} madhe ya weli ${clockTime} zhaale asun taapmaan ${temp} aahe. Divasachya ya gadbadi madhe thoda vel swatasathi kadha aani ya suranna anubhava. Aaikuya ${firstTrack.artist} yanche madhur geet "${firstTrack.title}". ${songLore} He aahe SAAYA.`;
    }

    if (programId === 'golden-hour') {
      return `Shubh sandhyakal. Soneri sandhyakalchya ya sundar kshani tumhi aikhat aahat SAAYA. ${city} madhe sandhyakalche ${clockTime} zhaale asun taapmaan ${temp} aahe. Divasacha saara thaakwa visarun ya suranchya laharit harvun ja. Aaikuya ${firstTrack.artist} yanche apratim gaane "${firstTrack.title}". ${songLore} Aikhat raha SAAYA.`;
    }

    if (programId === 'evening') {
      return `Namaskar. Shubh sandhyakal, tumhi aikhat aahat SAAYA Velvet Evening. ${city} madhe ratriche ${clockTime} vaazle asun taapmaan ${temp} aahe. Divyaancha mand prakash aani he manprassanna sangeet. Surwat karuya ${firstTrack.artist} yanchya "${firstTrack.title}" ya geetane. ${songLore} He aahe SAAYA.`;
    }

    // After Dark
    return `Ratrichya ya shantate madhe, tumhi aikhat aahat SAAYA After Dark. ${city} madhe ratriche ${clockTime} zhaale asun taapmaan ${temp} aahe. Jar tumhi ya madhyaratri jaage asal, tar ha surancha pravas fakt tumchyasathi aahe. Pesh karat aahot ${firstTrack.artist} yanche geet "${firstTrack.title}". ${songLore} Aaikat raha SAAYA.`;
  },

  /**
   * English Radio Opening Monologue
   */
  generateEnglishIntro(weather, firstTrack) {
    const city = weather?.city || 'Tokyo';
    const temp = weather?.tempC !== undefined ? `${weather.tempC}°C` : 'cool air';
    const weatherDesc = weather?.description || 'calm skies';
    const weatherSummary = weather?.summary || 'Clear';
    const program = weather?.program || {
      id: 'after-dark',
      showTitle: 'SAAYA After Dark',
      greeting: 'Welcome to SAAYA',
      clockTime: 'Midnight Hour'
    };

    const programId = program.id || 'after-dark';
    const clockTime = program.clockTime || 'On Air';
    const showTitle = program.showTitle || 'SAAYA Broadcast';
    const cityVignette = commentaryContextService.getCityVignette(city, programId);
    const songLore = commentaryContextService.getTrackLore(firstTrack);

    // 1. MORNING (06:00 - 11:59)
    if (programId === 'morning') {
      const morningSignsOn = [
        `Good morning, and welcome to ${showTitle}. You're locked in across the airwaves.`,
        `A very good morning to you. This is ${showTitle}, easing you into the new day.`,
        `Morning frequencies are live on SAAYA. Wherever you're tuning in from, welcome to the day.`
      ];
      const morningAtmosphere = [
        `Here in ${city}, it's ${clockTime}, with temperatures around ${temp} beneath ${weatherDesc}. Outside our studio, ${cityVignette}.`,
        `Looking across ${city} at ${clockTime}, the air is crisp at ${temp} with ${weatherDesc}. The city is stirring, and ${cityVignette}.`
      ];
      const morningMusings = [
        `Pour yourself that first cup of coffee or warm tea, take a quiet breath, and let's set the tempo for the hours ahead.`,
        `Whether you're getting ready for your morning commute or just enjoying an unhurried start, you're in the right place.`
      ];
      const morningCues = [
        `To open this morning's broadcast, we're starting with ${firstTrack.artist} and "${firstTrack.title}". ${songLore} Let's begin. Here is ${firstTrack.artist}, on SAAYA.`,
        `Kicking off our morning drift, this is "${firstTrack.title}" by ${firstTrack.artist}. ${songLore} Ease into the rhythm with this.`
      ];
      return `${pick(morningSignsOn)} ${pick(morningAtmosphere)} ${pick(morningMusings)} ${pick(morningCues)}`;
    }

    // 2. DAYLIGHT (12:00 - 16:59)
    if (programId === 'daylight') {
      const daylightSignsOn = [
        `Good afternoon, you're tuned to ${showTitle}. Broadcasting worldwide.`,
        `Welcome back to the airwaves. This is ${showTitle}, keeping you company through the afternoon.`
      ];
      const daylightAtmosphere = [
        `Right now across ${city}, it's ${clockTime}, sitting at a pleasant ${temp} with ${weatherDesc}. Outside, ${cityVignette}.`,
        `In ${city}, the midday temperature is ${temp} beneath ${weatherSummary}, with ${weatherDesc}. Around town, ${cityVignette}.`
      ];
      const daylightMusings = [
        `If you're in the middle of a busy workday, take this moment to step back, exhale, and let the background rhythms do the heavy lifting.`,
        `Midday is all about steady focus and finding your pocket of calm while the rest of the world rushes by.`
      ];
      const daylightCues = [
        `Leading off this hour, we have ${firstTrack.artist} with "${firstTrack.title}". ${songLore} Let's drop into the groove. Here is ${firstTrack.artist}, on SAAYA.`,
        `Here is "${firstTrack.title}" by ${firstTrack.artist} to carry us through the afternoon. ${songLore} Settle in and enjoy.`
      ];
      return `${pick(daylightSignsOn)} ${pick(daylightAtmosphere)} ${pick(daylightMusings)} ${pick(daylightCues)}`;
    }

    // 3. GOLDEN HOUR (17:00 - 20:59)
    if (programId === 'golden-hour') {
      const sunsetSignsOn = [
        `Welcome to the golden hour on SAAYA. This is ${showTitle}, rolling into the evening.`,
        `The sun is dipping low and the amber light is breaking through. You're listening to ${showTitle}.`
      ];
      const sunsetAtmosphere = [
        `Out here in ${city}, the clock stands at ${clockTime}. The air has cooled down to ${temp} under ${weatherDesc}. Across the skyline, ${cityVignette}.`,
        `Tonight in ${city}, we're looking at ${temp} with ${weatherSummary}, as ${cityVignette}.`
      ];
      const sunsetMusings = [
        `Another day in the books. If you're heading home through traffic, walking the avenue, or unlacing your shoes—time to shed the day's weight.`,
        `There's a distinct magic when daylight turns into neon glow. That's the feeling we're soundtracking tonight.`
      ];
      const sunsetCues = [
        `To open our golden hour drive, here is ${firstTrack.artist} with the timeless "${firstTrack.title}". ${songLore} Roll the windows down. This is SAAYA.`,
        `Starting our twilight transition with ${firstTrack.artist} and "${firstTrack.title}". ${songLore} Sink right into this melody.`
      ];
      return `${pick(sunsetSignsOn)} ${pick(sunsetAtmosphere)} ${pick(sunsetMusings)} ${pick(sunsetCues)}`;
    }

    // 4. VELVET EVENING (21:00 - 23:59)
    if (programId === 'evening') {
      const eveningSignsOn = [
        `Good evening, you're tuned to SAAYA. This is ${showTitle}, settling in for the night.`,
        `Dim the lamps and close the curtains. Welcome to ${showTitle} on SAAYA.`
      ];
      const eveningAtmosphere = [
        `Across ${city}, it's ${clockTime}, with temperatures resting at ${temp} under ${weatherDesc}. Out in the neighborhoods, ${cityVignette}.`,
        `Outside in ${city} at ${clockTime}: ${temp} with ${weatherDesc}. The city lights are glistening, and ${cityVignette}.`
      ];
      const eveningMusings = [
        `The day is officially done, the dishes are cleared, and the room is quiet. It's time to let the mind slow down.`,
        `Wherever you are tonight—curled up on the couch, reading a book, or just staring out the window—you're among friends here.`
      ];
      const eveningCues = [
        `Opening our evening session with ${firstTrack.artist} and "${firstTrack.title}". ${songLore} Let this one breathe. Here is ${firstTrack.artist}, on SAAYA.`,
        `To begin tonight's drift, here is "${firstTrack.title}" by ${firstTrack.artist}. ${songLore} Close your eyes and listen.`
      ];
      return `${pick(eveningSignsOn)} ${pick(eveningAtmosphere)} ${pick(eveningMusings)} ${pick(eveningCues)}`;
    }

    // 5. AFTER DARK (00:00 - 05:59)
    const midnightSignsOn = [
      `You're tuned to SAAYA. 104.8 in the dark. Welcome to ${showTitle}.`,
      `Midnight frequencies, quiet rooms, and neon reflections. This is ${showTitle} on SAAYA.`
    ];
    const midnightAtmosphere = [
      `Out here in ${city}, the clock reads ${clockTime}, with the temperature down to ${temp} beneath ${weatherDesc}. Down below our studio glass, ${cityVignette}.`,
      `Tonight across ${city} at ${clockTime}: ${temp} with ${weatherDesc}. The last trains have pulled out of the stations, and ${cityVignette}.`
    ];
    const midnightMusings = [
      `If you're still awake—driving somewhere with no destination, working under a lonely desk lamp, or just lying in bed unable to sleep—you're not alone tonight.`,
      `The world is asleep, but out here across the airwaves, the stillness is where the best thoughts live.`
    ];
    const midnightCues = [
      `To open tonight's broadcast, here is ${firstTrack.artist} with "${firstTrack.title}". ${songLore} Fade into the dark with this. Here is ${firstTrack.artist}, on SAAYA.`,
      `Leading off our midnight drift with ${firstTrack.artist} and "${firstTrack.title}". ${songLore} Let the melody take over.`
    ];
    return `${pick(midnightSignsOn)} ${pick(midnightAtmosphere)} ${pick(midnightMusings)} ${pick(midnightCues)}`;
  },

  /**
   * Generate dynamic transition between two songs
   */
  generateTransition(currentTrack, nextTrack, weather, targetLang = null) {
    const lang = (targetLang || nextTrack?.languageCode || '').toLowerCase();
    const nextTrackLang = (nextTrack?.language || '').toLowerCase();

    if (lang === 'hi-in' || lang === 'hi' || nextTrackLang === 'hindi') {
      return this.generateHindiTransition(currentTrack, nextTrack, weather);
    }
    if (lang === 'mr-in' || lang === 'mr' || nextTrackLang === 'marathi') {
      return this.generateMarathiTransition(currentTrack, nextTrack, weather);
    }

    return this.generateEnglishTransition(currentTrack, nextTrack, weather);
  },

  generateHindiTransition(currentTrack, nextTrack, weather) {
    const showTitle = weather?.showTitle || 'साया';
    const city = weather?.city || 'मुंबई';
    const nextTitle = nextTrack?.title || 'गीत';
    const nextArtist = nextTrack?.artist || 'कलाकार';
    const currArtist = currentTrack?.artist || 'कलाकार';

    const templates = [
      `[soft, atmospheric] ${currArtist} के सुरों का जादू... सीधे दिल में सुकून भर देता है... [pause] और इस खूबसूरत अहसास को आगे बढ़ाते हुए, पेश है ${nextArtist} का नगमा... "${nextTitle}"। [smiling] सुनते रहिए ${showTitle}।`,
      `[energetic] क्या बात है! अब इस माहौल में थोड़ी ताज़गी और थोड़ी रफ्तार घोलते हैं... [upbeat] आवाज़ थोड़ी बढ़ा लीजिए, क्योंकि अब आ रहा है ${nextArtist} का गाना... "${nextTitle}"! [playful]`,
      `[warm, slower] ${city} की ये शांत रात, हल्की ठंडी हवा और ये सुकून... [short pause] ऐसे खूबसूरत लम्हों के लिए ही तो बना है ${nextArtist} का ये गीत... "${nextTitle}"। [soft]`,
      `[playful] [light laugh] यक़ीनन आप भी इस धुन के साथ मुस्कुरा रहे होंगे... [pause] तो फिर अपनी चाय की चुस्की के साथ तैयार हो जाइए, सुनते हैं ${nextArtist} का तराना... "${nextTitle}"! [upbeat]`,
      `[soft, smiling] एक धुन ख़त्म होती है और दूसरी दिल में अपनी जगह बना लेती है... [short pause] ${showTitle} पर अब मुलाक़ात करते हैं ${nextArtist} के सुरों से... "${nextTitle}"। [warm]`,
      `[bright, confident] आप सुन रहे हैं ${showTitle}... जहां हर नगमा आपकी अपनी दास्तां बन जाता है। [pause] पेश-ए-ख़िदमत है ${nextArtist} का दिलकश गीत... "${nextTitle}"। [music transition]`,
      `[warm, slower] कुछ गाने ऐसे होते हैं जो सीधे रूह को छू लेते हैं... [pause] आइए खो जाते हैं ${nextArtist} के इस बेहद प्यारे तराने में... "${nextTitle}"। [smiling]`,
      `[high energy] सुरों का ये हसीन कारवां यूँ ही आगे बढ़ता रहेगा... [short pause] लीजिए, पेश है इस महफ़िल का अगला रंग... ${nextArtist} और उनका गीत "${nextTitle}"! [music transition]`
    ];

    const idx = (transitionCounter++) % templates.length;
    return templates[idx];
  },

  generateMarathiTransition(currentTrack, nextTrack, weather) {
    const showTitle = weather?.showTitle || 'साया';
    const city = weather?.city || 'मुंबई';
    const nextTitle = nextTrack?.title || 'गाणं';
    const nextArtist = nextTrack?.artist || 'गायक';
    const currArtist = currentTrack?.artist || 'गायक';

    const templates = [
      `[soft, atmospheric] ${currArtist} यांच्या आवाजातील जादू मनात अशीच रेंगाळत राहते... [pause] आणि आता याच सुरेल प्रवाहाला पुढे नेण्यासाठी घेऊन येत आहोत ${nextArtist} यांचं सुंदर गाणं... "${nextTitle}"। [smiling] ऐकत राहा ${showTitle}।`,
      `[energetic] क्या बात आहे! या वातावरणात आता थोडा उत्साह भरूया... [upbeat] आवाज थोडा वाढवा, कारण आता सुरू होत आहे ${nextArtist} यांचं भन्नाट गाणं... "${nextTitle}"! [playful]`,
      `[warm, slower] बाहेरच्या हवेतला गारवा, ${city} मधील ही शांत वेळ... [short pause] अशा या मोहक क्षणी, ${nextArtist} यांचं "${nextTitle}" ऐकण्यासारखा दुसरा आनंद नाही। [smiling]`,
      `[playful] [light laugh] आवडलं ना हे गाणं? मला खात्री आहे तुम्हीही मनापासून गुणगुणत असाल... [pause] आता तयार व्हा पुढच्या सुरेल अनुभूतीसाठी... ऐकूया ${nextArtist} यांचं "${nextTitle}"! [upbeat]`,
      `[soft, smiling] एक सूर संपतो आणि दुसरा एका नव्या भावविश्वाची सुरुवात करतो... [short pause] ${showTitle} वर आता ऐकूया ${nextArtist} यांच्या जादूई सुरांमधील... "${nextTitle}"। [warm]`,
      `[bright, confident] तुम्ही ऐकत आहात ${showTitle}... जिथे प्रत्येक गाणं घेऊन येतं एक नवी भावना! [pause] पुढे ऐकूया ${nextArtist} यांचं अप्रतिम गाणं... "${nextTitle}"। [music transition]`,
      `[warm, slower] मनाच्या खोलवर स्पर्श करणारा हा सुरेल प्रवास... [pause] पुन्हा एकदा त्या रम्य आठवणींमध्ये हरवून जाण्यासाठी, ऐकूया ${nextArtist} यांचं "${nextTitle}"। [smiling]`,
      `[high energy] गाण्यांची ही सुंदर मैफल अशीच रंगात येत चालली आहे... [short pause] अजिबात वेळ न दवडता, ऐकूया पुढचं खास गाणं... ${nextArtist} यांचं "${nextTitle}"! [music transition]`
    ];

    const idx = (transitionCounter++) % templates.length;
    return templates[idx];
  },

  generateEnglishTransition(currentTrack, nextTrack, weather) {
    const city = weather?.city || 'Tokyo';
    const showTitle = weather?.showTitle || 'SAAYA';
    const nextTitle = nextTrack?.title || 'Song';
    const nextArtist = nextTrack?.artist || 'Artist';
    const currArtist = currentTrack?.artist || 'Artist';

    const templates = [
      `[soft, atmospheric] That was ${currArtist}, leaving a distinct warmth in the air... [pause] Shifting our frequency now into something deeply resonant... here is ${nextArtist} with "${nextTitle}". [smiling]`,
      `[energetic] Shifting gears right now on ${showTitle}! Turn up the dials and lean into the rhythm... [upbeat] This is ${nextArtist} with "${nextTitle}". [playful]`,
      `[warm, slower] The quiet streets of ${city}, the night air drifting outside our glass... [short pause] The perfect soundtrack for this exact hour: ${nextArtist} with "${nextTitle}". [soft]`,
      `[playful] [light laugh] Hope that last groove found its mark with you... [pause] Keep your headphones on, because ${nextArtist} is taking over next with "${nextTitle}". [upbeat]`,
      `[soft, smiling] As one melody dissolves, another sonic doorway opens up... [short pause] Next up on ${showTitle}, settle in for ${nextArtist} and "${nextTitle}". [warm]`,
      `[bright, confident] You are locked into ${showTitle}, your personal frequency in the dark. [pause] Moving right ahead in our sonic journey with ${nextArtist} and "${nextTitle}". [music transition]`,
      `[warm, slower] Some records just have a way of slowing down time itself... [pause] Close your eyes and let this next piece wash over you: ${nextArtist} with "${nextTitle}". [smiling]`,
      `[high energy] Keeping the momentum rolling without missing a beat... [short pause] Here comes ${nextArtist} with the undeniable sound of "${nextTitle}"! [music transition]`
    ];

    const idx = (transitionCounter++) % templates.length;
    return templates[idx];
  }
};

