"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const middleware_1 = require("../auth/middleware");
const prisma_1 = require("../lib/prisma");
exports.userRouter = (0, express_1.Router)();
exports.userRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
exports.userRouter.get('/', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const users = await prisma_1.prisma.user.findMany({
        where: tenantId ? { tenantId } : {},
        omit: { password: true },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
});
exports.userRouter.post('/', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const { email, password, name, role } = req.body;
    const user = await prisma_1.prisma.user.create({
        data: { email, password: await bcryptjs_1.default.hash(password, 12), name, role: role || 'ADMIN', tenantId },
        omit: { password: true }
    });
    res.status(201).json({ success: true, data: user });
});
exports.userRouter.delete('/:id', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    await prisma_1.prisma.user.deleteMany({ where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) } });
    res.json({ success: true, message: 'User dihapus' });
});
//# sourceMappingURL=router.js.map