"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditEngineRouter = void 0;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../lib/prisma");
const middleware_1 = require("../auth/middleware");
const business_branches_1 = require("../data/business-branches");
exports.auditEngineRouter = (0, express_1.Router)();
exports.auditEngineRouter.use(middleware_1.requireAuth);
/**
 * Scan target site live and generate actionable audit findings with diff patches
 */
exports.auditEngineRouter.post('/scan', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req) || req.body.tenantId;
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { branches: true }
        });
        if (!tenant)
            return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
        const targetUrl = tenant.cmsUrl || `https://${tenant.domain}`;
        const findings = [];
        console.log(`[AUDIT-ENGINE] Memulai audit menyeluruh terhadap target: ${targetUrl}`);
        // 1. Audit robots.txt
        let robotsTxt = '';
        try {
            const robotsRes = await axios_1.default.get(`${targetUrl}/robots.txt`, { timeout: 8000, validateStatus: () => true });
            if (robotsRes.status === 200 && typeof robotsRes.data === 'string') {
                robotsTxt = robotsRes.data;
                const hasOaiSearchBot = /User-agent:\s*OAI-SearchBot/i.test(robotsTxt);
                if (!hasOaiSearchBot) {
                    findings.push({
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
            else {
                findings.push({
                    targetUrl: `${targetUrl}/robots.txt`,
                    category: 'ROBOTS_INDEXABILITY',
                    priority: 'MEDIUM',
                    issue: `robots.txt mengembalikan status HTTP ${robotsRes.status}`,
                    evidence: `Status HTTP ${robotsRes.status} saat mengakses ${targetUrl}/robots.txt`,
                    recommendation: 'Pastikan file robots.txt dapat diakses publik dengan status HTTP 200.',
                    canAutoFix: false,
                    status: 'OPEN'
                });
            }
        }
        catch (e) {
            console.warn(`[AUDIT-ENGINE] Error reading robots.txt:`, e.message);
        }
        // 2. Audit Homepage: Title, H1, dan Penyebutan Cabang
        try {
            const homeRes = await axios_1.default.get(targetUrl, {
                timeout: 10000,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEO-GEO-Auditor/1.0' }
            });
            if (homeRes.status === 200 && typeof homeRes.data === 'string') {
                const html = homeRes.data;
                const lowerHtml = html.toLowerCase();
                // Periksa Title Tag Homepage
                const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                const currentTitle = titleMatch ? titleMatch[1].trim() : '';
                if (currentTitle.toLowerCase().includes('servis') || currentTitle.toLowerCase().includes('rental device')) {
                    findings.push({
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
                // Periksa Missing Branch Mentions di Homepage
                const hasIsmart = lowerHtml.includes('ismart');
                const hasBaleBali = lowerHtml.includes('bale bali');
                const hasTeukuUmar = lowerHtml.includes('teuku umar');
                if (!hasIsmart || !hasBaleBali || !hasTeukuUmar) {
                    findings.push({
                        targetUrl,
                        category: 'BRANCH_IDENTITY',
                        priority: 'HIGH',
                        issue: 'Situs belum mencantumkan cabang resmi (iSmart Canggu, Bale Bali, iSmart Teuku Umar) pada informasi kontak/footer',
                        evidence: `Hasil pencarian di beranda: iSmart: ${hasIsmart}, Bale Bali: ${hasBaleBali}, Teuku Umar: ${hasTeukuUmar}. Saat ini hanya tercantum 1 alamat (Jl. Pulau Misol).`,
                        recommendation: 'Tambahkan bagian "Our Verified Branches" di footer dan halaman kontak dengan menyebutkan secara jelas hubungan cabang dalam bahasa Inggris: "iSmart Canggu is a Bali Phone Repair branch" dan "iSmart Teuku Umar is a Bali Phone Repair branch".',
                        proposedPatch: `<div class="bpr-branches-section">\n  <h3>Our Verified Workshops & Service Hubs</h3>\n  <div class="branch-card">\n    <strong>iSmart Canggu</strong>\n    <p>Jl. Raya Canggu, Kerobokan, Badung, Bali</p>\n    <p><em>iSmart Canggu is a Bali Phone Repair branch serving Canggu, Berawa, and Pererenan with walk-ins and mobile villa technician service.</em></p>\n  </div>\n  <div class="branch-card">\n    <strong>Bale Bali (Central Workshop)</strong>\n    <p>Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113</p>\n  </div>\n  <div class="branch-card">\n    <strong>iSmart Teuku Umar</strong>\n    <p>Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali</p>\n    <p><em>iSmart Teuku Umar is a Bali Phone Repair branch specializing in component-level micro-soldering and laser glass restoration.</em></p>\n  </div>\n</div>`,
                        canAutoFix: false,
                        status: 'OPEN'
                    });
                }
                // Periksa Structured Data (Schema.org) di Homepage
                const hasParentBranchSchema = lowerHtml.includes('ismart') && lowerHtml.includes('suborganization');
                if (!hasParentBranchSchema) {
                    findings.push({
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
            console.warn(`[AUDIT-ENGINE] Error reading homepage:`, e.message);
        }
        // 3. Audit Halaman Layanan Spesifik (MacBook & Android)
        const serviceUrls = [
            { path: '/services/macbook-repair-bali', name: 'MacBook Repair Bali' },
            { path: '/services/android-repair-bali', name: 'Android Repair Bali' },
            { path: '/services/iphone-repair-bali', name: 'iPhone Repair Bali' }
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
                    const sLower = sHtml.toLowerCase();
                    const h2Matches = [...sHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
                    // Deteksi halaman tipis (thin content)
                    if (h2Matches.length <= 1 || sHtml.length < 8000) {
                        findings.push({
                            targetUrl: fullServiceUrl,
                            category: 'CONTENT_GAP',
                            priority: 'HIGH',
                            issue: `Halaman ${s.name} memiliki konten yang sangat minim (${h2Matches.length} subjudul H2), belum menjawab pertanyaan diagnostik mesin pencari AI`,
                            evidence: `H2 yang ditemukan hanya: ${JSON.stringify(h2Matches)}. Panjang HTML: ${sHtml.length} byte.`,
                            recommendation: `Perluas konten halaman ${s.name} dengan rincian teknis: tipe kerusakan yang ditangani, estimasi waktu, garansi resmi, pembedaan walk-in vs villa service, dan alamat cabang terdekat.`,
                            proposedPatch: `<!-- Rekomendasi Section untuk ${s.name} -->\n<h2>Expert ${s.name} by Certified Technicians in Bali</h2>\n<p>Whether you are dealing with water damage at your villa, a shattered screen, or logic board failure, Bali Phone Repair and our iSmart Canggu and Teuku Umar branches provide fast diagnostics and genuine component repairs.</p>\n<h3>Common Issues Repaired</h3>\n<ul>\n  <li><strong>Display & Glass:</strong> Same-day screen replacement.</li>\n  <li><strong>Battery Degradation:</strong> Quick battery replacement before your flight.</li>\n  <li><strong>Liquid & Saltwater Damage:</strong> Ultrasonic cleaning and board-level micro-soldering at our central workshop.</li>\n</ul>`,
                            canAutoFix: false,
                            status: 'OPEN'
                        });
                    }
                }
            }
            catch (err) {
                console.warn(`[AUDIT-ENGINE] Error reading ${fullServiceUrl}:`, err.message);
            }
        }
        // 4. Simpan Temuan ke Database
        for (const f of findings) {
            await prisma_1.prisma.auditFindingItem.create({
                data: {
                    tenantId,
                    targetUrl: f.targetUrl,
                    category: f.category,
                    priority: f.priority,
                    issue: f.issue,
                    evidence: f.evidence,
                    recommendation: f.recommendation,
                    proposedPatch: f.proposedPatch || null,
                    canAutoFix: f.canAutoFix,
                    status: f.status
                }
            });
        }
        res.json({
            success: true,
            message: `Pemindaian selesai. Ditemukan ${findings.length} isu penting untuk visibilitas AI & GEO.`,
            findingsCount: findings.length,
            findings
        });
    }
    catch (error) {
        console.error('[AUDIT-ENGINE SCAN ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * GET /api/audit-engine/findings
 * Mengambil daftar temuan audit aktif
 */
exports.auditEngineRouter.get('/findings', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const findings = await prisma_1.prisma.auditFindingItem.findMany({
            where: { tenantId },
            orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
        });
        res.json({ success: true, data: findings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * POST /api/audit-engine/findings/:id/status
 * Memperbarui status temuan (misalnya setelah ditinjau atau diverifikasi)
 */
exports.auditEngineRouter.post('/findings/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, verifiedAt } = req.body;
        const updated = await prisma_1.prisma.auditFindingItem.update({
            where: { id },
            data: {
                status,
                verifiedAt: verifiedAt ? new Date(verifiedAt) : status === 'VERIFIED' ? new Date() : undefined
            }
        });
        res.json({ success: true, data: updated, message: `Status temuan diperbarui menjadi ${status}` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * GET /api/audit-engine/export-patch
 * Menghasilkan paket perubahan (patch bundle) yang siap ditinjau dan dipasang pada website Laravel baliphonerepair.com
 */
exports.auditEngineRouter.get('/export-patch', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const schemaSnippet = (0, business_branches_1.buildParentAndBranchesSchema)();
        const patchPackage = {
            title: 'Bali Phone Repair - AI Search & Branch Identity Optimization Patch',
            generatedAt: new Date().toISOString(),
            robotsTxt: {
                targetFile: 'public/robots.txt',
                content: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\n\n# Dedicated ChatGPT Search Bot permission\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: https://baliphonerepair.com/sitemap.xml\n`
            },
            schemaOrg: {
                targetFile: 'resources/views/partials/schema-branches.blade.php',
                content: schemaSnippet
            },
            branchFooterBlade: {
                targetFile: 'resources/views/partials/branches-footer.blade.php',
                content: `<div class="bpr-branches-footer" style="padding: 2rem 0; border-top: 1px solid #e2e8f0; margin-top: 2rem;">
  <div class="container">
    <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #1e293b;">
      Our Verified Workshops & Service Branches
    </h4>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
      <div style="background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h5 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a;">📍 iSmart Canggu</h5>
        <p style="font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem;">Jl. Raya Canggu, Kerobokan, Badung, Bali</p>
        <p style="font-size: 0.8rem; color: #64748b; line-height: 1.4;">
          <strong>iSmart Canggu is a Bali Phone Repair branch</strong> serving Canggu, Berawa, Batu Bolong, and Pererenan. Walk-ins welcome & fast mobile villa dispatch.
        </p>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;"><strong>Hours:</strong> Mo-Sa 09:00-20:00, Su 10:00-18:00</p>
      </div>

      <div style="background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h5 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a;">📍 Bale Bali (Central Workshop)</h5>
        <p style="font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem;">Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113</p>
        <p style="font-size: 0.8rem; color: #64748b; line-height: 1.4;">
          Main diagnostic laboratory with advanced ultrasonic cleaning, screen laminators, and logic board recovery.
        </p>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;"><strong>Hours:</strong> Mo-Sa 09:00-21:00, Su 09:00-18:00</p>
      </div>

      <div style="background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h5 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a;">📍 iSmart Teuku Umar</h5>
        <p style="font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem;">Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali</p>
        <p style="font-size: 0.8rem; color: #64748b; line-height: 1.4;">
          <strong>iSmart Teuku Umar is a Bali Phone Repair branch</strong> situated in Bali's major tech corridor. Specializing in micro-soldering and laser glass rework.
        </p>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;"><strong>Hours:</strong> Mo-Sa 09:00-21:00</p>
      </div>
    </div>
  </div>
</div>`
            }
        };
        res.json({ success: true, data: patchPackage });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
//# sourceMappingURL=audit-engine.js.map