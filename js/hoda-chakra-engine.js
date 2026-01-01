/**
 * STEP 5: HODA CHAKRA ENGINE
 * Filters sounds based on harmonic relationship with Moon and Lagna.
 * Logic: Hoda Key -> Sign -> Relative House -> Score
 */
const HodaChakraEngine = {

    // Helper: Calculate Relative House (1-12)
    getRelativeHouse: function(targetSignIdx, sourceSignIdx) {
        return ((targetSignIdx - sourceSignIdx + 12) % 12) + 1;
    },

    // Helper: Evaluate House Position
    evaluatePosition: function(houseNum) {
        // Excellent: Kendras (1, 4, 7, 10)
        if ([1, 4, 7, 10].includes(houseNum)) return { type: 'Kendra', score: 2, class: 'good' };
        // Good: Trikonas (5, 9)
        if ([5, 9].includes(houseNum)) return { type: 'Kona', score: 1.5, class: 'good' };
        // Neutral: Upachayas/Money (2, 3, 11) - 3 is debatable, often mild struggle
        if ([2, 11].includes(houseNum)) return { type: 'Neutral', score: 1, class: 'neutral' };
        if (houseNum === 3) return { type: 'Upachaya', score: 0.5, class: 'neutral' };
        // Bad: Dusthanas (6, 8, 12)
        if ([6, 8, 12].includes(houseNum)) return { type: 'Dusthana', score: -2, class: 'bad' };
        
        return { type: 'Neutral', score: 0, class: 'neutral' };
    },

    // Helper: Get specific Hoda keys for a Planet (based on Consonant groups)
    getHodaKeysForPlanet: function(planet) {
        const allKeys = Object.keys(HODA_CAKRA);
        switch(planet) {
            // Mars: Ka-varga (k, kh, g, gh, ng)
            case "Mars": return allKeys.filter(k => k.match(/^(k|g|ng)/));
            // Venus: Ca-varga (c, ch, j, jh, n)
            case "Venus": return allKeys.filter(k => k.match(/^(c|ch|j|jh)/)); 
            // Mercury: Ta-varga (t, th, d, dh, n) - Cerebral
            // Note: Hoda Cakra often mixes dental/cerebral. We broadly grab T/D/N sounds.
            case "Mercury": return allKeys.filter(k => k.match(/^(t|d|n)/) && !k.match(/^(th|dh)/));
            // Jupiter: Ta-varga (Dental)
            case "Jupiter": return allKeys.filter(k => k.match(/^(t|d|n|th|dh)/)); 
            // Saturn: Pa-varga (p, ph, b, bh, m)
            case "Saturn": return allKeys.filter(k => k.match(/^(p|ph|b|bh|m)/));
            // Sun: Vowels (Simulated mapping as Hoda Cakra is mostly consonants)
            case "Sun": return ["a", "i", "u", "e", "o"]; 
            // Moon: Y, R, L, V, S, H
            case "Moon": return allKeys.filter(k => k.match(/^(y|r|l|v|s|sh|h)/));
            // Rahu/Ketu: Fallbacks
            case "Rahu": return allKeys.filter(k => k.match(/^(p|b|m)/)); // Like Saturn
            case "Ketu": return allKeys.filter(k => k.match(/^(k|g)/)); // Like Mars
            default: return [];
        }
    },

    analyze: function(planetName, planetData) {
        // 1. Get Reference Points
        const moon = planetData.find(p => p.name === "Moon");
        const lagna = planetData.find(p => p.name === "Lagna");
        if (!moon || !lagna) return [];

        // 2. Get Potential Sounds
        const sounds = this.getHodaKeysForPlanet(planetName);
        if (sounds.length === 0) return [];

        // 3. Evaluate Each Sound
        const results = sounds.map(syllable => {
            const signIdx = HODA_CAKRA[syllable];
            if (signIdx === undefined) return null;

            // Check against Moon (Primary Factor for Body/Mind)
            const fromMoon = this.getRelativeHouse(signIdx, moon.signIdx);
            const moonEval = this.evaluatePosition(fromMoon);

            // Check against Lagna (Secondary Factor for Life Path)
            const fromLagna = this.getRelativeHouse(signIdx, lagna.signIdx);
            const lagnaEval = this.evaluatePosition(fromLagna);

            // Total Score calculation
            let totalScore = moonEval.score + lagnaEval.score;

            // CRITICAL OVERRIDE: 
            // If sound is 6, 8, or 12 from Moon, it is REJECTED regardless of Lagna.
            if (moonEval.class === 'bad') totalScore = -10;

            return {
                syllable: syllable,
                signName: SIGNS[signIdx],
                moonStatus: moonEval,
                lagnaStatus: lagnaEval,
                totalScore: totalScore,
                isRecommended: totalScore > 0
            };
        }).filter(r => r !== null);

        // 4. Remove Duplicates (Multiple syllables might map to same sign/result)
        // Actually, we want to show specific syllables, so keep duplicates but sort them.
        
        // 5. Sort: Recommended First
        results.sort((a, b) => b.totalScore - a.totalScore);

        return results;
    }
};