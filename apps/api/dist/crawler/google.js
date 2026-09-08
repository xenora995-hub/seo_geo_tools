"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGoogleRankings = checkGoogleRankings;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../lib/prisma");
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
];
async function checkGoogleRankings(tenantId) {
    const tenant = await prisma_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { setting: true }
    });
    if (!tenant || !tenant.setting) {
        throw new Error('Tenant tidak ditemukan');
    }
    const keywords = tenant.setting.targetKeywords || [];
    if (keywords.length === 0) {
        return [];
    }
    const cleanDomain = tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const results = [];
    // DataForSEO credentials if provided in env
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    for (const keyword of keywords) {
        let position = null;
        let foundUrl = null;
        if (login && password) {
            try {
                const authHeader = Buffer.from(`${login}:${password}`).toString('base64');
                const response = await axios_1.default.post('https://api.dataforseo.com/v3/serp/google/organic/live/regular', [
                    {
                        keyword,
                        location_code: 2360, // Indonesia
                        language_code: tenant.language === 'en' ? 'en' : 'id',
                        depth: 100,
                    }
                ], {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                const items = response.data?.tasks?.[0]?.result?.[0]?.items || [];
                const matchedItem = items.find((item) => item.type === 'organic' && (item.domain?.includes(cleanDomain) || item.url?.includes(cleanDomain)));
                if (matchedItem) {
                    position = matchedItem.rank_group || matchedItem.rank_absolute || null;
                    foundUrl = matchedItem.url || null;
                }
            }
            catch (err) {
                console.warn(`[DATAFORSEO] Gagal cek ranking "${keyword}": ${err.message}. Menggunakan simulasi.`);
            }
        }
        // Fallback: Real Scrape if DataForSEO API is not configured or fails
        // Kita gunakan DuckDuckGo HTML karena Google memiliki proteksi anti-bot & obfuscation yang sangat ketat
        if (position === null) {
            try {
                // Berikan jeda 3 detik antar pencarian agar tidak dianggap spammer/bot
                // (Sangat penting jika tidak menggunakan API berbayar)
                if (keywords.indexOf(keyword) > 0) {
                    await delay(3000);
                }
                const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
                const scrapeRes = await axios_1.default.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`, {
                    headers: {
                        'User-Agent': randomUA,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    },
                    timeout: 10000
                });
                const html = scrapeRes.data;
                // Cari semua link hasil organik DDG yang ada di dalam class result__url
                const searchResults = html.match(/<a[^>]+class="result__url"[^>]*href="([^"]+)"/ig) || [];
                let currentRank = 1;
                for (const link of searchResults) {
                    if (link.toLowerCase().includes(cleanDomain)) {
                        position = currentRank;
                        const match = link.match(/href="([^"]+)"/i);
                        if (match) {
                            let u = match[1];
                            // Decode url redirect DDG jika ada
                            if (u.includes('//duckduckgo.com/l/?uddg=')) {
                                u = u.split('uddg=')[1].split('&')[0];
                                u = decodeURIComponent(u);
                            }
                            foundUrl = u;
                        }
                        else {
                            foundUrl = `https://${cleanDomain}`;
                        }
                        break;
                    }
                    currentRank++;
                    if (currentRank > 20)
                        break;
                }
            }
            catch (err) {
                console.warn(`[SCRAPER] Gagal scrape DDG manual "${keyword}": ${err.message}`);
            }
        }
        const inFirstPage = position !== null && position <= 10;
        const page = position !== null ? Math.ceil(position / 10) : null;
        results.push({
            keyword,
            position,
            page,
            url: foundUrl,
            inFirstPage,
            delta: 0,
            updatedAt: new Date().toISOString()
        });
    }
    return results;
}
//# sourceMappingURL=google.js.map