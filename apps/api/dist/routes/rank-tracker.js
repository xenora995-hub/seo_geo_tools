"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankTrackerRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
exports.rankTrackerRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Menambahkan project tracking baru
exports.rankTrackerRouter.post('/projects', async (req, res) => {
    try {
        const { domain, location, tenantId } = req.body;
        if (!domain || !location || !tenantId) {
            return res.status(400).json({ error: 'Domain, location, and tenantId are required' });
        }
        const project = await prisma.rankTrackingProject.create({
            data: {
                domain,
                location,
                tenantId
            }
        });
        res.json({ success: true, data: project });
    }
    catch (error) {
        console.error('[Rank Tracker Error]', error);
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
});
// Mengambil daftar project
exports.rankTrackerRouter.get('/projects', async (req, res) => {
    try {
        const { tenantId } = req.query;
        const projects = await prisma.rankTrackingProject.findMany({
            where: tenantId ? { tenantId: String(tenantId) } : undefined,
            include: {
                histories: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
        res.json({ success: true, data: projects });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});
//# sourceMappingURL=rank-tracker.js.map