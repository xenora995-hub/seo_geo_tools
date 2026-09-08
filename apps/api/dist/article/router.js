"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const prisma_1 = require("../lib/prisma");
const service_1 = require("../generator/service");
exports.articleRouter = (0, express_1.Router)();
exports.articleRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
// GET /api/articles
exports.articleRouter.get('/', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status;
    const where = { ...(tenantId ? { tenantId } : {}), ...(status ? { status } : {}) };
    const [articles, total] = await Promise.all([
        prisma_1.prisma.article.findMany({
            where, orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit, take: limit,
        }),
        prisma_1.prisma.article.count({ where })
    ]);
    res.json({ success: true, data: articles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
// GET /api/articles/:id
exports.articleRouter.get('/:id', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const article = await prisma_1.prisma.article.findFirst({
        where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) }
    });
    if (!article)
        return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });
    res.json({ success: true, data: article });
});
// POST /api/articles/:id/publish (Retry / Manual publish draft)
exports.articleRouter.post('/:id/publish', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        const article = await prisma_1.prisma.article.findFirst({
            where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) }
        });
        if (!article)
            return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });
        const published = await (0, service_1.publishExistingArticle)(article.id);
        res.json({ success: true, data: published, message: 'Artikel berhasil dipublikasikan ke website!' });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
// DELETE /api/articles/:id
exports.articleRouter.delete('/:id', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    await prisma_1.prisma.article.deleteMany({ where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) } });
    res.json({ success: true, message: 'Artikel dihapus' });
});
//# sourceMappingURL=router.js.map