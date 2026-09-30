"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function logRealUserTest() {
    const tenantId = 'cmtnqo1tu0000vdkvz14w1tgm';
    console.log('Logging real user ChatGPT App test screenshot...');
    // Create or update the test run for this query
    const testRun = await prisma.aiVisibilityTestRun.create({
        data: {
            tenantId,
            query: 'bali phone repair / servis HP di Bali (Denpasar)',
            sourceType: 'MANUAL_CHATGPT_APP',
            model: 'ChatGPT App (GPT-4o with Web Search)',
            status: 'cited', // CITED as #1 source!
            brandMentioned: true,
            domainCited: true,
            domainInSources: true,
            citationUrls: ['https://baliphonerepair.com'],
            responseText: `Kalau kamu cari servis HP di Bali, terutama area Denpasar, ada beberapa pilihan yang sedang buka hari ini:
• DEWATA REPAIR PANJER — Panjer, Denpasar Selatan, buka sampai 22:00.
• Dewata Repair Teuku Umar — Teuku Umar Barat, buka sampai 22:00.
• iColor Bali — Imam Bonjol, buka sampai 22:00.
• iFixied Apple Service Bali Denpasar — Teuku Umar, khususnya cocok untuk perangkat Apple.
• Cellular World — Teuku Umar, buka sampai 22:00.
Kalau kamu nggak mau datang ke toko, Bali Phone Repair juga menyediakan mobile repair ke villa/hotel/lokasi kamu di Bali`,
            evidenceNotes: 'BUKTI SCREENSHOT RIIL: baliphonerepair.com dikutip sebagai Sumber #1 di kotak Sources. Namun, ChatGPT mengklasifikasikannya sebagai alternatif footnote ("Kalau kamu nggak mau datang ke toko, Bali Phone Repair juga menyediakan mobile repair...") karena website memprioritaskan positioning layanan panggilan, sementara 5 besar diisi oleh toko fisik dengan jam buka (Dewata Repair, iColor, iFixied, Cellular World — 3 di antaranya di Jl. Teuku Umar).',
            testedAt: new Date()
        }
    });
    console.log('Saved test run:', testRun.id);
    // Add high priority audit finding for this specific entity mismatch
    await prisma.auditFindingItem.create({
        data: {
            tenantId,
            targetUrl: 'https://baliphonerepair.com',
            category: 'BRANCH_IDENTITY',
            priority: 'HIGH',
            issue: 'Klasifikasi Entitas AI: Situs dikutip sebagai alternatif mobile ("Kalau tidak mau datang ke toko"), bukan Toko Fisik Utama di 5 Besar',
            evidence: 'Pada pengujian langsung ChatGPT untuk "servis HP di Bali", baliphonerepair.com dikutip sebagai Sumber #1 tetapi ditaruh di bawah 5 toko fisik (Dewata Repair, iColor, iFixied, Cellular World). ChatGPT menganggap Bali Phone Repair hanya layanan panggilan karena absennya etalase toko fisik & jam buka malam di homepage.',
            recommendation: '1. Cantumkan cabang fisik iSmart Teuku Umar (menghadapi langsung 3 kompetitor Teuku Umar di list) dan Bale Bali di homepage.\n2. Tegaskan status: "Toko Offline Walk-in Buka Setiap Hari s/d 21:00 & Layanan Mobile Villa".\n3. Terapkan Schema openingHoursSpecification agar ChatGPT mengenali toko sedang buka hari ini.',
            proposedPatch: `<div class="hero-store-badges">\n  <span class="badge">🏬 Toko & Workshop Fisik Walk-in Buka Hari Ini s/d 21:00 (Teuku Umar & Denpasar)</span>\n  <span class="badge">🛵 Teknisi Panggilan ke Villa / Hotel (Canggu, Seminyak, Kuta)</span>\n</div>`,
            canAutoFix: false,
            status: 'OPEN'
        }
    });
    console.log('Added entity classification finding to database.');
    await prisma.$disconnect();
}
logRealUserTest().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=log-real-test.js.map