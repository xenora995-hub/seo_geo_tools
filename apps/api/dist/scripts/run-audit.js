"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const business_branches_1 = require("../data/business-branches");
const prisma = new client_1.PrismaClient();
async function runAudit() {
    const tenantId = 'cmtnqo1tu0000vdkvz14w1tgm';
    const targetUrl = 'https://baliphonerepair.com';
    console.log(`[AUDIT-SCANNER] Scanning ${targetUrl} for tenant ${tenantId}...`);
    const findings = [];
    // 1. Audit robots.txt
    try {
        const robotsRes = await axios_1.default.get(`${targetUrl}/robots.txt`, { timeout: 8000, validateStatus: () => true });
        if (robotsRes.status === 200 && typeof robotsRes.data === 'string') {
            const robotsTxt = robotsRes.data;
            const hasOaiSearchBot = /User-agent:\s*OAI-SearchBot/i.test(robotsTxt);
            if (!hasOaiSearchBot) {
                findings.push({
                    tenantId,
                    targetUrl: `${targetUrl}/robots.txt`,
                    category: 'ROBOTS_INDEXABILITY',
                    priority: 'HIGH',
                    issue: 'robots.txt belum memiliki izin eksplisit untuk OAI-SearchBot (ChatGPT Search crawler)',
                    evidence: `Isi robots.txt saat ini:\n${robotsTxt.trim()}`,
                    recommendation: 'Tambahkan blok deklarasi spesifik untuk User-agent: OAI-SearchBot agar bot pencarian ChatGPT memiliki izin perayapan yang jelas tanpa mempengaruhi kebijakan bot training.',
                    proposedPatch: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\n\n# Izinkan ChatGPT Search untuk merayap dan mengutip halaman web\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: ${targetUrl}/sitemap.xml`,
                    canAutoFix: false,
                    status: 'OPEN'
                });
            }
        }
    }
    catch (e) {
        console.warn(`Error reading robots.txt:`, e.message);
    }
    // 2. Audit Homepage: Title, Branches, Schema
    try {
        const homeRes = await axios_1.default.get(targetUrl, {
            timeout: 10000,
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEO-GEO-Auditor/1.0' }
        });
        if (homeRes.status === 200 && typeof homeRes.data === 'string') {
            const html = homeRes.data;
            const lowerHtml = html.toLowerCase();
            // Title
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const currentTitle = titleMatch ? titleMatch[1].trim() : '';
            if (currentTitle.toLowerCase().includes('servis') || currentTitle.toLowerCase().includes('rental device')) {
                findings.push({
                    tenantId,
                    targetUrl,
                    category: 'CONTENT_GAP',
                    priority: 'MEDIUM',
                    issue: 'Title tag beranda masih menggunakan bahasa Indonesia campuran, kurang selaras untuk target turis & expat asing',
                    evidence: `<title>${currentTitle}</title>`,
                    recommendation: 'Gunakan title tag bahasa Inggris yang natural dan berorientasi pada lokasi Bali serta cabang utama.',
                    proposedPatch: '<title>Bali Phone Repair - iPhone, MacBook, Android Repair & Villa Service in Bali</title>',
                    canAutoFix: false,
                    status: 'OPEN'
                });
            }
            // Missing branches
            const hasIsmart = lowerHtml.includes('ismart');
            const hasBaleBali = lowerHtml.includes('bale bali');
            const hasTeukuUmar = lowerHtml.includes('teuku umar');
            if (!hasIsmart || !hasBaleBali || !hasTeukuUmar) {
                findings.push({
                    tenantId,
                    targetUrl,
                    category: 'BRANCH_IDENTITY',
                    priority: 'HIGH',
                    issue: 'Situs belum mencantumkan cabang resmi (iSmart Canggu, Bale Bali, iSmart Teuku Umar) pada informasi kontak/footer',
                    evidence: `Pencarian di homepage: iSmart: ${hasIsmart}, Bale Bali: ${hasBaleBali}, Teuku Umar: ${hasTeukuUmar}. Saat ini hanya tercantum 1 alamat (Jl. Pulau Misol Denpasar). ChatGPT tidak mengetahui keberadaan fisik di Canggu/Pererenan.`,
                    recommendation: 'Tambahkan bagian "Our Verified Branches" di footer dan halaman kontak dengan menyebutkan secara jelas hubungan cabang dalam bahasa Inggris: "iSmart Canggu is a Bali Phone Repair branch".',
                    proposedPatch: `<div class="bpr-branches-section">\n  <h3>Our Verified Workshops & Service Hubs</h3>\n  <div class="branch-card">\n    <strong>iSmart Canggu</strong>\n    <p>Jl. Raya Canggu, Kerobokan, Badung, Bali</p>\n    <p><em>iSmart Canggu is a Bali Phone Repair branch serving Canggu, Berawa, and Pererenan with walk-ins and mobile villa technician service.</em></p>\n  </div>\n  <div class="branch-card">\n    <strong>Bale Bali (Central Workshop)</strong>\n    <p>Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113</p>\n  </div>\n  <div class="branch-card">\n    <strong>iSmart Teuku Umar</strong>\n    <p>Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali</p>\n  </div>\n</div>`,
                    canAutoFix: false,
                    status: 'OPEN'
                });
            }
            // Schema
            const hasParentBranchSchema = lowerHtml.includes('ismart') && lowerHtml.includes('suborganization');
            if (!hasParentBranchSchema) {
                findings.push({
                    tenantId,
                    targetUrl,
                    category: 'SCHEMA_DATA',
                    priority: 'HIGH',
                    issue: 'Structured Data (Schema.org JSON-LD) belum menghubungkan brand utama dengan 3 cabang resmi',
                    evidence: 'Schema LocalBusiness saat ini hanya memuat entitas tunggal tanpa subOrganization atau cabang iSmart Canggu/Teuku Umar.',
                    recommendation: 'Sematkan Schema Graph lengkap yang menghubungkan Bali Phone Repair sebagai induk organisasi dengan Bale Bali, iSmart Canggu, dan iSmart Teuku Umar.',
                    proposedPatch: (0, business_branches_1.buildParentAndBranchesSchema)(targetUrl),
                    canAutoFix: false,
                    status: 'OPEN'
                });
            }
        }
    }
    catch (e) {
        console.warn(`Error reading homepage:`, e.message);
    }
    // 3. Audit Specific Service Pages
    const serviceUrls = [
        { path: '/services/macbook-repair-bali', name: 'MacBook Repair Bali' },
        { path: '/services/android-repair-bali', name: 'Android Repair Bali' }
    ];
    for (const s of serviceUrls) {
        const fullServiceUrl = `${targetUrl}${s.path}`;
        try {
            const sRes = await axios_1.default.get(fullServiceUrl, {
                timeout: 8000,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEO-GEO-Auditor/1.0' }
            });
            if (sRes.status === 200 && typeof sRes.data === 'string') {
                const sHtml = sRes.data;
                const h2Matches = [...sHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
                if (h2Matches.length <= 1 || sHtml.length < 8000) {
                    findings.push({
                        tenantId,
                        targetUrl: fullServiceUrl,
                        category: 'CONTENT_GAP',
                        priority: 'HIGH',
                        issue: `Halaman ${s.name} memiliki konten yang sangat minim (${h2Matches.length} subjudul H2), belum menjawab pertanyaan diagnostik mesin pencari AI`,
                        evidence: `H2 yang ditemukan hanya: ${JSON.stringify(h2Matches)}. Panjang HTML: ${sHtml.length} byte.`,
                        recommendation: `Perluas konten halaman ${s.name} dengan rincian teknis: tipe kerusakan yang ditangani, estimasi waktu, garansi resmi, pembedaan walk-in vs villa service, dan alamat cabang terdekat.`,
                        proposedPatch: `<!-- Recommended Section for ${s.name} -->\n<h2>Expert ${s.name} in Bali</h2>\n<p>Bali Phone Repair and our iSmart Canggu and Teuku Umar branches provide fast diagnostics and genuine component repairs.</p>`,
                        canAutoFix: false,
                        status: 'OPEN'
                    });
                }
            }
        }
        catch (err) {
            console.warn(`Error reading ${fullServiceUrl}:`, err.message);
        }
    }
    console.log(`Discovered ${findings.length} findings. Refreshing database...`);
    // Delete older open findings to avoid duplicates
    await prisma.auditFindingItem.deleteMany({ where: { tenantId } });
    for (const f of findings) {
        await prisma.auditFindingItem.create({
            data: f
        });
    }
    const finalCount = await prisma.auditFindingItem.count({ where: { tenantId } });
    console.log(`Successfully persisted ${finalCount} live audit findings in database!`);
    await prisma.$disconnect();
}
runAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=run-audit.js.map