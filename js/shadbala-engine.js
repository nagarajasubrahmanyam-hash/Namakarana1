/**
 * STEP 2: SHADBALA ENGINE (Approximate)
 * Calculates Planetary Strength to determine the First Syllable.
 * Logic: Exaltation + Position + Direction (Dig Bala)
 */
const ShadbalaEngine = {

    // 1. Calculate Strength Score (0-100 Scale Approximation)
    calculateStrength: function(p, planetData) {
        let score = 0;
        
        // A. STHANA BALA (Positional Strength)
        // Check Exaltation/Debilitation (from Constants)
        const sNum = p.signIdx + 1; // 1-based index
        
        if (EXALT[p.name] === sNum) score += 60; // Exalted (Ucca)
        else if (DEBIL[p.name] === sNum) score += 0; // Debilitated (Nīca)
        else if (OWNED[p.name]?.includes(sNum)) score += 30; // Own Sign (Swakshetra)
        else score += 15; // Neutral/Friend (Average)

        // B. KENDRA BALA (House Placement)
        // We need Lagna to determine House.
        const lagna = planetData.find(pl => pl.name === "Lagna");
        if (lagna) {
            // Calculate House (1-based)
            const house = ((p.signIdx - lagna.signIdx + 12) % 12) + 1;
            
            // Kendras (1, 4, 7, 10) get high strength
            if ([1, 4, 7, 10].includes(house)) score += 20;
            // Trikonas (5, 9) get moderate strength
            else if ([5, 9].includes(house)) score += 10;
            // Dusthanas (6, 8, 12) lose strength
            else if ([6, 8, 12].includes(house)) score -= 10;

            // C. DIG BALA (Directional Strength)
            // Sun/Mars strong in 10th (South)
            if (["Sun", "Mars"].includes(p.name) && house === 10) score += 20;
            // Moon/Venus strong in 4th (North)
            if (["Moon", "Venus"].includes(p.name) && house === 4) score += 20;
            // Saturn strong in 7th (West)
            if (p.name === "Saturn" && house === 7) score += 20;
            // Mercury/Jupiter strong in 1st (East)
            if (["Mercury", "Jupiter"].includes(p.name) && house === 1) score += 20;
        }

        return Math.max(0, score); // No negative scores
    },

    // 2. Get Sound Mapping (Step 3 Logic)
    getSoundGroup: function(planetName) {
        switch (planetName) {
            case "Sun": return { group: "Vowels (Svara)", sounds: "a, ā, i, ī, u, ū, ṛ, ṝ, ḷ, e, ai, o, au" };
            case "Mars": return { group: "Guttural (Ka-varga)", sounds: "ka, kha, ga, gha, ṅa" };
            case "Venus": return { group: "Palatal (Ca-varga)", sounds: "ca, cha, ja, jha, ña" };
            case "Mercury": return { group: "Cerebral (Ṭa-varga)", sounds: "ṭa, ṭha, ḍa, ḍha, ṇa" };
            case "Jupiter": return { group: "Dental (Ta-varga)", sounds: "ta, tha, da, dha, na" };
            case "Saturn": return { group: "Labial (Pa-varga)", sounds: "pa, pha, ba, bha, ma" };
            case "Moon": return { group: "Semi-vowels & Sibilants", sounds: "ya, ra, la, va, śa, ṣa, sa, ha" };
            case "Rahu": return { group: "Expansive/Foreign", sounds: "Reverse order of Saturn (approx)" };
            case "Ketu": return { group: "Contractive", sounds: "Reverse order of Mars (approx)" };
            default: return { group: "Unknown", sounds: "--" };
        }
    },

    // 3. Main Analysis Function
    analyze: function(planetData) {
        // Filter only the 7 physical planets + Rahu/Ketu if desired
        const corePlanets = planetData.filter(p => PLANET_LIST.includes(p.name));
        
        const scoredPlanets = corePlanets.map(p => {
            const strength = this.calculateStrength(p, planetData);
            const soundInfo = this.getSoundGroup(p.name);
            return {
                name: p.name,
                score: strength,
                soundGroup: soundInfo.group,
                sounds: soundInfo.sounds
            };
        });

        // Sort Descending (Strongest First)
        scoredPlanets.sort((a, b) => b.score - a.score);

        return {
            strongest: scoredPlanets[0], // Human Rule
            weakest: scoredPlanets[scoredPlanets.length - 1], // Avatar Rule
            allScores: scoredPlanets
        };
    }
};