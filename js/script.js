class KOLTracker {
    constructor() {
        // ✅ Your actual Cloudflare Worker URL
        this.cabalspyApiBase = 'https://koltracker.siwarsihem23.workers.dev/cabalspy';
        this.kolscanApiBase = 'https://koltracker.siwarsihem23.workers.dev/kolscan';
        
        this.tokenData = { cabalspy: null, kolscan: null };
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.init();
    }

    // ... (keep all your existing methods the same)
    
    async fetchCabalSpyData() {
        const loadingEl = document.getElementById('cabalspyLoading');
        const errorEl = document.getElementById('cabalspyError');
        const contentEl = document.getElementById('cabalspyContent');

        try {
            console.log('📡 Fetching CabalSpy data via your Cloudflare Worker...');
            
            const response = await fetch(this.cabalspyApiBase, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Worker returned ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ CabalSpy data received:', data);
            
            // Check if it's demo data
            const isDemo = response.headers.get('X-Source') === 'Demo-Data';
            if (isDemo) {
                console.log('ℹ️ Using demo data for CabalSpy');
                errorEl.textContent = 'CabalSpy: Using demo data (API not accessible)';
                errorEl.style.display = 'block';
            } else {
                errorEl.style.display = 'none';
            }
            
            this.displayCabalSpyData(data);
            this.tokenData.cabalspy = data;
            
        } catch (error) {
            console.warn('❌ CabalSpy fetch failed:', error.message);
            
            const mockData = this.getMockCabalSpyData();
            this.displayCabalSpyData(mockData);
            this.tokenData.cabalspy = mockData;
            
            errorEl.textContent = 'CabalSpy: Using demo data';
            errorEl.style.display = 'block';
        } finally {
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
        }
    }

    async fetchKolscanData() {
        const loadingEl = document.getElementById('kolscanLoading');
        const errorEl = document.getElementById('kolscanError');
        const contentEl = document.getElementById('kolscanContent');

        try {
            console.log('📡 Fetching Kolscan data via your Cloudflare Worker...');
            
            const response = await fetch(this.kolscanApiBase, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Worker returned ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Kolscan data received:', data);
            
            // Check if it's demo data
            const isDemo = response.headers.get('X-Source') === 'Demo-Data';
            if (isDemo) {
                console.log('ℹ️ Using demo data for Kolscan');
                errorEl.textContent = 'Kolscan: Using demo data (API not accessible)';
                errorEl.style.display = 'block';
            } else {
                errorEl.style.display = 'none';
            }
            
            this.displayKolscanData(data);
            this.tokenData.kolscan = data;
            
        } catch (error) {
            console.warn('❌ Kolscan fetch failed:', error.message);
            
            const mockData = this.getMockKolscanData();
            this.displayKolscanData(mockData);
            this.tokenData.kolscan = mockData;
            
            errorEl.textContent = 'Kolscan: Using demo data';
            errorEl.style.display = 'block';
        } finally {
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
        }
    }
    
    // ... (rest of your methods stay the same)
}
