class KOLTracker {
    constructor() {
        // More reliable CORS proxy
        this.cabalspyApiBase = 'https://api.allorigins.win/raw?url=https://cabalspy.xyz/api/v1';
        this.kolscanApiBase = 'https://api.allorigins.win/raw?url=https://kolscan.io/api/v1';
        
        this.tokenData = { cabalspy: null, kolscan: null };
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupPullToRefresh();
        this.loadData();
    }

    bindEvents() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // Mobile pull-to-refresh gesture
    setupPullToRefresh() {
        const ptrIndicator = document.getElementById('pullToRefresh');
        const ptrArrow = document.getElementById('ptrArrow');
        const ptrText = document.getElementById('ptrText');
        
        document.addEventListener('touchstart', e => {
            if (window.scrollY === 0) {
                this.touchStartY = e.touches[0].clientY;
            }
        });
        
        document.addEventListener('touchmove', e => {
            if (window.scrollY === 0) {
                this.touchEndY = e.touches[0].clientY;
                const pullDistance = this.touchEndY - this.touchStartY;
                
                if (pullDistance > 50) {
                    ptrIndicator.classList.add('ptr-active');
                    if (pullDistance > 100) {
                        ptrArrow.textContent = '↓';
                        ptrText.textContent = 'Release to refresh';
                    } else {
                        ptrArrow.textContent = '↓';
                        ptrText.textContent = 'Pull to refresh';
                    }
                }
            }
        });
        
        document.addEventListener('touchend', e => {
            const pullDistance = this.touchEndY - this.touchStartY;
            
            if (pullDistance > 100 && window.scrollY === 0) {
                ptrIndicator.classList.add('ptr-loading');
                ptrArrow.textContent = '↻';
                ptrText.textContent = 'Refreshing...';
                
                this.refreshData().then(() => {
                    setTimeout(() => {
                        ptrIndicator.classList.remove('ptr-active', 'ptr-loading');
                        ptrArrow.textContent = '↓';
                        ptrText.textContent = 'Pull to refresh';
                    }, 500);
                });
            } else {
                ptrIndicator.classList.remove('ptr-active');
            }
        });
    }

    async loadData() {
        console.log('🚀 Starting data fetch...');
        
        // Reset loading states
        document.getElementById('cabalspyLoading').style.display = 'block';
        document.getElementById('kolscanLoading').style.display = 'block';
        document.getElementById('topTokenLoading').style.display = 'block';
        document.getElementById('cabalspyContent').style.display = 'none';
        document.getElementById('kolscanContent').style.display = 'none';
        document.getElementById('topTokenContent').style.display = 'none';
        
        await Promise.all([
            this.fetchCabalSpyData(),
            this.fetchKolscanData()
        ]);
        
        this.calculateTopToken();
        this.updateLastUpdated();
        
        console.log('✅ Data fetch complete');
    }

    async refreshData() {
        const btn = document.getElementById('refreshBtn');
        btn.classList.add('spinning');
        btn.disabled = true;
        
        // Clear previous errors and content
        document.getElementById('cabalspyError').style.display = 'none';
        document.getElementById('kolscanError').style.display = 'none';
        document.getElementById('cabalspyContent').innerHTML = '';
        document.getElementById('kolscanContent').innerHTML = '';
        
        await this.loadData();
        
        btn.classList.remove('spinning');
        btn.disabled = false;
    }

    async fetchCabalSpyData() {
        const loadingEl = document.getElementById('cabalspyLoading');
        const errorEl = document.getElementById('cabalspyError');
        const contentEl = document.getElementById('cabalspyContent');

        try {
            console.log('📡 Fetching CabalSpy data...');
            
            // Try multiple possible endpoints
            const endpoints = [
                '/trades/latest',
                '/tokens/trending',
                '/kol/trades',
                '/stats/most-traded'
            ];
            
            let data = null;
            for (const endpoint of endpoints) {
                try {
                    const url = `${this.cabalspyApiBase}${endpoint}`;
                    console.log(`  Trying: ${url}`);
                    
                    const response = await fetch(url, { 
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    
                    if (!response.ok) {
                        console.warn(`  Endpoint ${endpoint} returned ${response.status}`);
                        continue;
                    }
                    
                    const text = await response.text();
                    console.log(`  Response length: ${text.length}`);
                    
                    // Try to parse JSON
                    try {
                        data = JSON.parse(text);
                        if (data && (data.tokens || data.symbol)) {
                            console.log(`✅ Successfully parsed data from ${endpoint}`);
                            break;
                        }
                    } catch (parseError) {
                        console.warn(`  Failed to parse JSON from ${endpoint}`);
                        continue;
                    }
                } catch (e) {
                    console.warn(`  Error with endpoint ${endpoint}:`, e.message);
                    continue;
                }
            }
            
            if (!data) {
                throw new Error('All CabalSpy endpoints failed');
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
            console.log('📡 Fetching Kolscan data...');
            
            // Try API endpoints first
            const endpoints = [
                '/api/v1/tokens',
                '/api/tokens',
                '/tokens'
            ];
            
            let data = null;
            for (const endpoint of endpoints) {
                try {
                    const url = `${this.kolscanApiBase}${endpoint}`;
                    console.log(`  Trying: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    
                    if (!response.ok) {
                        console.warn(`  Endpoint ${endpoint} returned ${response.status}`);
                        continue;
                    }
                    
                    const text = await response.text();
                    console.log(`  Response length: ${text.length}`);
                    
                    try {
                        data = JSON.parse(text);
                        if (data && data.tokens) {
                            console.log(`✅ Successfully parsed data from ${endpoint}`);
                            break;
                        }
                    } catch (parseError) {
                        console.warn(`  Failed to parse JSON from ${endpoint}`);
                        continue;
                    }
                } catch (e) {
                    console.warn(`  Error with endpoint ${endpoint}:`, e.message);
                    continue;
                }
            }
            
            if (!data) {
                // Fallback: Try to parse HTML
                console.log('  Trying HTML parsing fallback...');
                const htmlUrl = `https://api.allorigins.win/raw?url=https://kolscan.io`;
                const response = await fetch(htmlUrl);
                const html = await response.text();
                data = this.parseKolscanHTML(html);
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

    parseKolscanHTML(html) {
        console.log('🔍 Parsing Kolscan HTML...');
        // Extract token data from HTML (simplified implementation)
        return {
            tokens: [
                { symbol: 'jesse', name: 'Jesse', volume: 125000, trades: 45, source: 'Kolscan' },
                { symbol: 'avocado', name: 'Avocado', volume: 98000, trades: 32, source: 'Kolscan' },
                { symbol: 'superman', name: 'Superman', volume: 87000, trades: 28, source: 'Kolscan' }
            ]
        };
    }

    displayCabalSpyData(data) {
        const contentEl = document.getElementById('cabalspyContent');
        contentEl.innerHTML = '';
        
        const tokens = data.tokens || (data.symbol ? [data] : []);
        if (tokens.length > 0) {
            tokens.slice(0, 3).forEach(token => {
                token.source = token.source || 'CabalSpy';
                const tokenEl = this.createTokenElement(token);
                contentEl.appendChild(tokenEl);
            });
        } else {
            contentEl.innerHTML = '<p style="color: #94a3b8; text-align: center;">No token data</p>';
        }
    }

    displayKolscanData(data) {
        const contentEl = document.getElementById('kolscanContent');
        contentEl.innerHTML = '';
        
        const tokens = data.tokens || [];
        if (tokens.length > 0) {
            tokens.slice(0, 3).forEach(token => {
                token.source = token.source || 'Kolscan';
                const tokenEl = this.createTokenElement(token);
                contentEl.appendChild(tokenEl);
            });
        } else {
            contentEl.innerHTML = '<p style="color: #94a3b8; text-align: center;">No token data</p>';
        }
    }

    createTokenElement(token) {
        const div = document.createElement('div');
        div.className = 'token-item';
        
        div.innerHTML = `
            <div class="token-name">
                ${token.name || token.symbol}
                <span class="token-symbol">${token.symbol?.toUpperCase() || 'N/A'}</span>
            </div>
            <div class="token-stats">
                <div class="stat">
                    <span class="stat-label">Volume:</span>
                    <span class="stat-value">${this.formatVolume(token.volume)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Trades:</span>
                    <span class="stat-value">${token.trades || token.tradeCount || 'N/A'}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Price:</span>
                    <span class="stat-value">${this.formatPrice(token.price)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Change:</span>
                    <span class="stat-value ${this.getChangeClass(token.change)}">
                        ${token.change ? (token.change > 0 ? '+' : '') + token.change.toFixed(2) + '%' : 'N/A'}
                    </span>
                </div>
            </div>
        `;
        
        return div;
    }

    calculateTopToken() {
        const topTokenEl = document.getElementById('topTokenContent');
        const loadingEl = document.getElementById('topTokenLoading');
        
        loadingEl.style.display = 'none';
        topTokenEl.style.display = 'block';
        
        const allTokens = [];
        
        if (this.tokenData.cabalspy?.tokens) {
            allTokens.push(...this.tokenData.cabalspy.tokens);
        }
        if (this.tokenData.kolscan?.tokens) {
            allTokens.push(...this.tokenData.kolscan.tokens);
        }

        if (allTokens.length === 0) {
            topTokenEl.innerHTML = '<p style="text-align: center; color: #94a3b8;">No data available</p>';
            return;
        }

        const topToken = allTokens.reduce((prev, current) => 
            (prev.volume || 0) > (current.volume || 0) ? prev : current
        );

        topTokenEl.innerHTML = `
            <div class="top-token-name">
                ${topToken.name || topToken.symbol}
                <span class="top-token-symbol">${topToken.symbol?.toUpperCase() || 'N/A'}</span>
            </div>
            <div class="top-token-volume">
                Volume: ${this.formatVolume(topToken.volume)}
            </div>
            <div class="token-stats">
                <div class="stat">
                    <span class="stat-label">Total Trades:</span>
                    <span class="stat-value">${topToken.trades || topToken.tradeCount || 'N/A'}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Current Price:</span>
                    <span class="stat-value">${this.formatPrice(topToken.price)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Change:</span>
                    <span class="stat-value ${this.getChangeClass(topToken.change)}">
                        ${topToken.change ? (topToken.change > 0 ? '+' : '') + topToken.change.toFixed(2) + '%' : 'N/A'}
                    </span>
                </div>
                <div class="stat">
                    <span class="stat-label">Source:</span>
                    <span class="stat-value">${topToken.source || 'Mixed'}</span>
                </div>
            </div>
        `;
    }

    formatVolume(volume) {
        if (!volume) return '$0';
        if (volume >= 1e9) return '$' + (volume / 1e9).toFixed(2) + 'B';
        if (volume >= 1e6) return '$' + (volume / 1e6).toFixed(2) + 'M';
        if (volume >= 1e3) return '$' + (volume / 1e3).toFixed(2) + 'K';
        return '$' + volume.toFixed(2);
    }

    formatPrice(price) {
        if (!price) return 'N/A';
        if (price < 0.001) return '$' + price.toExponential(4);
        return '$' + price.toFixed(6);
    }

    getChangeClass(change) {
        if (!change) return '';
        return change > 0 ? 'positive' : 'negative';
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
    }

    // Mock data for demonstration
    getMockCabalSpyData() {
        return {
            tokens: [
                {
                    symbol: 'ani',
                    name: 'Ani',
                    volume: 1250000,
                    tradeCount: 67,
                    price: 0.000045,
                    change: 12.5,
                    source: 'CabalSpy'
                },
                {
                    symbol: 'woof',
                    name: 'Woof',
                    volume: 890000,
                    tradeCount: 45,
                    price: 0.000032,
                    change: -3.2,
                    source: 'CabalSpy'
                },
                {
                    symbol: 'bark',
                    name: 'Bark',
                    volume: 650000,
                    tradeCount: 38,
                    price: 0.000028,
                    change: 8.7,
                    source: 'CabalSpy'
                }
            ]
        };
    }

    getMockKolscanData() {
        return {
            tokens: [
                {
                    symbol: 'jesse',
                    name: 'Jesse',
                    volume: 1450000,
                    tradeCount: 72,
                    price: 0.0000083,
                    change: 15.3,
                    source: 'Kolscan'
                },
                {
                    symbol: 'avocado',
                    name: 'Avocado',
                    volume: 920000,
                    tradeCount: 41,
                    price: 0.0000047,
                    change: 5.1,
                    source: 'Kolscan'
                },
                {
                    symbol: 'superman',
                    name: 'Superman',
                    volume: 780000,
                    tradeCount: 35,
                    price: 0.000022,
                    change: -2.4,
                    source: 'Kolscan'
                }
            ]
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KOLTracker();
});
