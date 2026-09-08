"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const middleware_1 = require("../auth/middleware");
const prisma_1 = require("../lib/prisma");
exports.tenantRouter = (0, express_1.Router)();
exports.tenantRouter.use(middleware_1.requireAuth, middleware_1.requireSuperuser);
// GET /api/tenants
exports.tenantRouter.get('/', async (_, res) => {
    const tenants = await prisma_1.prisma.tenant.findMany({
        include: { setting: true, _count: { select: { articles: true, users: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: tenants });
});
// GET /api/tenants/:id
exports.tenantRouter.get('/:id', async (req, res) => {
    const tenant = await prisma_1.prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: { setting: true, _count: { select: { articles: true, users: true } } }
    });
    if (!tenant)
        return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    res.json({ success: true, data: tenant });
});
// POST /api/tenants
exports.tenantRouter.post('/', async (req, res) => {
    try {
        const { name, domain, cmsType, cmsUrl, cmsApiKey, language, adminEmail, adminPassword, adminName } = req.body;
        const tenant = await prisma_1.prisma.tenant.create({
            data: {
                name, domain, cmsType, cmsUrl, cmsApiKey,
                language: language || 'id',
                setting: {
                    create: {
                        geminiApiKey: '',
                        targetKeywords: [],
                        competitors: [],
                    }
                },
                users: adminEmail ? {
                    create: {
                        email: adminEmail,
                        password: await bcryptjs_1.default.hash(adminPassword, 12),
                        name: adminName || adminEmail,
                        role: 'ADMIN',
                    }
                } : undefined,
            },
            include: { users: { omit: { password: true } } }
        });
        res.status(201).json({ success: true, data: tenant, message: 'Website berhasil ditambahkan' });
    }
    catch (err) {
        if (err.code === 'P2002')
            return res.status(409).json({ success: false, message: 'Domain sudah terdaftar' });
        res.status(500).json({ success: false, message: err.message });
    }
});
// PATCH /api/tenants/:id
exports.tenantRouter.patch('/:id', async (req, res) => {
    const tenant = await prisma_1.prisma.tenant.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: tenant });
});
// DELETE /api/tenants/:id
exports.tenantRouter.delete('/:id', async (req, res) => {
    await prisma_1.prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Website dihapus' });
});
//# sourceMappingURL=router.js.map