/**
 * SPECIAL ASCENDANTS ENGINE
 * Calculates Arudha (AL) and Varnada (VL) Lagnas.
 * Dependency: Astronomy Engine (for precise Sunrise)
 */
const SpecialAscendants = {

    normalize: function(deg) {
        let d = deg % 360;
        if (d < 0) d += 360;
        return d;
    },

    isEvenSign: function(deg) {
        const signIdx = Math.floor(this.normalize(deg) / 30);
        // Aries(0)=Odd, Taurus(1)=Even
        return (signIdx % 2 !== 0);
    },

    // --- 1. GET TRUE SUNRISE (Required for HL/VL) ---
    getSunrise: function(date, lat, lon) {
        try {
            if (typeof Astronomy === 'undefined') throw new Error("Astronomy lib missing");
            const observer = new Astronomy.Observer(lat, lon, 0);
            const midnight = new Date(date);
            midnight.setHours(0,0,0,0);
            
            const result = Astronomy.SearchRiseSet('Sun', observer, midnight, 1, 'rise');
            return result && result.date ? result.date : new Date(midnight.getTime() + 6*3600*1000); // Fallback 6am
        } catch (e) {
            const fb = new Date(date);
            fb.setHours(6, 0, 0, 0);
            return fb;
        }
    },

    // --- 2. ARUDHA LAGNA (AL) ---
    calculateAL: function(planetData) {
        const lagna = planetData.find(p => p.name === "Lagna");
        if (!lagna) return { signIdx: 0, name: "AL" };

        const lordName = PLANET_LIST[SIGN_LORDS[lagna.signIdx]];
        const lord = planetData.find(p => p.name === lordName);
        if (!lord) return { signIdx: 0, name: "AL" };

        // Count signs from House to Lord
        let dist = (lord.signIdx - lagna.signIdx + 12) % 12;
        
        // Project same distance forward
        let alIdx = (lord.signIdx + dist) % 12;

        // EXCEPTIONS (Jaimini/Parashara): 
        // If AL falls in 1st or 7th from original house, jump 10 signs.
        const rel = (alIdx - lagna.signIdx + 12) % 12;
        if (rel === 0 || rel === 6) {
            alIdx = (alIdx + 10) % 12;
        }

        return { signIdx: alIdx, name: "AL" };
    },

    // --- 3. VARNADA LAGNA (VL) ---
    calculateVL: function(planetData, utcDate, lat, lon) {
        const sun = planetData.find(p => p.name === "Sun");
        const lagna = planetData.find(p => p.name === "Lagna");
        
        if (!sun || !lagna) return { signIdx: 0, name: "VL" };

        // A. Calculate Hora Lagna (HL) = Sun + 30° per hour since Sunrise
        const sunriseDate = this.getSunrise(utcDate, lat, lon);
        const diffMs = utcDate.getTime() - sunriseDate.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60); 
        
        // If birth is before sunrise, diffHrs is negative, logic holds (Sun position adjusts backwards)
        const hlDeg = this.normalize(sun.siderealLon + (diffHrs * 30));
        
        // B. Calculate Varnada (VL) - Degree Method
        const lagnaOdd = !this.isEvenSign(lagna.siderealLon);
        const hlOdd = !this.isEvenSign(hlDeg);

        // Effective positions
        let valL = lagnaOdd ? lagna.siderealLon : (360 - lagna.siderealLon);
        let valH = hlOdd ? hlDeg : (360 - hlDeg);

        // Interaction: Same Parity = Add, Diff Parity = Subtract
        let resDeg = (lagnaOdd === hlOdd) ? (valL + valH) : Math.abs(valL - valH);
        resDeg = this.normalize(resDeg);

        // Final Mapping: If Lagna Even, result is reversed
        let vlDeg = lagnaOdd ? resDeg : this.normalize(360 - resDeg);
        const vlSignIdx = Math.floor(vlDeg / 30);

        return { signIdx: vlSignIdx, name: "VL" };
    },

    // --- 4. CALCULATE TIME-BASED LAGNAS (HL, GL) ---
    calculateTimePoints: function(planetData, utcDate, lat, lon) {
        const sun = planetData.find(p => p.name === "Sun");
        if (!sun) return [];

        // Calculate hours since sunrise
        const sunrise = this.getSunrise(utcDate, lat, lon);
        let diffMs = utcDate.getTime() - sunrise.getTime();
        
        // Handle birth before sunrise (previous day's sunrise logic approximation)
        // or just treat negative diff as wrapping around, but for simplicity:
        if (diffMs < 0) diffMs += 24 * 3600 * 1000; 

        const hrs = diffMs / (1000 * 60 * 60);

        // HL (Hora Lagna): Moves 30° (1 sign) per hour
        const hlDeg = this.normalize(sun.siderealLon + (hrs * 30));
        
        // GL (Ghatika Lagna): Moves 1 sign per Ghati (24mins) -> 75° per hour
        const glDeg = this.normalize(sun.siderealLon + (hrs * 75));

        return [
            { name: "HL", signIdx: Math.floor(hlDeg / 30) },
            { name: "GL", signIdx: Math.floor(glDeg / 30) }
        ];
    }

    
};