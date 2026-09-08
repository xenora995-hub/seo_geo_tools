"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const middleware_1 = require("./middleware");
exports.authRouter = (0, express_1.Router)();
// POST /api/auth/login
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: { tenant: { select: { id: true, name: true, domain: true, isActive: true } } }
        });
        if (!user || !await bcryptjs_1.default.compare(password, user.password)) {
            return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Email atau password salah' });
        }
        if (user.tenantId && !user.tenant?.isActive) {
            return res.status(403).json({ success: false, error: 'TENANT_INACTIVE', message: 'Website sedang tidak aktif' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    tenant: user.tenant,
                }
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Login gagal' });
    }
});
// GET /api/auth/me
exports.authRouter.get('/me', middleware_1.requireAuth, async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
        include: { tenant: { select: { id: true, name: true, domain: true } } },
        omit: { password: true }
    });
    res.json({ success: true, data: user });
});
//# sourceMappingURL=router.js.map