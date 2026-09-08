"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keywordRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
exports.keywordRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Dummy DataForSEO integration
exports.keywordRouter.get('/research', async (req, res) => {
    try {
        const { q, location } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Keyword (q) is required' });
        }
        const term = String(q).toLowerCase();
        // Cek apakah data sudah ada di database
        let keyword = await prisma.keyword.findUnique({
            where: { term }
        });
        if (!keyword) {
            // Simulasi panggilan ke API pihak ketiga (misal: DataForSEO)
            // Di produksi, kita akan memanggil fetch() ke endpoint penyedia
            keyword = await prisma.keyword.create({
                data: {
                    term,
                    volume: Math.floor(Math.random() * 10000) + 100,
                    difficulty: Math.floor(Math.random() * 100),
                    cpc: Number((Math.random() * 5).toFixed(2)),
                    searchIntent: ['Informational', 'Transactional', 'Commercial', 'Navigational'][Math.floor(Math.random() * 4)],
                    location: String(location || 'Global'),
                }
            });
        }
        res.json({
            success: true,
            data: keyword
        });
    }
    catch (error) {
        console.error('[Keyword Research Error]', error);
        res.status(500).json({ success: false, error: 'Failed to research keyword' });
    }
});
// Mengambil riwayat pencarian
exports.keywordRouter.get('/history', async (req, res) => {
    try {
        const keywords = await prisma.keyword.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({ success: true, data: keywords });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});
//# sourceMappingURL=keywords.js.map