/**
 * STEP 1: ISTA-DEVATA ENGINE
 * Diagnostic method for Nāmakaraṇa (Naming)
 * Source: Visty Larsen / Acyutānanda Tradition
 */
const IstaDevataEngine = {

    // --- 1. FIND ATMAKARAKA (AK) ---
    getAtmakaraka: function(planetData) {
        // Filter out Lagna, Pranapada, and Ketu (Ketu is excluded as per source)
        const candidates = planetData.filter(p => 
            p.name !== "Lagna" && 
            p.name !== "Pranapada" && 
            p.name !== "Ketu"
        );

        let akPlanet = null;
        let maxDegree = -1;

        candidates.forEach(p => {
            let degreeToCheck = p.siderealLon % 30;

            // Special Rule for Rahu: Deduct from 30
            if (p.name === "Rahu") {
                degreeToCheck = 30 - degreeToCheck;
            }

            if (degreeToCheck > maxDegree) {
                maxDegree = degreeToCheck;
                akPlanet = p;
            }
        });

        return {
            planet: akPlanet,
            degree: maxDegree
        };
    },

    // --- 2. ANALYZE 12TH FROM AK IN D9 ---
    analyze: function(planetData) {
        // A. Get AK
        const akData = this.getAtmakaraka(planetData);
        if (!akData.planet) return null;

        const akName = akData.planet.name;
        const akD9SignIdx = akData.planet.d9Idx; // 0-11 index

        // B. Find 12th from AK in D9 (Jivanmuktamsa)
        // 12th house = 1 sign back or +11 signs forward
        const istaSignIdx = (akD9SignIdx + 11) % 12;
        const istaSignName = SIGNS[istaSignIdx];

        // C. Find Planets in this 12th Sign (in D9)
        const occupants = planetData.filter(p => 
            p.d9Idx === istaSignIdx && 
            p.name !== "Lagna" && 
            p.name !== "Pranapada" // Exclude mathematical points
        );

        // D. Check for Debilitation (Nīca)
        // Source: "If planets here are debilitated... name should specifically pick up"
        const results = occupants.map(p => {
            const isDebilitated = (DEBIL[p.name] === (istaSignIdx + 1)); // DEBIL uses 1-based index
            return {
                name: p.name,
                isDebilitated: isDebilitated,
                details: isDebilitated ? "Debilitated (Requires 'picking up' name)" : "Strong"
            };
        });

        // E. Fallback: If empty, find the Lord
        let lordObj = null;
        if (results.length === 0) {
            // SIGN_LORDS is 0-indexed planet index. We need to map it back to name.
            // PLANET_LIST = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
            const lordIndex = SIGN_LORDS[istaSignIdx];
            const lordName = PLANET_LIST[lordIndex];
            lordObj = {
                name: lordName,
                isLord: true,
                details: `Lord of ${istaSignName} (House is Empty)`
            };
        }

        return {
            ak: akData.planet,
            akDegree: akData.degree,
            istaSign: istaSignName,
            istaSignIdx: istaSignIdx,
            candidates: results,
            lord: lordObj
        };
    }
};