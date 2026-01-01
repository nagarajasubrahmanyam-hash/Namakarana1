/**
 * KATAPAYADI ENGINE
 * Logic for converting text (Devanagari, English, or IAST Roman Script) into Vedic Numbers.
 */
const KatapayadiEngine = (() => {
    // 1. Core Map (Values) - The Vedic Number Mapping
    const map = {
        'क':1,'ख':2,'ग':3,'घ':4,'ङ':5,'च':6,'छ':7,'ज':8,'झ':9,'ञ':0,
        'ट':1,'ठ':2,'ड':3,'ढ':4,'ण':5,'त':6,'थ':7,'द':8,'ध':9,'न':0,
        'प':1,'फ':2,'ब':3,'भ':4,'म':5,'य':1,'र':2,'ल':3,'व':4,'श':5,'ष':6,'स':7,'ह':8,
        'क्ष':6,'ज्ञ':0 // Atomic handling for special conjuncts
    };
    const vowels = ['अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ','अं','अः','ऋ','ॠ','ऌ','ॡ'];

    // 2. Dictionary (Hardcoded Overrides for modern words)
    const dictionary = {
        "microsoft": "माइक्रोसॉफ्ट्",
        "congress": "काँग्रेस",
        "bjp": "भाजपा",
        "inc": "इंडियन नेशनल काँग्रेस",
        "general electric": "जेनेरल् एलेकट्रिक्"
    };

    // 3. Phonetic Maps (Updated with IAST Support)
    const phoneMap = {
        // --- IAST Vowels (Precise) ---
        'ā':'ा', 'ī':'ी', 'ū':'ू', 'ṛ':'ृ', 'ṝ':'ॄ', 'ḷ':'ॢ', 'ḹ':'ॣ',
        'ai':'ै', 'au':'ौ', 'ṃ':'ं', 'ḥ':'ः',

        // --- IAST Consonants (Precise) ---
        'ṭh':'ठ', 'ḍh':'ढ', // Retroflex aspirated (check 2-char keys first)
        'ṭ':'ट', 'ḍ':'ड', 'ṇ':'ण', 'ṣ':'ष', 'ś':'श', 'ñ':'ञ', 'ṅ':'ङ',

        // --- Loose English / Common Transliteration ---
        'aa':'ा', 'ee':'ी', 'oo':'ू', 
        'ksh':'क्ष', 'tra':'त्र', 'gy':'ज्ञ', 'jny':'ज्ञ', 'ng':'ं',
        'sh':'श', 'ch':'च', // 'ch' is common English for 'च'

        // --- Standard Consonants (Mixed IAST + English) ---
        'th':'थ', 'ph':'फ', 'gh':'घ', 'jh':'झ', 'dh':'ध', 'bh':'भ', 'kh':'ख',
        'k':'क', 'g':'ग', 'j':'ज', 't':'त', 'd':'द', 'n':'न', 'p':'प', 'f':'फ', 'b':'ब', 'm':'म',
        'y':'य', 'r':'र', 'l':'ल', 'v':'व', 'w':'व', 's':'स', 'h':'ह',
        
        // --- Single Chars & Vowels ---
        'c':'च', // In strict IAST 'c' is 'cha'
        'a':'', 'i':'ि', 'u':'ु', 'e':'े', 'o':'ो' 
    };
    
    // Sort keys by length (Descending) so 'ṭh' matches before 'ṭ', and 'sh' before 's'
    const sortedKeys = Object.keys(phoneMap).sort((a,b)=>b.length-a.length);

    function isConsonant(char) {
        return map.hasOwnProperty(char) && char !== 'क्ष' && char !== 'ज्ञ'; 
    }

    /**
     * Converts Roman script (IAST or loose English) to Devanagari.
     */
    function transliterate(text) {
        let lower = text.trim().toLowerCase();
        
        // Check hardcoded dictionary first
        if(dictionary[lower]) return { dev: dictionary[lower], method: 'Dictionary' };

        let dev = "";
        let i = 0;
        let prevWasConsonant = false;

        while(i < lower.length) {
            let found = false;
            
            // Try to match longest keys first (e.g. match 'ṭh' before 't')
            for(let key of sortedKeys) {
                if(lower.substr(i, key.length) === key) {
                    let token = phoneMap[key];
                    let isCon = isConsonant(token);
                    
                    // Logic: If previous was consonant and we hit another consonant,
                    // insert Virama (Halant) to suppress the inherent 'a'.
                    if (isCon && prevWasConsonant) dev += '्'; 
                    
                    dev += token;
                    
                    // Update state for next character
                    // 'a' explicitly clears consonant state (inherent vowel used)
                    // Matras (ा, ि, etc) also clear consonant state
                    if (key === 'a' || (token && token.match(/[ा-ौ]/)) || token === 'ं') {
                        prevWasConsonant = false;
                    } 
                    else if (isCon) {
                        prevWasConsonant = true;
                    } 
                    else {
                        prevWasConsonant = false;
                    }

                    i += key.length;
                    found = true;
                    break;
                }
            }
            // Skip unrecognized characters
            if(!found) i++;
        }
        
        // Final clean up: If word ends in consonant, add Virama (standard for Katapayadi/Sanskrit)
        if(prevWasConsonant) dev += '्'; 
        
        return { dev: dev, method: 'Heuristic' };
    }

    /**
     * Calculates the Katapayadi Value, Sum, and Rashi from Devanagari input.
     */
    function calculate(devText) {
        // Normalize special conjuncts that might be formed by separate chars
        let clean = devText.replace(/क\u094Dष/g, 'क्ष').replace(/ज\u094Dञ/g, 'ज्ञ');
        
        let logs = [];
        let vals = [];
        let i = 0;
        
        while(i < clean.length) {
            let c = clean[i];
            let n = clean[i+1]||'';

            // Case A: Vowels (Start of syllable) -> Value 0, Keep
            if(vowels.includes(c)) {
                logs.push({t:c, v:0, s:'keep'}); 
                vals.push(0); 
                i++; 
                continue;
            }

            // Case B: Consonants
            if(map.hasOwnProperty(c)) {
                // Handle 'Ri' Matra (usually treated as special or ignored, here we flag it)
                if(n === 'ृ') { 
                    logs.push({t:c+'ृ', v:2, s:'warn'}); // Warn user about ambiguity
                    vals.push(2); 
                    i+=2; 
                    continue;
                }

                // Handle Conjuncts (Consonant + Virama)
                if(n === '्') { 
                    let nn = clean[i+2];
                    // If followed by another valid char, it's a conjunct -> Keep
                    if(nn && (map.hasOwnProperty(nn) || vowels.includes(nn))) {
                        let v = map[c];
                        logs.push({t:c+'्', v:v, s:'keep'}); 
                        vals.push(v);
                        i+=2; 
                        // Note: We don't skip the NEXT char yet, the loop handles it.
                    } else {
                        // Trailing Virama (End of word) -> Drop
                        logs.push({t:c+'्', v:null, s:'drop'}); 
                        i+=2;
                    }
                    continue;
                }

                // Normal Consonant (with inherent 'a' or matra) -> Keep
                let v = map[c];
                logs.push({t:c, v:v, s:'keep'}); 
                vals.push(v);
                i++;
                
                // Skip over any attached matras (vowel signs) as they don't add value
                while(i < clean.length && !map.hasOwnProperty(clean[i]) && !vowels.includes(clean[i])) {
                    i++;
                }
            } else {
                // Skip garbage
                i++;
            }
        }

        // Katapayadi Rule: "Ankanaam Vamato Gati" (Numbers go leftward)
        // We calculate sum normally, then reverse for display if needed.
        let rev = [...vals].reverse();
        let sum = parseInt(rev.join('')) || 0;
        let rashi = (sum % 12) === 0 ? 12 : (sum % 12);
        
        return { dev: devText, logs, rev, sum, rashi };
    }

    // Public Interface
    return { transliterate, calculate };
})();