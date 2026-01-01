/**
 * APP ORCHESTRATOR - ACYUTANANDA NAMING TOOL & AUDITOR
 * Integrates: Ista-devata, Shadbala, Hoda Chakra (AL/VL), Svara (Step 6-9), and Katapayadi.
 */
const app = {
    // --- STATE MANAGEMENT ---
    currentShadbalaData: null, // Stores Step 2 ranking
    lastCalcData: null,        // Stores planetary positions for Step 5 analysis
    searchTimeout: null,

    // --- 1. INITIALIZATION ---
    init: function() {
        // A. Theme Setup
        const storedTheme = localStorage.getItem('vedic_theme') || 'light';
        document.documentElement.setAttribute('data-theme', storedTheme);

        // B. Date/Time Defaults (Now)
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        // Correctly handle local time string 
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

        if (document.getElementById('m_dob')) document.getElementById('m_dob').value = dateStr;
        if (document.getElementById('m_tob')) document.getElementById('m_tob').value = timeStr;

        // C. Auto-Location
        this.autoLocate('m');

        // D. UI Reset (Hide all result panels)
        const panelsToHide = [
            'naming_guide_panel', 
            'step2_panel', 
            'hoda_chakra_panel', 
            'svara_panel', 
            'visual_lab_section',
            'tab_katapayadi' // Hide secondary tab content initially
        ];
        panelsToHide.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });

        // Ensure Naming Tab is visible by default
        const namingTab = document.getElementById('tab_naming');
        if(namingTab) namingTab.style.display = 'block';

        // E. Event Listeners
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-group-box')) {
                const res = document.getElementById('m_city_results');
                if (res) res.style.display = 'none';
            }
        });
    },

    toggleTheme: function() {
        const html = document.documentElement;
        const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('vedic_theme', next);
    },

    // --- TAB SWITCHING ---
    switchTab: function(tabName) {
        // 1. Manage Naming Tool Visibility
        const namingTab = document.getElementById('tab_naming');
        if (namingTab) {
            namingTab.style.display = (tabName === 'naming') ? 'block' : 'none';
        }

        // 2. Manage Katapayadi Visibility
        const kpTab = document.getElementById('tab_katapayadi');
        if (kpTab) kpTab.style.display = (tabName === 'katapayadi') ? 'block' : 'none';

        // 3. Update Button State
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        // Find button that calls this function with specific tabName
        const activeBtns = document.querySelectorAll(`.tab-btn`);
        activeBtns.forEach(btn => {
            if(btn.getAttribute('onclick').includes(tabName)) btn.classList.add('active');
        });
    },

    // --- TIMEZONE LOGIC (The Correct Way) ---
    tz: {
        // 1. Get Timezone ID from Lat/Lon (Using free API)
        fetchZone: async function(lat, lon) {
            try {
                // Using timeapi.io (free, no key required)
                const res = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`);
                const data = await res.json();
                return data.timeZone; // Returns e.g., "America/New_York"
            } catch (e) {
                console.warn("Timezone API failed, falling back to browser default", e);
                return Intl.DateTimeFormat().resolvedOptions().timeZone;
            }
        },

        // 2. Calculate offset for a specific historical date
        getOffset: function(timeZone, dateObj) {
            try {
                // Create a date string in the Target Zone and UTC
                // We use 'en-US' to ensure consistent format for parsing
                const strTarget = dateObj.toLocaleString('en-US', { timeZone: timeZone });
                const strUTC = dateObj.toLocaleString('en-US', { timeZone: 'UTC' });

                // Create Date objects from those strings
                const dateTarget = new Date(strTarget);
                const dateUTC = new Date(strUTC);

                // Calculate difference in hours
                const diffMs = dateTarget.getTime() - dateUTC.getTime();
                return diffMs / (1000 * 60 * 60);
            } catch (e) {
                console.error("Offset calculation error", e);
                return 0;
            }
        },

        // 3. Update the UI
        updateUI: async function(pfx, lat, lon) {
            const statusEl = document.getElementById(`${pfx}_tz_status`);
            if(statusEl) statusEl.innerText = "⏳ Fetching Timezone...";

            // A. Get Zone Name
            const zoneId = await this.fetchZone(lat, lon);
            
            // B. Get Date of Birth
            const dobRaw = document.getElementById(`${pfx}_dob`).value;
            const tobRaw = document.getElementById(`${pfx}_tob`).value || "12:00";
            const dateObj = new Date(`${dobRaw}T${tobRaw}`);

            // C. Calculate Historical Offset
            const offset = this.getOffset(zoneId, dateObj);

            // D. Set Dropdown
            const sel = document.getElementById(`${pfx}_tz`);
            
            // Add option if it doesn't exist (e.g., -4.5)
            let exists = Array.from(sel.options).some(opt => parseFloat(opt.value) === offset);
            if (!exists) {
                // Create new option: "America/New_York (UTC -4)"
                const label = `${zoneId} (UTC ${offset >= 0 ? '+' : ''}${offset})`;
                const newOpt = new Option(label, offset);
                
                // Add to top of list
                sel.add(newOpt, 0);
                sel.value = offset;
            } else {
                sel.value = offset;
            }

            // Visual Confirmation
            if(statusEl) {
                statusEl.innerHTML = `✅ <strong>${zoneId}</strong> detected.<br>Offset on birth date: <strong>UTC ${offset >= 0 ? '+' : ''}${offset}</strong>`;
                statusEl.style.color = "var(--success)";
            }
        }
    },

    // --- UI HANDLERS ---
    ui: {
        handleSearchDebounced: function(pfx) { 
            clearTimeout(app.searchTimeout); 
            app.searchTimeout = setTimeout(() => this.handleSearch(pfx), 400); 
        },
        
        handleSearch: async function(pfx) { 
            const q = document.getElementById(`${pfx}_city`).value; 
            if (q.length < 3) return;
            
            const box = document.getElementById(`${pfx}_city_results`);
            box.innerText = "Searching...";
            box.style.display = 'block';

            try {
                // Using Nominatim for City Search
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`);
                const data = await res.json();
                
                box.innerHTML = data.map(c => `
                    <div class="search-item" onclick="app.ui.pickCity('${pfx}', ${c.lat}, ${c.lon}, '${c.display_name.replace(/'/g, "")}')">
                        ${c.display_name.split(',').slice(0,2).join(',')}
                    </div>`).join('');
            } catch(e) { 
                console.error("Search failed", e);
                box.innerText = "Error fetching cities.";
            }
        },

        pickCity: function(pfx, lat, lon, name) { 
            // 1. Set City Data
            document.getElementById(`${pfx}_lat`).value = lat; 
            document.getElementById(`${pfx}_lon`).value = lon; 
            document.getElementById(`${pfx}_city`).value = name; 
            document.getElementById(`${pfx}_city_results`).style.display = 'none'; 
            
            // 2. TRIGGER TIMEZONE DETECTION (The Core Logic)
            app.tz.updateUI(pfx, lat, lon);
        }
    },

    // --- 2. MAIN CALCULATION ENGINE (NAMING TOOL) ---
    calculate: function(pfx) {
        // A. Input Validation
        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);

        if (!dobRaw || !tobRaw || isNaN(lat)) { 
            alert("Please enter valid Birth Date, Time, and City."); 
            return; 
        }

        // B. Astronomy Calculation
        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        const pseudoUtc = Date.UTC(y, m - 1, d, h, min, s || 0);
        // Adjust for Timezone to get True UTC
        const utcDate = new Date(pseudoUtc - (tz * 3600000));
        
        // C. Vedic Math
        const ayanamsa = VedicEngine.getAyanamsa(utcDate);
        const lagnaDeg = VedicEngine.calculateLagna(utcDate, lat, lon, ayanamsa);
        const pPositions = AstroWrapper.getPositions(utcDate);

        // D. Data Formatting
        const planetData = [VedicEngine.formatData("Lagna", lagnaDeg, false, 0, lagnaDeg, true)];
        pPositions.forEach(p => planetData.push(VedicEngine.formatData(p.name, p.lon, p.isRetro, ayanamsa, lagnaDeg)));
        
        // **CRITICAL**: Save data globally so Step 5 can access Moon/Lagna later
        this.lastCalcData = planetData;

        // --- EXECUTE STEPS ---

        // Step 1: Ista Devata
        if (typeof IstaDevataEngine !== 'undefined') {
            this.renderNamingStep1(IstaDevataEngine.analyze(planetData));
        }

        // Step 2: Shadbala (Strength) -> This triggers Step 5 internally
        if (typeof ShadbalaEngine !== 'undefined') {
            this.renderNamingStep2(ShadbalaEngine.analyze(planetData));
        }

        // Step 6-9: Svara Analysis (New)
        if (typeof SvaraEngine !== 'undefined') {
            const name = document.getElementById(`${pfx}_name`).value || "Child"; // Get name input
            const birthYear = new Date(pseudoUtc).getFullYear();
            
            // Run Calculations
            const svaraData = SvaraEngine.analyzeSvara(name, this.lastCalcData);
            const baladiData = SvaraEngine.analyzeBaladi(name, this.lastCalcData);
            const dasaData = SvaraEngine.analyzeDasa(name, birthYear);
            const laganaData = SvaraEngine.analyzeLagana(name, this.lastCalcData);

            // Render Panel
            this.renderSvaraPanel(svaraData, baladiData, dasaData, laganaData);
        }

        // Reference Chart (D9)
        document.getElementById('visual_lab_section').style.display = 'block';
        this.renderSouthIndianChart("si_chart1", planetData, "D9");
    },

    // --- 3. RENDERERS ---

    // Step 1: Ista Devata
    renderNamingStep1: function(data) {
        if (!data) return;
        document.getElementById('naming_guide_panel').style.display = 'block';
        
        // AK & Sign
        document.getElementById('ng_ak_name').innerText = data.ak.name.substring(0, 2);
        document.getElementById('ng_ak_deg').innerText = data.akDegree.toFixed(2) + "°";
        document.getElementById('ng_ista_sign').innerText = data.istaSign;

        // Candidates List
        const list = document.getElementById('ng_candidates_list');
        list.innerHTML = "";
        
        let guidance = "Check placement strength.";
        
        if (data.candidates.length > 0) {
            data.candidates.forEach(c => {
                const color = c.isDebilitated ? '#ef4444' : '#10b981';
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid var(--border);">
                        <div style="font-weight:bold;">${c.name}</div>
                        <div style="font-size:0.8rem; color:${color};">${c.details}</div>
                    </div>`;
                if(c.isDebilitated) guidance = c.guidance;
            });
        } else {
            // Empty House -> Lord
            list.innerHTML = `
                <div style="padding:8px; background:var(--hover-bg);">
                    <div style="font-weight:bold; color:var(--primary);">${data.lord.name} (Lord)</div>
                    <div style="font-size:0.8rem;">House empty. Using Sign Lord.</div>
                </div>`;
        }
        document.getElementById('ng_guidance_text').innerText = guidance;
    },

    // Step 2: Shadbala List
    renderNamingStep2: function(data) {
        const panel = document.getElementById('step2_panel');
        panel.style.display = 'block';
        
        const list = document.getElementById('ng_shadbala_list');
        list.innerHTML = "";
        
        this.currentShadbalaData = data.allScores;

        data.allScores.forEach((p, idx) => {
            let badge = "";
            let rowClass = "planet-row";
            
            // Auto-Select Strongest (Human Rule)
            if (idx === 0) { 
                badge = '<span class="role-badge human">Strongest</span>'; 
                rowClass += " active"; 
                this.selectPlanetSound(p.name); // Trigger Selection Logic
            }
            // Mark Weakest (Avatar Rule)
            else if (idx === data.allScores.length - 1) { 
                badge = '<span class="role-badge avatar">Weakest</span>'; 
            }

            list.innerHTML += `
                <div id="row_${p.name}" class="${rowClass}" onclick="app.selectPlanetSound('${p.name}')">
                    <div style="display:flex; justify-content:space-between; font-weight:700;">
                        <span>${p.name}</span>${badge}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Score: ${p.score}</div>
                </div>`;
        });
    },

    // INTERACTIVITY: Select Planet -> Update Right Panel -> Trigger Step 5
    selectPlanetSound: function(name) {
        const pData = this.currentShadbalaData.find(p => p.name === name);
        if (!pData) return;

        // A. Update Visuals (Active State)
        document.querySelectorAll('.planet-row').forEach(el => el.classList.remove('active'));
        const row = document.getElementById(`row_${name}`);
        if(row) row.classList.add('active');

        // B. Update Step 2 Right Panel (General Sounds)
        document.getElementById('ng_selected_planet').innerText = pData.name;
        document.getElementById('ng_selected_score').innerText = pData.score;
        document.getElementById('ng_selected_group').innerText = pData.soundGroup;
        document.getElementById('ng_selected_sounds').innerText = pData.sounds;

        // C. TRIGGER STEP 5: HODA CHAKRA ANALYSIS
        if (typeof HodaChakraEngine !== 'undefined' && this.lastCalcData) {
            const hcResults = HodaChakraEngine.analyze(name, this.lastCalcData);
            this.renderHodaChakraPanel(hcResults, name);
        }
    },

    // --- STEP 5: RENDER HODA CHAKRA CHART (with Special Ascendants) ---
    renderHodaChakraPanel: function(results, planetName) {
        const panel = document.getElementById('hoda_chakra_panel');
        panel.style.display = 'block';
        document.getElementById('hc_planet_name').innerText = planetName;
        
        // --- 1. Calculate Special Points (AL & VL) ---
        let specialPoints = [];
        
        if (typeof SpecialAscendants !== 'undefined' && this.lastCalcData) {
            // A. Arudha Lagna (AL)
            const al = SpecialAscendants.calculateAL(this.lastCalcData);
            specialPoints.push(al);

            // B. Varnada Lagna (VL)
            try {
                const dobRaw = document.getElementById('m_dob').value;
                const tobRaw = document.getElementById('m_tob').value;
                const tz = parseFloat(document.getElementById('m_tz').value);
                const lat = parseFloat(document.getElementById('m_lat').value);
                const lon = parseFloat(document.getElementById('m_lon').value);

                if (dobRaw && tobRaw) {
                    const [y, m, d] = dobRaw.split('-').map(Number);
                    const [h, min, s] = tobRaw.split(':').map(Number);
                    const pseudoUtc = Date.UTC(y, m - 1, d, h, min, s || 0);
                    const utcDate = new Date(pseudoUtc - (tz * 3600000));
                    
                    const vl = SpecialAscendants.calculateVL(this.lastCalcData, utcDate, lat, lon);
                    specialPoints.push(vl);
                }
            } catch (e) {
                console.error("Could not calculate VL:", e);
            }
        }

        // --- 2. Prepare Data for Chart ---
        const chartContainer = document.getElementById('hc_chart_container');
        chartContainer.innerHTML = "";
        
        // Reference Points for Gold Highlighting
        const moon = this.lastCalcData.find(p => p.name === "Moon");
        const alPoint = specialPoints.find(p => p.name === "AL");
        
        // --- 3. Render South Indian Chart Grid ---
        const gridMap = [11, 0, 1, 2, 10, null, null, 3, 9, null, null, 4, 8, 7, 6, 5];
        
        gridMap.forEach((sIdx, i) => {
            // Center Box
            if (sIdx === null) {
                if (i === 5) {
                    chartContainer.innerHTML += `
                        <div class="si-center" style="flex-direction:column;">
                            <span style="font-size:0.8rem; color:var(--text-muted);">HARMONIC</span>
                            <span style="font-size:1.2rem; font-weight:900; color:var(--primary);">HODA</span>
                        </div>`;
                }
                return;
            }

            // A. Calculate Heatmap Score (Gold Variation)
            let heatScore = 0;
            let isBad = false;

            if (moon) {
                const houseFromMoon = ((sIdx - moon.signIdx + 12) % 12) + 1;
                if ([1,4,7,10].includes(houseFromMoon)) heatScore += 2;
                else if ([5,9].includes(houseFromMoon)) heatScore += 1;
                else if ([6,8,12].includes(houseFromMoon)) isBad = true;
            }
            // Add AL weight if available
            if (alPoint) {
                const houseFromAL = ((sIdx - alPoint.signIdx + 12) % 12) + 1;
                if ([1,4,7,10].includes(houseFromAL)) heatScore += 1; 
            }

            // Determine Background Class
            let bgClass = "";
            if (isBad) bgClass = "bg-bad"; // Overrides gold
            else if (heatScore >= 3) bgClass = "bg-gold-dark"; // Kendra from Moon AND AL
            else if (heatScore >= 2) bgClass = "bg-gold-med";  // Kendra from Moon
            else if (heatScore >= 1) bgClass = "bg-gold-light"; // Kona

            // B. Get Contents
            const planetsInSign = this.lastCalcData.filter(p => p.signIdx === sIdx && !p.isLagna);
            const isLagna = this.lastCalcData.find(p => p.isLagna && p.signIdx === sIdx);
            const specialsInSign = specialPoints.filter(p => p.signIdx === sIdx);
            const validSounds = results.filter(r => HODA_CAKRA[r.syllable] === sIdx);

            // C. Build HTML
            let html = `<div class="si-box ${bgClass} ${isLagna ? 'si-lagna' : ''}">`;
            
            // Sign Label
            html += `<span class="si-sign-label">${SIGNS[sIdx].substring(0,3)}</span>`;
            
            // Special Points Container (Top Right Stack)
            if (specialsInSign.length > 0) {
                html += `<div class="si-special-container">`;
                specialsInSign.forEach(sp => {
                    const spClass = sp.name === 'AL' ? 'sp-al' : 'sp-vl';
                    html += `<span class="si-special-pt ${spClass}">${sp.name}</span>`;
                });
                html += `</div>`;
            }

            // Planets - Middle Row
            html += `<div class="si-planet-row">`;
            planetsInSign.forEach(p => {
                html += `<span>${p.name.substring(0,2)}</span>`;
            });
            html += `</div>`;

            // SOUNDS - Bottom Row
            if (validSounds.length > 0) {
                html += `<div class="si-sound-row">`;
                validSounds.forEach(vs => {
                    html += `<span class="sound-chip">${vs.syllable}</span>`;
                });
                html += `</div>`;
            }

            html += `</div>`;
            chartContainer.innerHTML += html;
        });
    },

    // --- STEP 6-9: RENDER SVARA PANEL ---
    renderSvaraPanel: function(svara, baladi, dasa, lagana) {
        if(!svara) return;
        const panel = document.getElementById('svara_panel');
        panel.style.display = 'block';

        // 1. Vowel & Moon/Lagna
        document.getElementById('sv_vowel').innerText = svara.vowel.toUpperCase();
        document.getElementById('sv_sign').innerText = svara.signName;
        document.getElementById('sv_moon_status').innerHTML = `<strong>Moon:</strong> ${svara.moonAnalysis.status}`;
        document.getElementById('sv_lagna_status').innerText = svara.lagnaAnalysis.description;

        // 2. Baladi Avastha
        const active = baladi.activatedPlanets.length > 0 ? baladi.activatedPlanets.join(", ") : "None";
        document.getElementById('sv_activated_planets').innerText = active;
        
        let recText = "<strong>AK Guidance:</strong> ";
        if(baladi.recommendation) {
            recText += `Your AK (${baladi.recommendation.planet}) is in ${baladi.recommendation.state} state. <br>
            It prefers vowels: <strong>${baladi.recommendation.suggestedVowels}</strong>`;
        } else {
            recText += "Calculate AK first.";
        }
        document.getElementById('sv_ak_recommendation').innerHTML = recText;

        // 3. Syllables
        if(lagana) {
            document.getElementById('sv_syllable_count').innerText = lagana.syllableCount;
            document.getElementById('sv_nature').innerText = `(${lagana.nature})`;
            document.getElementById('sv_support_msg').innerText = lagana.prognosis;
            // Color code prognosis
            const color = lagana.prognosis.includes("Excellent") ? "var(--success)" : 
                          lagana.prognosis.includes("Low") ? "var(--primary)" : "var(--text-muted)";
            document.getElementById('sv_support_msg').style.color = color;
        }

        // 4. Timeline
        const timeline = document.getElementById('sv_dasa_timeline');
        timeline.innerHTML = "";
        dasa.forEach(d => {
            timeline.innerHTML += `
                <div class="dasa-card">
                    <div class="dasa-vowel">${d.vowel.toUpperCase()}</div>
                    <div class="dasa-years">${d.yearStart} - ${d.yearEnd}</div>
                    <div class="dasa-age">Age ${d.startAge}-${d.endAge}</div>
                </div>`;
        });
    },

    // --- NEW: KATAPAYADI MODULE ---
    kp: {
        mode: 'dev',
        data: [],
        
        setMode: function(m) {
            this.mode = m;
            document.getElementById('btnDev').className = `mode-opt ${m==='dev'?'active':''}`;
            document.getElementById('btnEng').className = `mode-opt ${m==='eng'?'active':''}`;
            document.getElementById('kpInput').placeholder = m==='dev' ? "Enter Devanagari..." : "Enter English...";
            const warn = document.getElementById('engWarning');
            if(warn) warn.style.display = m==='eng' ? 'block' : 'none';
        },

        process: function() {
            if (typeof KatapayadiEngine === 'undefined') {
                alert("ERROR: katapayadi-engine.js is not loaded! Check your HTML script tags.");
                return;
            }
            let txt = document.getElementById('kpInput').value.trim();
            if(!txt) {
                alert("Please enter some text first.");
                return;
            }

            let devOutput = txt;
            let method = "Direct";
            let risk = "low";

            if(this.mode === 'eng') {
                let res = KatapayadiEngine.transliterate(txt);
                devOutput = res.dev;
                method = res.method;
                risk = method === 'Dictionary' ? 'low' : 'med';
                if(txt.match(/ng|ksh|jny/i) && method !== 'Dictionary') risk = 'high';
            }

            let calc = KatapayadiEngine.calculate(devOutput);
            
            let entry = {
                id: Date.now(),
                orig: txt,
                dev: devOutput,
                method: method,
                risk: risk,
                ...calc
            };
            this.data.push(entry);
            this.render();
            this.draw();
            document.getElementById('kpInput').value = '';
        },

        render: function() {
            let tb = document.getElementById('kpResultsBody');
            if(!tb) return;
            let sel = document.getElementById('kpFilterSel');
            let cur = sel ? sel.value : "";
            const signs = ["-","Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

            tb.innerHTML = this.data.map((d,i) => `
                <tr>
                    <td>${i+1}</td>
                    <td>
                        <div style="font-size:1.2em; font-weight:bold; color:var(--primary);">${d.dev}</div>
                        <div style="font-size:0.85em; color:var(--text-muted);">${d.orig} (${d.method})</div>
                    </td>
                    <td>
                        ${d.logs.map(l => `<span class="log-item log-${l.s}">${l.t}${l.v!==null?'='+l.v:''}</span>`).join('')}
                        <div style="margin-top:5px; font-size:0.8em;">Rev: [${d.rev.join(', ')}] &rarr; <b>${d.sum}</b></div>
                    </td>
                    <td>
                        <div style="font-weight:bold; color:var(--primary);">${signs[d.rashi]}</div>
                        <div style="font-size:0.8em;">Sign #${d.rashi}</div>
                    </td>
                </tr>
            `).join('');

            if(sel) {
                sel.innerHTML = '<option value="">All Entries</option>';
                this.data.forEach(d => sel.innerHTML += `<option value="${d.id}">${d.orig}</option>`);
                sel.value = cur;
            }
        },

        draw: function() {
            // 1. Clear existing markers
            document.querySelectorAll('.kp-marker-list').forEach(e => e.innerHTML='');

            // 2. RENDER PLANETS & SPECIAL POINTS (If Calculation Exists)
            // Access main app data via 'app.lastCalcData'
            if (app.lastCalcData && app.lastCalcData.length > 0) {
                
                // A. Render Planets & Lagna
                app.lastCalcData.forEach(p => {
                    // Convert 0-based signIdx to 1-based data-s
                    const box = document.querySelector(`.kp-box[data-s="${p.signIdx + 1}"] .kp-marker-list`);
                    if (box) {
                        let cls = "m-tag m-pl"; // Default Planet
                        if (p.name === "Lagna") cls = "m-tag m-la";
                        else if (p.name === "Moon") cls = "m-tag m-mo";
                        
                        // Shorten names (e.g. Jupiter -> Ju, Lagna -> AS)
                        let label = p.name.substring(0, 2);
                        if (p.name === "Lagna") label = "AS";
                        
                        box.innerHTML += `<div class="${cls}">${label}</div>`;
                    }
                });

                // B. Render Special Ascendants (AL, VL, HL, GL)
                if (typeof SpecialAscendants !== 'undefined') {
                    // AL & VL
                    // Note: We recalculate or assume AL is consistent. 
                    // For VL/HL/GL we need input values again.
                    try {
                        const al = SpecialAscendants.calculateAL(app.lastCalcData);
                        this.addMarker(al.signIdx, "AL", "m-sp");

                        // Re-fetch Inputs for Time-based Lagnas
                        const dobRaw = document.getElementById('m_dob').value;
                        const tobRaw = document.getElementById('m_tob').value;
                        const tz = parseFloat(document.getElementById('m_tz').value);
                        const lat = parseFloat(document.getElementById('m_lat').value);
                        const lon = parseFloat(document.getElementById('m_lon').value);

                        if (dobRaw && tobRaw) {
                            const [y, m, d] = dobRaw.split('-').map(Number);
                            const [h, min, s] = tobRaw.split(':').map(Number);
                            const utcDate = new Date(Date.UTC(y, m - 1, d, h, min, s || 0) - (tz * 3600000));

                            // VL
                            const vl = SpecialAscendants.calculateVL(app.lastCalcData, utcDate, lat, lon);
                            this.addMarker(vl.signIdx, "VL", "m-sp");

                            // HL & GL
                            if (SpecialAscendants.calculateTimePoints) {
                                const timePoints = SpecialAscendants.calculateTimePoints(app.lastCalcData, utcDate, lat, lon);
                                timePoints.forEach(tp => this.addMarker(tp.signIdx, tp.name, "m-sp"));
                            }
                        }
                    } catch (e) { console.error("Error drawing special points in KP", e); }
                }
            }

            // 3. RENDER KATAPAYADI INPUTS
            let sel = document.getElementById('kpFilterSel');
            let fid = sel ? sel.value : "";
            
            this.data.forEach(d => {
                if(fid && d.id != fid) return;
                // d.rashi is already 1-based (1=Aries, 12=Pisces) or 0? 
                // Wait, KatapayadiEngine returns rashi 1-12.
                let box = document.querySelector(`.kp-box[data-s="${d.rashi}"] .kp-marker-list`);
                if(box) {
                    let cls = (fid == d.id) ? "m-tag m-nm m-hl" : "m-tag m-nm";
                    box.innerHTML += `<div class="${cls}">${d.orig}</div>`;
                }
            });
        },

        // Helper to add marker safely
        addMarker: function(signIdx, label, cls) {
            const box = document.querySelector(`.kp-box[data-s="${signIdx + 1}"] .kp-marker-list`);
            if (box) {
                box.innerHTML += `<div class="m-tag ${cls}">${label}</div>`;
            }
        }
    },

    // --- 4. UTILITIES ---

    // South Indian Chart Renderer (Plain)
    renderSouthIndianChart: function(containerId, planetData, varga) {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = "";
        
        // South Indian Grid Mapping (Pisces=11 top-left, clockwise)
        const gridMap = [11, 0, 1, 2, 10, null, null, 3, 9, null, null, 4, 8, 7, 6, 5];
        const key = varga === "D9" ? "d9Idx" : "signIdx";

        gridMap.forEach((sIdx, i) => {
            if (sIdx === null) { 
                if (i === 5) container.innerHTML += `<div class="si-center">${varga}</div>`; 
                return; 
            }
            
            const occupants = planetData.filter(p => p[key] === sIdx && !p.isLagna);
            const lagna = planetData.find(p => p.isLagna && p[key] === sIdx);
            
            let html = `<div class="si-box ${lagna ? 'si-lagna' : ''}">
                <span class="si-sign-label">${SIGNS[sIdx].substring(0,2)}</span>`;
                
            occupants.forEach(p => { 
                html += `<div style="color:var(--planet-color); font-weight:700; font-size:0.65rem; margin:1px;">${p.name.substring(0,2)}</div>`; 
            });
            
            container.innerHTML += html + `</div>`;
        });
    },

    // Geolocation & Search
    autoLocate: function(pfx) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => { 
                this.ui.pickCity(pfx, pos.coords.latitude, pos.coords.longitude, "My Location"); 
            });
        }
    }
};

// Start
window.onload = () => app.init();