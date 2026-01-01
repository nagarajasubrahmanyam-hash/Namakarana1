const AstroWrapper = {
    getPositions: function(utcDate) {
        const jd = (utcDate.getTime() / 86400000) + 2440587.5;
        const prevDate = new Date(utcDate.getTime() - 2 * 60 * 60 * 1000); 
        
        return PLANET_LIST.map(p => {
            let lon, prevLon;
            if (p === "Rahu" || p === "Ketu") {
                const t = (jd - 2451545.0) / 36525;
                lon = (125.04452 - 1934.13626 * t) % 360;
                if (lon < 0) lon += 360;
                if (p === "Ketu") lon = (lon + 180) % 360;
                return { name: p, lon: lon, isRetro: true };
            }
            lon = Astronomy.Ecliptic(Astronomy.GeoVector(p, utcDate, true)).elon;
            prevLon = Astronomy.Ecliptic(Astronomy.GeoVector(p, prevDate, true)).elon;
            let isRetro = lon < prevLon;
            if (Math.abs(lon - prevLon) > 180) isRetro = !isRetro;
            return { name: p, lon: lon, isRetro: isRetro };
        });
    }
};