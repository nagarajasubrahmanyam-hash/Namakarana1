/**
 * VEDIC ENGINE CONSTANTS
 * Complete definition for Signs, Planets, Dignities, and Sounds.
 */

// 1. Basic Zodiac & Astronomy
const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const PLANET_LIST = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

// 2. Sign Lordship Mapping (Index 0-11)
// Used for logic when a house is empty
const SIGN_LORDS = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];

// 3. Dignity Rules (1-based Sign Index: Aries=1, Pisces=12)

// Exaltation Signs
const EXALT = { 
    "Sun": 1, "Moon": 2, "Mars": 10, "Mercury": 6, 
    "Jupiter": 4, "Venus": 12, "Saturn": 7,
    "Rahu": 2, "Ketu": 8
};

// Debilitation Signs
const DEBIL = { 
    "Sun": 7, "Moon": 8, "Mars": 4, "Mercury": 12, 
    "Jupiter": 10, "Venus": 6, "Saturn": 1,
    "Rahu": 8, "Ketu": 2
};

// Own Signs (The missing part that caused your error)
const OWNED = { 
    "Sun": [5], 
    "Moon": [4], 
    "Mars": [1, 8], 
    "Mercury": [3, 6], 
    "Jupiter": [9, 12], 
    "Venus": [2, 7], 
    "Saturn": [10, 11],
    "Rahu": [11], // Co-lord of Aquarius
    "Ketu": [8]   // Co-lord of Scorpio
};

// 4. Hoda Cakra (Sound Phonemes for Step 2)
const HODA_CAKRA = {
    "chu": 0, "che": 0, "cho": 0, "la": 0, "li": 0,
    "lu": 1, "le": 1, "lo": 1, "vi": 1, "vu": 1, "ve": 1, "vo": 1,
    "ka": 2, "ki": 2, "ku": 2, "gh": 2, "cha": 2, "ke": 2, "ko": 2,
    "hi": 3, "hu": 3, "he": 3, "ho": 3, "da": 3, "di": 3,
    "ma": 4, "mi": 4, "mu": 4, "me": 4, "mo": 4, "ta": 4,
    "pa": 5, "pi": 5, "pu": 5, "sha": 5, "na": 5, "tha": 5,
    "ra": 6, "ri": 6, "ru": 6, "re": 6, "ro": 6, "ta": 6,
    "to": 7, "na": 7, "ni": 7, "nu": 7, "ne": 7, "ya": 7, "yi": 7,
    "ye": 8, "yo": 8, "bha": 8, "bhi": 8, "bhu": 8, "dha": 8,
    "bho": 9, "ja": 9, "ji": 9, "khi": 9, "khu": 9, "khe": 9,
    "gu": 10, "ge": 10, "go": 10, "sa": 10, "si": 10, "su": 10,
    "di": 11, "du": 11, "tha": 11, "jha": 11, "de": 11, "do": 11
};

// 5. D60 Deities (Required by Vedic Engine for 'formatData')
const D60_DEITIES = [
    "Ghora", "Rakshasa", "Deva", "Kubera", "Yaksha", "Kindara", "Bhrashta", "Kulaghna",
    "Garala", "Vahni", "Maya", "Purishaka", "Apampati", "Marutwan", "Kaala", "Sarpa",
    "Amrita", "Indu", "Mridu", "Komala", "Heramba", "Brahma", "Vishnu", "Maheshwara",
    "Deva", "Arudra", "Kalinasana", "Kshitishwara", "Kamalakara", "Gulika", "Mrityu", "Kaala",
    "Davagni", "Ghora", "Adhama", "Kantaka", "Vishadagdha", "Amrita", "Poornachandra", "Vishadagdha",
    "Kulanasa", "Vamshakshaya", "Utpata", "Kaala", "Saumya", "Komala", "Sheetala", "Karaladamshtra",
    "Chandramukhi", "Praveena", "Kaalagni", "Dandayudha", "Nirmala", "Saumya", "Crura", "Atisheetala",
    "Amrita", "Payodhi", "Bhramana", "Chandrarekha"
];