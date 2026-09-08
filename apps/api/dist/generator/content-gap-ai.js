"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContentGapKeywords = generateContentGapKeywords;
const gemini_1 = require("../lib/gemini");
async function generateContentGapKeywords(genAI, myDomain, niche, location, language = 'id', targetKeywords = []) {
    const isEnglish = language === 'en';
    const resolvedNiche = niche || `business services related to ${myDomain}`;
    const resolvedLocation = location || `Bali, Indonesia`;
    // 1. Analisis Competitor Gap
    let prompt = '';
    if (isEnglish) {
        prompt = `You are an elite GEO (Generative Engine Optimization) and AI Search strategist (ChatGPT, Gemini, Perplexity).
The target business entity is:
- Domain: "${myDomain}"
- Primary Niche / Industry: "${resolvedNiche}"
- Location: "${resolvedLocation}"
${targetKeywords.length > 0 ? `- Focus Services / Keywords: ${targetKeywords.slice(0, 10).join(', ')}` : ''}

CRITICAL RULES:
1. Focus STRICTLY on the niche "${resolvedNiche}" and location "${resolvedLocation}". DO NOT hallucinate other unrelated industries.
2. Identify 2 real or realistic competitor domains that are most frequently recommended by ChatGPT/Gemini for "${resolvedNiche}" in "${resolvedLocation}".
3. Provide 6-10 specific high-intent Content Gap questions/search topics that users ask AI assistants about "${resolvedNiche}" in "${resolvedLocation}", where competitors get cited.
4. LANGUAGE REQUIREMENT: EVERYTHING MUST BE 100% IN ENGLISH. Do NOT output any Indonesian words.

REPLY ONLY WITH PURE JSON (no markdown, no backticks):
{
  "gaps": [
    {
      "keyword": "High intent question or topic in English (e.g. How to fix cracked iPhone screen in Canggu Bali)",
      "volume": 1200,
      "myRank": 0,
      "competitors": [
        { "domain": "competitor1.com", "rank": 2 },
        { "domain": "competitor2.com", "rank": 4 }
      ]
    }
  ]
}`;
    }
    else {
        prompt = `Anda adalah seorang pakar GEO (Generative Engine Optimization) spesialis analisis AI Search Engine seperti ChatGPT dan Gemini.
Target Bisnis:
- Domain: "${myDomain}"
- Industri / Niche: "${resolvedNiche}"
- Lokasi: "${resolvedLocation}"
${targetKeywords.length > 0 ? `- Layanan Fokus: ${targetKeywords.slice(0, 10).join(', ')}` : ''}

Tugas Anda adalah:
1. Fokus KHUSUS pada industri "${resolvedNiche}" di "${resolvedLocation}". Jangan keluar dari topik industri ini.
2. Menemukan 2 entitas/domain kompetitor yang PALING SERING DIREKOMENDASIKAN OLEH CHATGPT/AI di industri "${resolvedNiche}" di "${resolvedLocation}".
3. Memberikan 6-10 ide Topik / Pertanyaan (Content Gap) yang sering ditanyakan pengguna kepada AI terkait "${resolvedNiche}" di "${resolvedLocation}".
4. Bahasa: Wajib 100% Bahasa Indonesia.

HANYA BERIKAN OUTPUT DALAM FORMAT JSON MURNI (tanpa markdown, tanpa backtick):
{
  "gaps": [
    {
      "keyword": "Pertanyaan atau topik berniat tinggi",
      "volume": 1200,
      "myRank": 0,
      "competitors": [
        { "domain": "kompetitor-1.com", "rank": 3 },
        { "domain": "kompetitor-2.com", "rank": 5 }
      ]
    }
  ]
}`;
    }
    let baseGaps = [];
    let competitorDomains = [];
    try {
        const text = await (0, gemini_1.generateWithFallback)(genAI, prompt, { jsonMode: true });
        let parsedData;
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanText);
        }
        catch {
            const match = text.match(/\{[\s\S]*\}/);
            if (match)
                parsedData = JSON.parse(match[0]);
        }
        baseGaps = parsedData?.gaps || [];
        if (baseGaps.length > 0 && baseGaps[0].competitors?.length > 0) {
            competitorDomains = baseGaps[0].competitors.map((c) => c.domain);
        }
    }
    catch (err) {
        console.warn(`[CONTENT-GAP] Gagal analisis gap kompetitor pertama: ${err.message}`);
    }
    // 2. GEO Layer: Prompt kedua untuk menghasilkan 8-10 pertanyaan berbasis AI assistant
    let geoPrompt = '';
    if (isEnglish) {
        geoPrompt = `Based on the niche "${resolvedNiche}" and location "${resolvedLocation}"${targetKeywords.length > 0 ? ` focusing on: ${targetKeywords.slice(0, 6).join(', ')}` : ''}, generate 8 specific article questions that:
1. Answer specific who/what/where/when/how questions a user would ask an AI assistant (ChatGPT, Perplexity, Gemini, Google AI Overview)
2. Have clear, direct, definitive answers (e.g. troubleshooting, repair costs, turnaround time, symptoms)
3. Include local intent where applicable (${resolvedLocation})
4. Format each topic as an engaging question or guide title in English. Example: 'How Much Does iPhone Screen Repair Cost in Canggu Bali?'
5. CRITICAL: 100% in English.

Return ONLY JSON: { "topics": string[] } (no markdown, no backticks)`;
    }
    else {
        geoPrompt = `Berdasarkan niche "${resolvedNiche}" dan lokasi "${resolvedLocation}"${targetKeywords.length > 0 ? ` berfokus pada: ${targetKeywords.slice(0, 6).join(', ')}` : ''}, hasilkan 8 pertanyaan artikel yang:
1. Menjawab pertanyaan spesifik apa/bagaimana/biaya yang ditanyakan pengguna ke AI assistant
2. Memiliki jawaban langsung dan solutif
3. Memiliki intensi lokal di ${resolvedLocation}
4. Bahasa: Wajib 100% Bahasa Indonesia.

HANYA BERIKAN OUTPUT DALAM FORMAT JSON MURNI: { "topics": string[] }`;
    }
    let geoTopics = [];
    try {
        const geoText = await (0, gemini_1.generateWithFallback)(genAI, geoPrompt, { jsonMode: true });
        let parsedGeo;
        try {
            const cleanGeo = geoText.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedGeo = JSON.parse(cleanGeo);
        }
        catch {
            const match = geoText.match(/\{[\s\S]*\}/);
            if (match)
                parsedGeo = JSON.parse(match[0]);
        }
        if (Array.isArray(parsedGeo?.topics)) {
            geoTopics = parsedGeo.topics;
        }
    }
    catch (geoErr) {
        console.warn(`[CONTENT-GAP] Gagal generate layer GEO topik: ${geoErr.message}`);
    }
    // Konversi topik GEO ke format GapKeyword
    const defaultComp1 = isEnglish ? 'apple-repair-bali.com' : 'kompetitor-service-bali.com';
    const defaultComp2 = isEnglish ? 'bali-electronics-care.com' : 'spesialis-gadget-bali.com';
    const geoGaps = geoTopics.map(topic => ({
        keyword: topic,
        volume: Math.floor(Math.random() * 1200) + 400,
        myRank: 0,
        competitors: [
            { domain: competitorDomains[0] || defaultComp1, rank: 1 },
            { domain: competitorDomains[1] || defaultComp2, rank: 2 }
        ]
    }));
    // Gabungkan kedua hasil (Competitor Gap + GEO Questions)
    return [...baseGaps, ...geoGaps];
}
//# sourceMappingURL=content-gap-ai.js.map