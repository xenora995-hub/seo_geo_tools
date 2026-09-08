"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localListingRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
exports.localListingRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Menyimpan profil bisnis lokal
exports.localListingRouter.post('/profile', async (req, res) => {
    try {
        const { tenantId, businessName, address, phone, website, category } = req.body;
        if (!tenantId || !businessName) {
            return res.status(400).json({ error: 'tenantId and businessName required' });
        }
        const profile = await prisma.localListingProfile.create({
            data: {
                tenantId,
                businessName,
                address: address || '',
                phone: phone || '',
                website: website || '',
                category: category || '',
                syncStatus: 'PENDING'
            }
        });
        res.json({ success: true, data: profile });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to save profile' });
    }
});
// Mengambil profil terbaru
exports.localListingRouter.get('/profile', async (req, res) => {
    try {
        const { tenantId } = req.query;
        const profile = await prisma.localListingProfile.findFirst({
            where: tenantId ? { tenantId: String(tenantId) } : undefined,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: profile });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});
// Memicu sinkronisasi
exports.localListingRouter.post('/sync', async (req, res) => {
    try {
        const { profileId } = req.body;
        if (!profileId)
            return res.status(400).json({ error: 'profileId required' });
        await prisma.localListingProfile.update({
            where: { id: profileId },
            data: { syncStatus: 'SYNCING' }
        });
        // Simulasi delay sinkronisasi (Di real world ini via worker/queue)
        setTimeout(async () => {
            await prisma.localListingProfile.update({
                where: { id: profileId },
                data: { syncStatus: 'COMPLETED' }
            });
        }, 5000);
        res.json({ success: true, message: 'Sync process started' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to start sync' });
    }
});
//# sourceMappingURL=local-listing.js.map