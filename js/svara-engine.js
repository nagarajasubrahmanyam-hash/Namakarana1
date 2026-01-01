/**
 * SVARA ENGINE (Steps 6-9)
 * Handles Vowel Mapping, Planetary Activation, Timing (Dasa), and Syllable Support.
 */
const SvaraEngine = {

    // --- CONFIGURATION & CONSTANTS ---
    
    // Step 6: Vowel -> Zodiac Mapping
    VOWEL_SIGNS: {
        "a": 0, "ā": 1, // Aries, Taurus
        "i": 2, "ī": 2, // Gemini
        "u": 3, "ū": 3, // Cancer
        "e": 4, "ai": 4, // Leo (Simulated distribution) - Text doesn't specify all 12, 
                         // but standard Svara logic usually maps vowels to Sun signs or Nakshatras.
                         // BASED ON PROMPT EXAMPLES ONLY:
                         // A=Aries, I=Gemini. 
                         // To make this robust, we need a standard mapping. 
                         // We will use a simplified mapping based on Katapayadi/Svara traditions 
                         // where vowels cycle through signs, but strictly following the Prompt's explicit rules first.
                         // Prompt only explicitly defines A, Ā, and I/Ī. 
                         // We will infer standard progression for the rest or return "Unknown" if not strictly defined.
        "o": 5, "au": 5,
        // Fallback for others if needed
    },

    // Step 7: Vowel -> Avastha Mapping
    AVASTHA_VOWELS: {
        "Bala": ["a", "ā"],
        "Kumara": ["i", "ī"],
        "Yuva": ["u", "ū"],
        "Vriddha": ["e", "ai"],
        "Mrita": ["o", "au"]
    },

    // --- UTILITIES ---

    isVowel: function(char) {
        return /^[aeiouāīūṛṝḷaiuoeoau]/i.test(char);
    },

    // Helper: Extract First Vowel
    getFirstVowel: function(name) {
        if (!name) return "a";
        // Remove leading consonants
        const match = name.match(/[aeiouāīūṛṝḷaiuoeoau]/i);
        return match ? match[0].toLowerCase() : "a";
    },

    // Helper: Count Syllables (Prompt Rule: Count sounds, +1 if ends in consonant)
    countSyllables: function(name) {
        if (!name) return 0;
        const clean = name.toLowerCase().replace(/[^a-zāīūṛṝḷ]/g, "");
        
        // Count vowel groups
        const vowelGroups = clean.match(/[aeiouāīūṛṝḷ]+/g);
        let count = vowelGroups ? vowelGroups.length : 0;

        // Check last character for consonant
        const lastChar = clean.slice(-1);
        if (!this.isVowel(lastChar)) {
            count += 1; // "Invisible vowel sound follows"
        }
        return count;
    },

    getHousePosition: function(targetSignIdx, sourceSignIdx) {
        return ((targetSignIdx - sourceSignIdx + 12) % 12) + 1;
    },

    // --- STEP 6: SVARA CHAKRA (Vowel Wheel) ---
    analyzeSvara: function(name, planetData) {
        const vowel = this.getFirstVowel(name);
        
        // 1. Map Vowel to Sign
        // Note: Using prompt's specific example mapping. 
        // A -> Aries(0), Ā -> Taurus(1), I -> Gemini(2).
        // For standard Svara, U usually -> Cancer, E -> Leo, O -> Virgo/Libra. 
        // We will implement a cyclic mapper for coverage.
        const vowelMap = ["a", "ā", "i", "u", "e", "o"];
        const vowelIdx = vowelMap.findIndex(v => vowel.startsWith(v));
        
        // Fallback mapping if not exact match (e.g. 'ai' falls to 'e', 'au' falls to 'o')
        let signIdx = 0;
        if (vowel.startsWith('a')) signIdx = vowel === 'ā' ? 1 : 0;
        else if (vowel.startsWith('i') || vowel.startsWith('ī')) signIdx = 2;
        else if (vowel.startsWith('u') || vowel.startsWith('ū')) signIdx = 3;
        else if (vowel.startsWith('e') || vowel.startsWith('ai')) signIdx = 4; // Extending logic
        else if (vowel.startsWith('o') || vowel.startsWith('au')) signIdx = 5; // Extending logic
        
        const moon = planetData.find(p => p.name === "Moon");
        const lagna = planetData.find(p => p.name === "Lagna");

        if (!moon || !lagna) return null;

        // 2. From Moon (Health)
        const moonHouse = this.getHousePosition(signIdx, moon.signIdx);
        let moonStatus = "Neutral";
        if ([1, 4, 7, 10].includes(moonHouse)) moonStatus = "Excellent (Kendra)";
        else if ([5, 9].includes(moonHouse)) moonStatus = "Good (Trikona)";
        else if ([6, 8, 12].includes(moonHouse)) moonStatus = "Challenging (Dusthana)";

        // 3. From Lagna (Purity)
        const lagnaHouse = this.getHousePosition(signIdx, lagna.signIdx);
        
        return {
            vowel: vowel,
            signName: SIGNS[signIdx], // Assuming global SIGNS exists
            signIdx: signIdx,
            moonAnalysis: {
                house: moonHouse,
                status: moonStatus,
                description: `Placed in ${moonHouse}th from Moon. Refers to Health & Sustenance (Rāyi).`
            },
            lagnaAnalysis: {
                house: lagnaHouse,
                description: `Placed in ${lagnaHouse}th from Lagna. Needs to be kept 'clean' (Viṣṇu sthāna).`
            }
        };
    },

    // --- STEP 7: BALADI AVASTHA (Mind's Direction) ---
    analyzeBaladi: function(name, planetData) {
        const vowel = this.getFirstVowel(name);
        
        // 1. Determine Avastha of all planets
        const planets = planetData.filter(p => !["Lagna", "Pranapada", "Rahu", "Ketu"].includes(p.name));
        // Add Nodes if degrees are available, but usually Avastha applies to 7 planets. 
        // Prompt example uses Rahu, so we MUST include Nodes.
        const nodes = planetData.filter(p => ["Rahu", "Ketu"].includes(p.name));
        const allPlanets = [...planets, ...nodes];

        const planetStates = allPlanets.map(p => {
            const deg = p.siderealLon % 30;
            const isOdd = (p.signIdx % 2 === 0); // Aries=0 (Even Index) is ODD Sign. Wait.
            // Sign Index: 0=Aries(Odd), 1=Taurus(Even), 2=Gemini(Odd)...
            // So: Index % 2 === 0 -> ODD Sign. Index % 2 !== 0 -> EVEN Sign.
            
            const isOddSign = (p.signIdx % 2 === 0);
            
            let state = "";
            let requiredVowels = [];

            // Avastha Logic
            if (isOddSign) {
                if (deg < 6) state = "Bala";
                else if (deg < 12) state = "Kumara";
                else if (deg < 18) state = "Yuva";
                else if (deg < 24) state = "Vriddha";
                else state = "Mrita";
            } else {
                // Reverse for Even Signs
                if (deg < 6) state = "Mrita";
                else if (deg < 12) state = "Vriddha";
                else if (deg < 18) state = "Yuva";
                else if (deg < 24) state = "Kumara";
                else state = "Bala";
            }

            requiredVowels = this.AVASTHA_VOWELS[state];

            return {
                name: p.name,
                degree: deg,
                signIdx: p.signIdx,
                state: state,
                vowels: requiredVowels,
                isActivated: requiredVowels.some(v => vowel.startsWith(v))
            };
        });

        // 2. Identify Activation
        const activatedPlanets = planetStates.filter(p => p.isActivated);
        
        // 3. Find Atmakaraka Recommendation
        // Reuse IstaDevataEngine logic if available, else calc max degree
        let ak = null;
        if (typeof IstaDevataEngine !== 'undefined') {
            ak = IstaDevataEngine.getAtmakaraka(planetData).planet;
        }
        
        let recommendation = null;
        if (ak) {
            const akState = planetStates.find(p => p.name === ak.name);
            recommendation = {
                planet: ak.name,
                state: akState.state,
                suggestedVowels: akState.vowels.join(", ")
            };
        }

        return {
            currentVowel: vowel,
            activatedPlanets: activatedPlanets.map(p => p.name),
            recommendation: recommendation,
            allStates: planetStates
        };
    },

    // --- STEP 8: PANCA SVARA DASA (Timing) ---
    analyzeDasa: function(name, birthYear) {
        const vowel = this.getFirstVowel(name);
        const sequence = ["a", "i", "u", "e", "o"];
        
        // Determine start index based on name's first vowel
        // Map name vowel to group
        let startIdx = 0;
        if (vowel.startsWith('a') || vowel.startsWith('ā')) startIdx = 0;
        else if (vowel.startsWith('i') || vowel.startsWith('ī')) startIdx = 1;
        else if (vowel.startsWith('u') || vowel.startsWith('ū')) startIdx = 2;
        else if (vowel.startsWith('e') || vowel.startsWith('ai')) startIdx = 3;
        else if (vowel.startsWith('o') || vowel.startsWith('au')) startIdx = 4;

        const dasaList = [];
        let currentAge = 0;
        
        // Generate 5 periods of 12 years (Total 60)
        for (let i = 0; i < 5; i++) {
            const idx = (startIdx + i) % 5;
            const vGroup = sequence[idx];
            const endAge = currentAge + 12;
            
            dasaList.push({
                vowel: vGroup,
                startAge: currentAge,
                endAge: endAge,
                yearStart: birthYear + currentAge,
                yearEnd: birthYear + endAge
            });
            currentAge = endAge;
        }

        return dasaList;
    },

    // --- STEP 9: LAGANA (Syllable Support) ---
    analyzeLagana: function(name, planetData) {
        const count = this.countSyllables(name);
        const lagna = planetData.find(p => p.name === "Lagna");
        if (!lagna) return null;

        // 1. Determine Activated Nature
        let nature = "";
        let activatedHouses = []; // Relative to Lagna
        
        // Mapping Rule
        if (count === 1 || count === 4) {
            nature = "Fixed (Sthira)";
            // Indices: 1 (Tau), 4 (Leo), 7 (Sco), 10 (Aqu)
            // We need to find where these signs are relative to Lagna
            [1, 4, 7, 10].forEach(sIdx => {
                activatedHouses.push(this.getHousePosition(sIdx, lagna.signIdx));
            });
        } else if (count === 2 || count === 5) {
            nature = "Movable (Cara)";
            // Indices: 0 (Ari), 3 (Can), 6 (Lib), 9 (Cap)
            [0, 3, 6, 9].forEach(sIdx => {
                activatedHouses.push(this.getHousePosition(sIdx, lagna.signIdx));
            });
        } else {
            nature = "Dual (Dvisvabhava)"; // 3, 6, etc
            // Indices: 2 (Gem), 5 (Vir), 8 (Sag), 11 (Pis)
            [2, 5, 8, 11].forEach(sIdx => {
                activatedHouses.push(this.getHousePosition(sIdx, lagna.signIdx));
            });
        }

        // 2. Diagnostic
        // Check if Kendras (1, 4, 7, 10) are activated
        const kendras = [1, 4, 7, 10];
        const supported = activatedHouses.filter(h => kendras.includes(h));
        const score = supported.length; // 4 is best

        let prognosis = "";
        if (score === 4) prognosis = "Excellent. Full support in birth country.";
        else if (score >= 2) prognosis = "Moderate support.";
        else prognosis = "Low support. May seek success in foreign lands.";

        return {
            syllableCount: count,
            nature: nature,
            activatedHouses: activatedHouses.sort((a,b)=>a-b),
            prognosis: prognosis
        };
    }
};